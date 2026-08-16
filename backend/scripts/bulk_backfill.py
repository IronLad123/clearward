"""
bulk_backfill.py — Clearward Dataset Backfill Pipeline

Upgrades all symbols in price_histories to 2 years (500 days) of adjusted OHLCV.
Prioritises DEFAULT_TICKERS symbols first, then upgrades remaining DB symbols.

Usage:
    cd backend && python3 scripts/bulk_backfill.py [--dry-run] [--symbol RELIANCE.NS]

Features:
    - Rate-limited (2s between fetches) to avoid yfinance 429 errors
    - Idempotent: skips symbols already at 250+ rows
    - Upserts (INSERT OR REPLACE): won't duplicate existing rows
    - Progress bar with ETA
    - Error log written to data/backfill_errors.txt
    - Post-run validation report with ML coverage %
"""
import sys
import os
import time
import sqlite3
import math
import argparse
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import yfinance as yf
import pandas as pd

DB_PATH      = os.path.join(os.path.dirname(__file__), '..', 'data', 'stock_analyst.db')
ERROR_LOG    = os.path.join(os.path.dirname(__file__), '..', 'data', 'backfill_errors.txt')
MIN_ROWS     = 250    # minimum rows for Walk-Forward ML
FETCH_PERIOD = '2y'   # yfinance period: 2 calendar years
RATE_LIMIT   = 2.0    # seconds between API calls


# ---------------------------------------------------------------------------
# Database helpers
# ---------------------------------------------------------------------------

def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.execute('PRAGMA journal_mode=WAL')
    conn.execute('PRAGMA synchronous=NORMAL')
    return conn


def symbols_needing_backfill(conn):
    """All symbols in DB with fewer than MIN_ROWS rows, sorted by count ASC."""
    cur = conn.cursor()
    cur.execute(
        'SELECT symbol, COUNT(*) FROM price_histories '
        'GROUP BY symbol HAVING COUNT(*) < ? ORDER BY COUNT(*) ASC',
        (MIN_ROWS,)
    )
    return cur.fetchall()


def missing_config_symbols(conn):
    """DEFAULT_TICKERS symbols not in the database at all."""
    try:
        from app.config import DEFAULT_TICKERS
        cur = conn.cursor()
        cur.execute('SELECT DISTINCT symbol FROM price_histories')
        db_set = {r[0] for r in cur.fetchall()}
        return [t for t in DEFAULT_TICKERS if t['symbol'] not in db_set]
    except Exception as exc:
        print(f'[WARN] DEFAULT_TICKERS load error: {exc}')
        return []


def row_count(conn, symbol: str) -> int:
    cur = conn.cursor()
    cur.execute('SELECT COUNT(*) FROM price_histories WHERE symbol=?', (symbol,))
    return cur.fetchone()[0]


def ensure_stock_metadata(conn, symbol: str):
    cur = conn.cursor()
    cur.execute('SELECT 1 FROM stocks WHERE symbol=?', (symbol,))
    if not cur.fetchone():
        exchange = 'NSE' if '.NS' in symbol else 'BSE' if '.BO' in symbol else 'OTHER'
        name = symbol.replace('.NS', '').replace('.BO', '')
        now = datetime.utcnow().isoformat()
        cur.execute(
            'INSERT OR IGNORE INTO stocks '
            '(symbol, name, exchange, sector, last_fetched_at, created_at) '
            'VALUES (?, ?, ?, ?, ?, ?)',
            (symbol, name, exchange, 'General', now, now)
        )
        conn.commit()


def upsert_ohlcv(conn, symbol: str, df: pd.DataFrame) -> int:
    """Upsert cleaned OHLCV rows. Returns row count inserted/replaced."""
    if df.empty:
        return 0

    if isinstance(df.columns, pd.MultiIndex):
        df.columns = df.columns.get_level_values(0)
    df = df.reset_index()

    records = []
    for _, row in df.iterrows():
        dt = row.get('Date')
        if dt is None:
            continue
        if hasattr(dt, 'to_pydatetime'):
            dt = dt.to_pydatetime()
        if hasattr(dt, 'tzinfo') and dt.tzinfo is not None:
            dt = dt.astimezone(timezone.utc).replace(tzinfo=None)

        c = float(row['Close']) if pd.notna(row.get('Close')) else None
        if c is None or math.isnan(c) or c <= 0:
            continue

        o = float(row['Open'])   if pd.notna(row.get('Open'))   else c
        h = float(row['High'])   if pd.notna(row.get('High'))   else c
        lo = float(row['Low'])   if pd.notna(row.get('Low'))    else c
        v  = float(row['Volume']) if pd.notna(row.get('Volume')) else 0.0

        records.append((symbol, str(dt), o or c, h or c, lo or c, c, c, v))

    if not records:
        return 0

    cur = conn.cursor()
    cur.executemany(
        'INSERT OR REPLACE INTO price_histories '
        '(symbol, date, open, high, low, close, adj_close, volume) '
        'VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        records
    )
    conn.commit()
    return len(records)


# ---------------------------------------------------------------------------
# Progress bar
# ---------------------------------------------------------------------------

def pbar(i, total, label='', bar=40):
    pct = i / max(total, 1)
    filled = int(bar * pct)
    b = '\u2588' * filled + '\u2591' * (bar - filled)
    print(f'\r  |{b}| {i:>4}/{total} {label:<28}', end='', flush=True)


# ---------------------------------------------------------------------------
# Feature engineering quality check
# ---------------------------------------------------------------------------

def validate_feature_matrix(conn, symbol: str) -> dict:
    """
    After backfill, run the feature engineering pipeline on the symbol
    and report whether a full Walk-Forward matrix can be generated.
    """
    try:
        import pandas as pd
        cur = conn.cursor()
        cur.execute(
            'SELECT date, open, high, low, close, volume '
            'FROM price_histories WHERE symbol=? ORDER BY date ASC',
            (symbol,)
        )
        rows = cur.fetchall()
        if not rows:
            return {'ok': False, 'reason': 'no rows'}

        df = pd.DataFrame(rows, columns=['date', 'open', 'high', 'low', 'close', 'volume'])
        df['adj_close'] = df['close']

        from app.ml.feature_engineering import create_feature_matrix
        mat = create_feature_matrix(df)
        return {'ok': not mat.empty, 'rows': len(mat), 'raw': len(df)}
    except Exception as exc:
        return {'ok': False, 'reason': str(exc)}


# ---------------------------------------------------------------------------
# Main backfill loop
# ---------------------------------------------------------------------------

def run(dry_run: bool = False, single: str = None):
    print()
    print('=' * 65)
    print(' CLEARWARD BULK DATASET BACKFILL PIPELINE')
    print(f' Target: {MIN_ROWS}+ rows/symbol  |  Period: {FETCH_PERIOD}  |  Rate: {RATE_LIMIT}s')
    if dry_run:
        print(' MODE: DRY RUN (no writes)')
    print('=' * 65)

    conn = get_conn()

    if single:
        work_list = [(single, row_count(conn, single))]
    else:
        # Phase 1: Missing DEFAULT_TICKERS
        missing = missing_config_symbols(conn)
        missing_pairs = [(t['symbol'], 0) for t in missing]

        # Phase 2: Under-sampled symbols already in DB
        under = symbols_needing_backfill(conn)

        # Merge: missing first, then under-sampled, dedup
        seen = set()
        work_list = []
        for sym, cnt in missing_pairs + under:
            if sym not in seen:
                seen.add(sym)
                work_list.append((sym, cnt))

    total = len(work_list)
    if total == 0:
        print('\nAll symbols already have sufficient data.\n')
        conn.close()
        return

    print(f'\n  Symbols to process: {total}')
    print(f'  Estimated time    : ~{total * RATE_LIMIT / 60:.0f} min (at {RATE_LIMIT}s/symbol)\n')

    successes, failures, skipped = [], [], []
    errors = []

    for i, (symbol, current_cnt) in enumerate(work_list):
        pbar(i, total, label=symbol)

        now_cnt = row_count(conn, symbol)
        if now_cnt >= MIN_ROWS:
            skipped.append(symbol)
            time.sleep(0.05)
            continue

        if dry_run:
            print(f'\n  [DRY] Would fetch {symbol} (has {now_cnt} rows)')
            continue

        df = pd.DataFrame()
        try:
            df = yf.download(
                symbol,
                period=FETCH_PERIOD,
                interval='1d',
                auto_adjust=True,
                progress=False,
                timeout=15,
            )
        except Exception as exc:
            errors.append(f'{symbol}: download error — {exc}')
            failures.append(symbol)
            time.sleep(RATE_LIMIT)
            continue

        if df.empty:
            errors.append(f'{symbol}: yfinance returned empty DataFrame')
            failures.append(symbol)
            time.sleep(RATE_LIMIT)
            continue

        ensure_stock_metadata(conn, symbol)
        inserted = upsert_ohlcv(conn, symbol, df)
        final_cnt = row_count(conn, symbol)

        if final_cnt >= MIN_ROWS:
            successes.append((symbol, final_cnt, inserted))
        else:
            failures.append(symbol)
            errors.append(f'{symbol}: {final_cnt} rows after upsert (needed {MIN_ROWS})')

        time.sleep(RATE_LIMIT)

    pbar(total, total, label='DONE')
    print()

    # Write error log
    if errors:
        try:
            with open(ERROR_LOG, 'w') as f:
                f.write('\n'.join(errors))
        except Exception:
            pass

    # Post-backfill report
    print()
    print('=' * 65)
    print(' POST-BACKFILL VALIDATION REPORT')
    print('=' * 65)
    print(f'  Upgraded successfully : {len(successes)}')
    print(f'  Skipped (already OK)  : {len(skipped)}')
    print(f'  Failed                : {len(failures)}')
    if failures:
        print(f'  Error log             : {ERROR_LOG}')

    # DB summary
    cur = conn.cursor()
    cur.execute('SELECT COUNT(*) FROM price_histories')
    total_rows = cur.fetchone()[0]
    cur.execute('SELECT COUNT(DISTINCT symbol) FROM price_histories')
    total_syms = cur.fetchone()[0]
    cur.execute(
        'SELECT COUNT(DISTINCT symbol) FROM price_histories '
        'GROUP BY symbol HAVING COUNT(*) >= ?', (MIN_ROWS,)
    )
    ml_ready = len(cur.fetchall())

    print()
    print(f'  Total rows in DB        : {total_rows:,}')
    print(f'  Total distinct symbols  : {total_syms}')
    print(f'  ML-ready (250+ rows)    : {ml_ready}  ({ml_ready/max(total_syms,1)*100:.1f}%)')
    print()

    # Quick feature matrix check for 3 key symbols
    print('  Feature matrix spot-check (post-backfill):')
    spot_check = ['RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS']
    for sym in spot_check:
        result = validate_feature_matrix(conn, sym)
        status = 'OK' if result.get('ok') else 'FAIL'
        detail = f"feature_rows={result.get('rows','?')}  raw={result.get('raw','?')}" if result.get('ok') else result.get('reason', 'unknown')
        print(f'    [{status}] {sym:<25} {detail}')

    conn.close()
    print()
    print('Backfill complete. Re-run ML training to benefit from expanded dataset.')
    print()


# ---------------------------------------------------------------------------
# Entrypoint
# ---------------------------------------------------------------------------

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Clearward Bulk Dataset Backfill')
    parser.add_argument('--dry-run', action='store_true', help='Show what would be fetched without writing')
    parser.add_argument('--symbol', type=str, default=None, help='Backfill a single symbol only')
    args = parser.parse_args()
    run(dry_run=args.dry_run, single=args.symbol)
