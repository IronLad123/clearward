import yfinance as yf
import pandas as pd
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from sqlalchemy.dialects.sqlite import insert as sqlite_insert
from app.database.models import Stock, PriceHistory
from app.config import DEFAULT_TICKERS

def seed_default_stocks(db: Session):
    """Ensure default stock metadata and initial price history are present in the database."""
    for item in DEFAULT_TICKERS:
        existing = db.query(Stock).filter(Stock.symbol == item["symbol"]).first()
        if not existing:
            stock = Stock(
                symbol=item["symbol"],
                name=item["name"],
                exchange=item["exchange"],
                sector=item["sector"]
            )
            db.add(stock)
            db.commit()

    # Pre-fetch price history for core primary tickers to ensure instantaneous chart loading
    core_tickers = ["RELIANCE.NS", "TCS.NS", "HDFCBANK.NS", "ICICIBANK.NS", "INFY.NS"]
    for sym in core_tickers:
        has_history = db.query(PriceHistory).filter(PriceHistory.symbol == sym).first()
        if not has_history:
            try:
                fetch_and_store_price_history(sym, db, period="2y")
            except Exception as e:
                print(f"Pre-fetch skipped for {sym}: {e}")


def fetch_and_store_price_history(symbol: str, db: Session, period: str = "2y") -> int:
    """
    Fetch price history using yfinance and store/upsert in SQLite.
    Returns count of updated records.
    """
    try:
        ticker = yf.Ticker(symbol)
        # Download OHLCV candles with auto_adjust=True to handle corporate actions (splits, dividends) consistently
        df = yf.download(symbol, period=period, interval="1d", auto_adjust=True, progress=False)

        if df.empty:
            return 0

        # Handle multi-level column indexing from yfinance
        if isinstance(df.columns, pd.MultiIndex):
            df.columns = df.columns.get_level_values(0)

        df = df.reset_index()

        import math

        records_to_insert = []
        for _, row in df.iterrows():
            date_val = row["Date"]
            if hasattr(date_val, "to_pydatetime"):
                date_val = date_val.to_pydatetime()

            if hasattr(date_val, "tzinfo") and date_val.tzinfo is not None:
                date_val = date_val.astimezone(timezone.utc).replace(tzinfo=None)

            c_val = float(row["Close"]) if pd.notna(row["Close"]) else None
            o_val = float(row["Open"]) if pd.notna(row["Open"]) else c_val
            h_val = float(row["High"]) if pd.notna(row["High"]) else c_val
            l_val = float(row["Low"]) if pd.notna(row["Low"]) else c_val
            v_val = float(row["Volume"]) if pd.notna(row["Volume"]) else 0.0

            if c_val is None or math.isnan(c_val):
                continue

            records_to_insert.append({
                "symbol": symbol,
                "date": date_val,
                "open": o_val or c_val,
                "high": h_val or c_val,
                "low": l_val or c_val,
                "close": c_val,
                "adj_close": c_val,
                "volume": v_val
            })

        for record in records_to_insert:
            stmt = sqlite_insert(PriceHistory).values(**record)
            stmt = stmt.on_conflict_do_update(
                index_elements=['symbol', 'date'],
                set_={
                    'open': record['open'],
                    'high': record['high'],
                    'low': record['low'],
                    'close': record['close'],
                    'adj_close': record['adj_close'],
                    'volume': record['volume']
                }
            )
            db.execute(stmt)

        # Ensure Stock entry exists in database
        stock = db.query(Stock).filter(Stock.symbol == symbol).first()
        if not stock:
            exchange_name = "NSE" if ".NS" in symbol else "BSE" if ".BO" in symbol else "OTHER"
            clean_name = symbol.replace(".NS", "").replace(".BO", "")
            stock = Stock(
                symbol=symbol,
                name=clean_name,
                exchange=exchange_name,
                sector="General",
                last_fetched_at=datetime.utcnow()
            )
            db.add(stock)
        else:
            stock.last_fetched_at = datetime.utcnow()

        db.commit()
        return len(records_to_insert)
    except Exception as e:
        db.rollback()
        print(f"Error fetching price history for {symbol}: {e}")
        return 0


def get_price_history_dataframe(symbol: str, db: Session, start_date: datetime = None) -> pd.DataFrame:
    """
    Query cached price history from SQLite and return as a pandas DataFrame sorted by date.
    Auto-fetches from yfinance if empty or if data is stale.
    """
    query = db.query(PriceHistory).filter(PriceHistory.symbol == symbol)
    if start_date:
        query = query.filter(PriceHistory.date >= start_date)

    records = query.order_by(PriceHistory.date.asc()).all()

    # If empty or stale (last record > 2 days old), fetch latest 5-day candles from yfinance
    need_fetch = False
    if not records:
        need_fetch = True
    else:
        last_dt = records[-1].date
        if isinstance(last_dt, datetime):
            days_old = (datetime.utcnow() - last_dt).days
            if days_old >= 2:
                need_fetch = True

    if need_fetch:
        try:
            fetch_and_store_price_history(symbol, db, period="90d" if records else "2y")
            query = db.query(PriceHistory).filter(PriceHistory.symbol == symbol)
            if start_date:
                query = query.filter(PriceHistory.date >= start_date)
            records = query.order_by(PriceHistory.date.asc()).all()
        except Exception:
            pass

    if not records:
        return pd.DataFrame()

    data = [{
        "date": r.date,
        "open": r.open,
        "high": r.high,
        "low": r.low,
        "close": r.close,
        "adj_close": r.adj_close or r.close,
        "volume": r.volume
    } for r in records]

    df = pd.DataFrame(data)
    return df
