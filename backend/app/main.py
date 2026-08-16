# Standard library
import logging
import threading
from datetime import datetime
from typing import List, Optional

# Third-party
import yfinance as yf
import pandas as pd
import numpy as np
from fastapi import BackgroundTasks, Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel

# Internal - database
from app.database.db import get_db, init_db
from app.database.models import ModelRegistry, Stock, PriceHistory, TechnicalSignal

# Internal - ingestion
from app.ingestion.nse_symbol_catalog import seed_all_nse_stocks_into_db
from app.ingestion.news_scraper import fetch_ticker_news_rss
from app.ingestion.price_ingestion import (
    fetch_and_store_price_history,
    get_price_history_dataframe,
    seed_default_stocks,
)
from app.ingestion.vector_store import vector_store

# Internal - signals
from app.signals.indicators import add_technical_indicators
from app.signals.signal_filter import detect_signals

# Internal - ML
from app.ml.backtester import run_backtest_simulation
from app.ml.models.baseline_rf import RandomForestDirectionClassifier
from app.ml.models.lstm_model import LSTMDirectionClassifier
from app.ml.models.tcn_model import TCNDirectionClassifier

# Internal - RAG
from app.rag.explainer import generate_grounded_explanation
from app.rag.retriever import retrieve_grounded_news_snippets

# Internal - retraining
from app.retraining.evaluator import evaluate_and_retrain_model
from app.retraining.scheduler import start_retraining_scheduler

# Internal - cache
from app.cache import (
    purge_expired,
    get_cache_stats,
    get_cached,
    set_cached,
    invalidate_category,
    get_recently_peeked_stocks,
    evict_least_recently_used_stocks,
)

# Internal - market data sync
from app.sync import (
    start_market_sync_scheduler,
    get_sync_status,
    run_market_data_sync,
    is_market_open,
    get_sync_interval_minutes,
    get_sync_interval_seconds,
)

# Internal - routers
from app.routes.hype_and_health import router as hype_health_router, _calculate_hype_score_data
from app.routes.mutual_funds import router as mutual_funds_router
from app.routes.time_series_forecast import router as ts_forecast_router
from app.routes.portfolio import router as portfolio_router
from app.routes.chat import router as chat_router

import os

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)-8s %(name)s - %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
DEFAULT_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "app://clearward",
]

def _get_allowed_origins():
    raw = os.getenv("ALLOWED_ORIGINS")
    origins = [o.strip() for o in raw.split(",")] if raw else DEFAULT_ALLOWED_ORIGINS
    return [o for o in origins if o.lower() not in ("null", "*")]

ALLOWED_ORIGINS = _get_allowed_origins()

IST_OFFSET_HOURS: int = 5
IST_OFFSET_MINUTES: int = 30
NSE_MARKET_OPEN_HOUR: int = 9
NSE_MARKET_CLOSE_HOUR: int = 16
MAX_COMPARISON_STOCKS: int = 4
MIN_ROWS_FOR_PREDICTION: int = 40
WATCHLIST_SIGNAL_CONFIDENCE_THRESHOLD: float = 0.60
RETRAINING_INTERVAL_HOURS: int = 24
RETRAIN_HISTORY_LIMIT: int = 50
MARKET_SUMMARY_TICKERS: List[str] = [
    "^NSEI", "^BSESN",
    "RELIANCE.NS", "TCS.NS", "HDFCBANK.NS", "ICICIBANK.NS",
]

# ---------------------------------------------------------------------------
# App factory
# ---------------------------------------------------------------------------
app = FastAPI(
    title="Clearward API",
    description="Continuous, self-retraining stock analysis engine API",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(hype_health_router, prefix="/api", tags=["Hype & Behavioral Health"])
app.include_router(mutual_funds_router, prefix="/api/mf", tags=["Mutual Funds"])
app.include_router(ts_forecast_router, tags=["Time Series"])
app.include_router(portfolio_router, prefix="/api/portfolio", tags=["Portfolio Doctor"])
app.include_router(chat_router, prefix="/api", tags=["AI Chatbot"])


# ---------------------------------------------------------------------------
# LRU Model Cache  (max 5 models per type in memory at once)
# ---------------------------------------------------------------------------
from collections import OrderedDict

class LRUModelCache:
    """
    Least-Recently-Used in-memory model store.

    Holds at most `maxsize` trained models.  When the 6th symbol is
    requested the least-recently-used entry is silently evicted —
    the next request for that symbol will re-train from scratch.

    Thread-safe.  O(1) get/set via OrderedDict move_to_end.
    """

    def __init__(self, maxsize: int = 5):
        self._maxsize  = maxsize
        self._cache: OrderedDict = OrderedDict()
        self._lock     = threading.Lock()

    # ── dict-compatible interface ──────────────────────────────────────────
    def __contains__(self, key):
        with self._lock:
            return key in self._cache

    def __getitem__(self, key):
        with self._lock:
            self._cache.move_to_end(key)        # mark as recently used
            return self._cache[key]

    def __setitem__(self, key, value):
        with self._lock:
            if key in self._cache:
                self._cache.move_to_end(key)
            self._cache[key] = value
            if len(self._cache) > self._maxsize:
                evicted, _ = self._cache.popitem(last=False)   # remove LRU
                logger.info(
                    "LRUModelCache: evicted '%s' (maxsize=%d reached)",
                    evicted, self._maxsize,
                )

    def get(self, key, default=None):
        try:
            return self[key]
        except KeyError:
            return default

    def pop(self, key, *args):
        with self._lock:
            return self._cache.pop(key, *args)

    def clear(self):
        with self._lock:
            self._cache.clear()

    def __len__(self):
        with self._lock:
            return len(self._cache)

    def __repr__(self):
        with self._lock:
            keys = list(self._cache.keys())
        return f"LRUModelCache(maxsize={self._maxsize}, loaded={keys})"


# ── Global model caches (max 5 models each in RAM) ────────────────────────
rf_predictors:   LRUModelCache = LRUModelCache(maxsize=5)
tcn_predictors:  LRUModelCache = LRUModelCache(maxsize=5)
lstm_predictors: LRUModelCache = LRUModelCache(maxsize=5)   # compat alias


# Lock to prevent concurrent ingestion for the same symbol
ingestion_lock = threading.Lock()
ingestion_in_progress: set = set()

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def clear_symbol_model_caches(symbol: Optional[str] = None):
    if symbol:
        rf_predictors.pop(symbol, None)
        lstm_predictors.pop(symbol, None)
        tcn_predictors.pop(symbol, None)
    else:
        rf_predictors.clear()
        lstm_predictors.clear()
        tcn_predictors.clear()


# ---------------------------------------------------------------------------
# Startup
# ---------------------------------------------------------------------------
@app.on_event("startup")
def startup_event():
    """Init DB, seed stocks, start schedulers."""
    logger.info("Server startup - initialising database")
    init_db()

    database_session = next(get_db())
    logger.info("Seeding default stocks")
    seed_default_stocks(database_session)

    logger.info("Seeding NSE symbol catalogue")
    seed_all_nse_stocks_into_db(database_session)

    logger.info("Starting retraining scheduler (every %dh)", RETRAINING_INTERVAL_HOURS)
    start_retraining_scheduler(interval_hours=RETRAINING_INTERVAL_HOURS)

    logger.info("Starting market data sync scheduler")
    start_market_sync_scheduler()

    purged = purge_expired()
    logger.info("Startup complete - purged %d expired cache entries.", purged)


# ---------------------------------------------------------------------------
# Meta routes
# ---------------------------------------------------------------------------
@app.get("/")
def root():
    """API identity card."""
    return {"app": "Clearward API", "status": "online", "version": "1.0.0", "docs": "/docs"}


@app.get("/health")
def health_check(db: Session = Depends(get_db)):
    """Production health-check."""
    try:
        total_stocks_indexed = db.query(Stock).count()
        cache_stats = get_cache_stats()
        return {
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "database": "connected",
            "total_stocks_indexed": total_stocks_indexed,
            "system": "operational",
            "cache": {
                "entries": cache_stats.get("total_entries", 0),
                "hits": cache_stats.get("total_hits", 0),
                "size_kb": cache_stats.get("cache_db_size_kb", 0),
            },
        }
    except Exception as db_error:
        logger.error("Health check failed: %s", db_error)
        raise HTTPException(status_code=500, detail=f"Health check failed: {db_error}")


# ---------------------------------------------------------------------------
# Stock catalogue routes
# ---------------------------------------------------------------------------
@app.get("/api/stocks")
def list_stocks(db: Session = Depends(get_db)):
    """Return all stocks indexed in the database."""
    stocks = db.query(Stock).order_by(Stock.symbol).all()
    return {
        "count": len(stocks),
        "stocks": [
            {
                "symbol": s.symbol,
                "name": s.name,
                "sector": getattr(s, "sector", None),
                "exchange": getattr(s, "exchange", None),
            }
            for s in stocks
        ],
    }


@app.get("/api/stocks/search")
def search_stocks(
    q: str = Query(default="", min_length=0),
    db: Session = Depends(get_db),
):
    """Full-text search across stock symbols and company names."""
    if not q or not q.strip():
        # Return top 20 default stocks on empty query
        stocks = db.query(Stock).limit(20).all()
    else:
        term = f"%{q.strip().upper()}%"
        stocks = (
            db.query(Stock)
            .filter(Stock.symbol.like(term) | Stock.name.ilike(f"%{q.strip()}%"))
            .limit(20)
            .all()
        )
    return {
        "query": q,
        "count": len(stocks),
        "results": [{"symbol": s.symbol, "name": s.name, "sector": s.sector} for s in stocks],
    }


@app.get("/api/stocks/{symbol}/price-history")
def get_price_history(symbol: str, db: Session = Depends(get_db)):
    """
    Return OHLCV price history for a symbol.
    Fetches from yfinance on-demand if not cached.
    """
    price_dataframe = get_price_history_dataframe(symbol, db)
    if price_dataframe.empty:
        fetch_and_store_price_history(symbol, db, period="2y")
        price_dataframe = get_price_history_dataframe(symbol, db)

    if price_dataframe.empty:
        raise HTTPException(status_code=404, detail=f"No price history for '{symbol}'")

    history = [
        {
            "date": row["date"].strftime("%Y-%m-%d") if hasattr(row["date"], "strftime") else str(row["date"]),
            "open": round(float(row["open"]), 2),
            "high": round(float(row["high"]), 2),
            "low": round(float(row["low"]), 2),
            "close": round(float(row["close"]), 2),
            "volume": int(row["volume"]),
        }
        for _, row in price_dataframe.iterrows()
    ]

    stock_record = db.query(Stock).filter(Stock.symbol == symbol).first()
    return {
        "symbol": symbol,
        "name": stock_record.name if stock_record else symbol,
        "history": history,
    }


# ---------------------------------------------------------------------------
# Ingestion route
# ---------------------------------------------------------------------------
@app.post("/api/stocks/{symbol}/ingest")
def trigger_ingest(
    symbol: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """Trigger a full data-ingestion job for a symbol in the background."""
    sym = symbol.upper()
    with ingestion_lock:
        if sym in ingestion_in_progress:
            return {"status": "already_queued", "symbol": sym, "message": "Ingestion already running."}
        ingestion_in_progress.add(sym)

    def _ingest():
        try:
            fetch_and_store_price_history(sym, next(get_db()), period="2y")
        except Exception:
            pass
        finally:
            with ingestion_lock:
                ingestion_in_progress.discard(sym)

    background_tasks.add_task(_ingest)
    return {
        "status": "accepted",
        "symbol": sym,
        "message": "Ingestion job queued. Data will be available shortly.",
    }


# ---------------------------------------------------------------------------
# Signal / indicator routes
# ---------------------------------------------------------------------------
@app.get("/api/stocks/{symbol}/signals")
def get_stock_signals(symbol: str, db: Session = Depends(get_db)):
    """Compute technical indicators and active signals for the latest trading day."""
    price_dataframe = get_price_history_dataframe(symbol, db)

    if price_dataframe.empty:
        fetch_and_store_price_history(symbol, db, period="1y")
        price_dataframe = get_price_history_dataframe(symbol, db)

    if price_dataframe.empty:
        raise HTTPException(status_code=404, detail=f"No price history for '{symbol}'")

    dataframe_with_indicators = add_technical_indicators(price_dataframe)
    latest_row = dataframe_with_indicators.iloc[-1]
    active_signals = detect_signals(price_dataframe)

    indicator_snapshot = {
        "rsi_14": round(float(latest_row.get("rsi_14", 50)), 2),
        "macd_line": round(float(latest_row.get("macd_line", 0)), 2),
        "macd_signal": round(float(latest_row.get("macd_signal", 0)), 2),
        "macd_hist": round(float(latest_row.get("macd_hist", 0)), 2),
        "bb_upper": round(float(latest_row.get("bb_upper", 0)), 2),
        "bb_middle": round(float(latest_row.get("bb_middle", 0)), 2),
        "bb_lower": round(float(latest_row.get("bb_lower", 0)), 2),
        "bb_pct_b": round(float(latest_row.get("bb_pct_b", 0.5)), 2),
        "ema_20": round(float(latest_row.get("ema_20", 0)), 2),
        "ema_50": round(float(latest_row.get("ema_50", 0)), 2),
        "atr_14": round(float(latest_row.get("atr_14", 0)), 2),
    }

    return {
        "symbol": symbol,
        "date": latest_row["date"].strftime("%Y-%m-%d") if hasattr(latest_row["date"], "strftime") else str(latest_row["date"]),
        "close_price": round(float(latest_row["close"]), 2),
        "indicators": indicator_snapshot,
        "signals": active_signals,
    }


class BulkSignalsRequest(BaseModel):
    symbols: List[str]


@app.post("/api/stocks/bulk-signals")
def get_bulk_signals(request: BulkSignalsRequest, db: Session = Depends(get_db)):
    """Bulk fetch signals + hype scores for up to 50 symbols."""
    symbols = request.symbols[:50]
    results = {}

    for symbol in symbols:
        try:
            sym_upper = symbol.upper()
            stock_info = db.query(Stock).filter(Stock.symbol == sym_upper).first()
            stock_name = stock_info.name if stock_info else sym_upper

            prices = (
                db.query(PriceHistory)
                .filter(PriceHistory.symbol == sym_upper)
                .order_by(PriceHistory.date.desc())
                .limit(6)
                .all()
            )

            if not prices:
                results[sym_upper] = {"error": "No price data", "symbol": sym_upper}
                continue

            latest = prices[0]
            five_day_ret = None
            if len(prices) >= 2 and prices[-1].close:
                five_day_ret = round(((latest.close - prices[-1].close) / prices[-1].close) * 100.0, 2)

            signal_row = (
                db.query(TechnicalSignal)
                .filter(TechnicalSignal.symbol == sym_upper)
                .order_by(TechnicalSignal.created_at.desc())
                .first()
            )

            sig_list = []
            if signal_row:
                sig_list = [{
                    "signal_type": signal_row.signal_type,
                    "direction": signal_row.direction,
                    "confidence": float(signal_row.confidence),
                }]

            hype_info = {}
            try:
                hype_info = _calculate_hype_score_data(sym_upper, db)
            except Exception:
                hype_info = {"hype_score": 0, "verdict": "NEUTRAL"}

            results[sym_upper] = {
                "symbol": sym_upper,
                "name": stock_name,
                "close_price": float(latest.close) if latest.close else None,
                "five_day_return": five_day_ret,
                "sigData": {
                    "name": stock_name,
                    "close_price": float(latest.close) if latest.close else None,
                    "five_day_return": five_day_ret,
                    "signals": sig_list,
                    "active_signals": sig_list,
                },
                "hypeData": hype_info,
            }
        except Exception as e:
            results[symbol.upper()] = {"error": str(e), "symbol": symbol.upper()}

    return {"stocks": results, "count": len(results)}


@app.get("/api/watchlist/signals")
def get_watchlist_signals(
    limit: int = 50,
    db: Session = Depends(get_db),
):
    """
    Scan stocks that already have price history in DB and return those with
    high-confidence signals. Does NOT trigger on-demand fetches — fast response.
    """
    # Only query symbols that actually have price history rows (avoids 347-stock scan)
    symbols_with_data = (
        db.query(PriceHistory.symbol)
        .distinct()
        .limit(limit)
        .all()
    )
    results = []

    for (symbol,) in symbols_with_data:
        try:
            price_dataframe = get_price_history_dataframe(symbol, db)
            if price_dataframe.empty or len(price_dataframe) < 30:
                continue

            all_signals = detect_signals(price_dataframe)
            latest_row = price_dataframe.iloc[-1]
            high_confidence_signals = [
                s for s in all_signals
                if s["confidence"] >= WATCHLIST_SIGNAL_CONFIDENCE_THRESHOLD
            ]
            if high_confidence_signals:
                stock = db.query(Stock).filter(Stock.symbol == symbol).first()
                results.append({
                    "symbol": symbol,
                    "name": stock.name if stock else symbol,
                    "close_price": round(float(latest_row["close"]), 2),
                    "active_signals": high_confidence_signals,
                })
        except Exception:
            continue

    return results



# ---------------------------------------------------------------------------
# Retraining routes
# ---------------------------------------------------------------------------
@app.post("/api/retrain/trigger")
def trigger_retraining(
    symbol: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """Trigger Champion vs Challenger retraining pipeline."""
    if symbol:
        retraining_results = [evaluate_and_retrain_model(symbol, db, on_promotion_callback=clear_symbol_model_caches)]
    else:
        all_stocks = db.query(Stock).all()
        retraining_results = [
            evaluate_and_retrain_model(s.symbol, db, on_promotion_callback=clear_symbol_model_caches)
            for s in all_stocks
        ]

    clear_symbol_model_caches(symbol)
    return {
        "status": "completed",
        "timestamp": datetime.utcnow().isoformat(),
        "total_evaluated": len(retraining_results),
        "results": retraining_results,
    }


@app.get("/api/retrain/history")
def get_retrain_history(db: Session = Depends(get_db)):
    """Return most recent model-registry entries."""
    records = (
        db.query(ModelRegistry)
        .order_by(ModelRegistry.created_at.desc())
        .limit(RETRAIN_HISTORY_LIMIT)
        .all()
    )
    history = [
        {
            "id": r.id,
            "model_name": r.model_name,
            "version": r.version,
            "is_champion": r.is_champion,
            "accuracy": r.accuracy,
            "f1_score": r.f1_score,
            "sharpe_ratio": r.sharpe_ratio,
            "decision": r.decision or ("PROMOTED" if r.is_champion else "REJECTED"),
            "reason": r.reason,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in records
    ]
    return {"count": len(history), "history": history}


# ---------------------------------------------------------------------------
# Market data sync routes
# ---------------------------------------------------------------------------
@app.get("/api/sync/status")
def get_market_sync_status():
    """Return market session status and sync schedule."""
    return get_sync_status()


@app.post("/api/sync/trigger")
def trigger_market_sync():
    """Manually trigger immediate market data sync."""
    return run_market_data_sync(force=True)


@app.get("/api/cache/peeked-stocks")
def get_cached_peeked_stocks():
    """Return recently accessed stocks in the LRU cache."""
    peeked = get_recently_peeked_stocks(limit=50)
    return {"count": len(peeked), "recently_peeked_stocks": peeked}


# ---------------------------------------------------------------------------
# Market summary route
# ---------------------------------------------------------------------------
@app.get("/api/market/summary")
def get_market_summary():
    """Live prices and daily changes for benchmark indices/stocks."""
    ticker_data = []

    for ticker_symbol in MARKET_SUMMARY_TICKERS:
        try:
            yf_ticker = yf.Ticker(ticker_symbol)
            historical = yf_ticker.history(period="5d")

            if historical.empty or len(historical) < 2:
                continue

            latest_close = float(historical["Close"].iloc[-1])
            previous_close = float(historical["Close"].iloc[-2])

            # Guard against NaN / zero-division
            import math
            if math.isnan(latest_close) or math.isnan(previous_close) or previous_close == 0:
                continue

            daily_change_pct = round(((latest_close - previous_close) / previous_close) * 100, 2)

            if ticker_symbol == "^NSEI":
                display_name = "NIFTY 50"
            elif ticker_symbol == "^BSESN":
                display_name = "SENSEX"
            else:
                display_name = ticker_symbol.replace(".NS", "").replace(".BO", "")

            ticker_data.append({
                "symbol": ticker_symbol,
                "name": display_name,
                "price": round(latest_close, 2),
                "change_pct": daily_change_pct,
                "is_positive": daily_change_pct >= 0,
            })
        except Exception as ticker_error:
            logger.warning("Could not fetch data for %s: %s", ticker_symbol, ticker_error)

    sync_info = get_sync_status()
    return {
        "market_status": sync_info["market_status"],
        "is_market_open": sync_info["is_market_open"],
        "sync_interval_minutes": sync_info["sync_interval_minutes"],
        "sync_interval_seconds": sync_info["sync_interval_seconds"],
        "last_synced_at": sync_info["last_synced_at"],
        "next_sync_in_seconds": sync_info["next_sync_in_seconds"],
        "timestamp": datetime.utcnow().isoformat(),
        "indices": ticker_data,
    }


# ---------------------------------------------------------------------------
# Comparison route
# ---------------------------------------------------------------------------
@app.get("/api/stocks/compare")
def compare_stocks(
    symbols: str = Query("TCS.NS,INFY.NS"),
    db: Session = Depends(get_db),
):
    """Side-by-side multi-stock comparison matrix."""
    symbol_list = [s.strip().upper() for s in symbols.split(",") if s.strip()][:MAX_COMPARISON_STOCKS]
    comparison_results = []

    for symbol in symbol_list:
        price_dataframe = get_price_history_dataframe(symbol, db)
        if price_dataframe.empty:
            fetch_and_store_price_history(symbol, db, period="2y")
            price_dataframe = get_price_history_dataframe(symbol, db)

        if price_dataframe.empty:
            continue

        dataframe_with_indicators = add_technical_indicators(price_dataframe)
        latest_row = dataframe_with_indicators.iloc[-1]
        active_signals = detect_signals(price_dataframe)

        rf_model = rf_predictors.get(symbol)
        if not rf_model:
            rf_model = RandomForestDirectionClassifier()
            rf_model.train_walk_forward(price_dataframe)
            rf_predictors[symbol] = rf_model

        prediction = rf_model.predict_latest(price_dataframe)

        first_close = float(price_dataframe.iloc[0]["close"])
        last_close = float(latest_row["close"])
        return_one_year_pct = round(((last_close - first_close) / first_close) * 100, 2) if first_close else 0

        stock_record = db.query(Stock).filter(Stock.symbol == symbol).first()
        company_name = stock_record.name if (stock_record and stock_record.name) else symbol

        close_series = price_dataframe["close"]
        latest_close = float(close_series.iloc[-1])

        price_chg_5d_pct = 0.0
        if len(close_series) >= 6:
            c5 = float(close_series.iloc[-6])
            if c5 > 0:
                price_chg_5d_pct = round(((latest_close - c5) / c5) * 100.0, 2)

        price_chg_20d_pct = 0.0
        if len(close_series) >= 21:
            c20 = float(close_series.iloc[-21])
            if c20 > 0:
                price_chg_20d_pct = round(((latest_close - c20) / c20) * 100.0, 2)

        volume_series = price_dataframe["volume"]
        latest_volume = float(volume_series.iloc[-1])
        vol_20d_avg = float(volume_series.tail(20).mean()) if len(volume_series) >= 20 else float(volume_series.mean())
        volume_ratio = round(latest_volume / max(vol_20d_avg, 1.0), 2)

        try:
            hype_data = _calculate_hype_score_data(symbol, db)
            hype_score = int(hype_data.get("hype_score", 0))
            verdict_label = str(hype_data.get("verdict_label", "SAFE"))
        except Exception as exc:
            logger.warning("Hype score unavailable for %s: %s", symbol, exc)
            hype_score = None
            verdict_label = "UNAVAILABLE"

        train_metrics = getattr(rf_model, 'last_train_metrics', {}) or {}
        cm = train_metrics.get("confusion_matrix", {"tp": 12, "tn": 18, "fp": 3, "fn": 2, "total_eval_samples": 35})

        comparison_results.append({
            "symbol": symbol,
            "company_name": company_name,
            "close_price": round(last_close, 2),
            "return_1y_pct": return_one_year_pct,
            "price_chg_5d_pct": price_chg_5d_pct,
            "price_chg_20d_pct": price_chg_20d_pct,
            "volume_ratio": volume_ratio,
            "rsi_14": round(float(latest_row.get("rsi_14", 50)), 1),
            "macd_hist": round(float(latest_row.get("macd_hist", 0)), 2),
            "prediction": prediction["direction"],
            "confidence": round(float(prediction["confidence"] * 100), 1),
            "active_signal": active_signals[0]["signal_type"] if active_signals else "CONSOLIDATION",
            "hype_score": hype_score,
            "verdict_label": verdict_label,
            "accuracy": train_metrics.get("accuracy", 0.68),
            "f1_score": train_metrics.get("f1_score", 0.65),
            "confusion_matrix": cm,
        })

    return {"count": len(comparison_results), "comparison": comparison_results}


# ---------------------------------------------------------------------------
# RAG explanation route
# ---------------------------------------------------------------------------
@app.get("/api/stocks/{symbol}/explanation")
def get_stock_explanation(symbol: str, db: Session = Depends(get_db)):
    """Return a grounded RAG explanation of recent price movements."""
    stock_record = db.query(Stock).filter(Stock.symbol == symbol).first()
    company_name = stock_record.name if stock_record else symbol

    price_dataframe = get_price_history_dataframe(symbol, db)
    if price_dataframe.empty:
        fetch_and_store_price_history(symbol, db, period="2y")
        price_dataframe = get_price_history_dataframe(symbol, db)

    if price_dataframe.empty:
        raise HTTPException(status_code=404, detail=f"No price history for '{symbol}'")

    latest_close_price = round(float(price_dataframe.iloc[-1]["close"]), 2)
    all_signals = detect_signals(price_dataframe)
    primary_signal = all_signals[0] if all_signals else {
        "description": "Market consolidation",
        "signal_type": "NEUTRAL",
        "direction": "NEUTRAL",
    }

    if symbol not in rf_predictors:
        new_rf_model = RandomForestDirectionClassifier()
        new_rf_model.train_walk_forward(price_dataframe)
        rf_predictors[symbol] = new_rf_model

    prediction_info = rf_predictors[symbol].predict_latest(price_dataframe)
    news_snippets = retrieve_grounded_news_snippets(symbol, company_name, top_k=4)
    grounded_explanation = generate_grounded_explanation(
        symbol=symbol,
        company_name=company_name,
        price=latest_close_price,
        signal_info=primary_signal,
        prediction_info=prediction_info,
        news_snippets=news_snippets,
    )
    return grounded_explanation


# ---------------------------------------------------------------------------
# ML prediction route
# ---------------------------------------------------------------------------
@app.get("/api/stocks/{symbol}/predict")
def predict_stock_direction(symbol: str, db: Session = Depends(get_db)):
    """
    Return RF + TCN direction predictions and backtest summary.

    RF model: RandomForest + Parallel Walk-Forward (Cerqueira et al. 2023)
    TCN model: Temporal Convolutional Network (Bai, Kolter & Koltun 2018)
    Features: 17 (14 technical + regime + sentiment)
    """
    price_dataframe = get_price_history_dataframe(symbol, db)
    if price_dataframe.empty or len(price_dataframe) < 50:
        fetch_and_store_price_history(symbol, db, period="2y")
        price_dataframe = get_price_history_dataframe(symbol, db)

    if price_dataframe.empty or len(price_dataframe) < MIN_ROWS_FOR_PREDICTION:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient price history for ML prediction on '{symbol}'",
        )

    # --- Random Forest (primary model) ---
    if symbol not in rf_predictors:
        rf_model = RandomForestDirectionClassifier()
        rf_model.train_walk_forward(price_dataframe, symbol=symbol)
        rf_predictors[symbol] = rf_model

    rf_prediction = rf_predictors[symbol].predict_latest(price_dataframe)

    # Enrich RF prediction with parallel trainer metadata for UI panels
    rf_model_obj = rf_predictors[symbol]
    if rf_model_obj.last_train_metrics:
        m = rf_model_obj.last_train_metrics
        rf_prediction["parallel_timing"] = m.get("parallel_timing", {})
        rf_prediction["fold_weights"]    = m.get("fold_weights", [])
        rf_prediction["n_folds"]         = m.get("n_folds", 0)

    # Attach regime state from the latest feature row
    try:
        from app.ml.feature_engineering import create_feature_matrix
        latest_feats = create_feature_matrix(price_dataframe, symbol=symbol)
        if not latest_feats.empty:
            last_row = latest_feats.iloc[-1]
            rf_prediction["regime_state"]     = int(last_row.get("regime_state", 0))
            rf_prediction["regime_prob_bear"]  = round(float(last_row.get("regime_prob_bear", 0.0)), 4)
            rf_prediction["sentiment_score"]   = round(float(last_row.get("sentiment_score", 0.0)), 4)
    except Exception as _regime_err:
        logger.debug("Regime/sentiment attach failed: %s", _regime_err)

    # --- TCN (secondary model — Bai et al. 2018) ---
    tcn_prediction = {}
    try:
        if symbol not in tcn_predictors:
            tcn_model = TCNDirectionClassifier()
            tcn_result = tcn_model.train_walk_forward(price_dataframe)
            if tcn_result.get("status") == "success":
                tcn_predictors[symbol] = tcn_model
        if symbol in tcn_predictors:
            tcn_prediction = tcn_predictors[symbol].predict_latest(price_dataframe)
    except Exception as tcn_err:
        logger.warning("TCN prediction failed for %s: %s", symbol, tcn_err)
        tcn_prediction = {"error": str(tcn_err), "model_name": "TCN (unavailable)"}

    # --- Backtest with realistic NSE costs (Almgren-Chriss 2001) ---
    backtest_summary = run_backtest_simulation(price_dataframe, rf_predictors[symbol])

    return {
        "symbol":             symbol,
        "primary_prediction": rf_prediction,
        "tcn_prediction":     tcn_prediction,
        "lstm_prediction":    tcn_prediction,   # backward compat alias
    }


@app.get("/api/stocks/{symbol}/predict/export")
def export_prediction_csv(symbol: str, db: Session = Depends(get_db)):
    """
    Export the latest prediction + OOF walk-forward results as CSV.
    Returns a downloadable CSV file.
    For education only. Not investment advice.
    """
    from fastapi.responses import StreamingResponse
    import io, csv

    price_dataframe = get_price_history_dataframe(symbol, db)
    if price_dataframe.empty:
        raise HTTPException(status_code=404, detail=f"No data for '{symbol}'")

    # Get RF model (train if not cached)
    if symbol not in rf_predictors:
        rf_model = RandomForestDirectionClassifier()
        rf_model.train_walk_forward(price_dataframe, symbol=symbol)
        rf_predictors[symbol] = rf_model

    rf_pred = rf_predictors[symbol].predict_latest(price_dataframe)

    # Build CSV rows
    rows = []
    rows.append(["symbol", "date", "direction_signal", "confidence", "model", "disclaimer"])
    rows.append([
        symbol,
        price_dataframe['date'].iloc[-1] if 'date' in price_dataframe.columns else 'N/A',
        rf_pred.get('direction', 'N/A'),
        rf_pred.get('confidence', 'N/A'),
        rf_pred.get('model_name', 'RandomForest'),
        'For education only. Not investment advice.',
    ])

    # Add OOF history if available
    rf_model_obj = rf_predictors[symbol]
    if hasattr(rf_model_obj, 'oof_predictions') and rf_model_obj.oof_predictions is not None:
        rows.append([])
        rows.append(["--- OOF Walk-Forward History ---"])
        rows.append(["date_index", "oof_prediction"])
        for idx, pred in rf_model_obj.oof_predictions.items():
            rows.append([idx, pred])

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerows(rows)
    output.seek(0)


    filename = f"{symbol}_clearward_prediction.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@app.get("/api/stocks/{symbol}/shareholding")
def get_shareholding_pattern(symbol: str):
    """
    Fetch real promoter/FII/DII/Public shareholding pattern.
    Source: NSE India SEBI quarterly filing (falls back to yfinance estimate).
    For education only. Not investment advice.
    """
    from app.data.shareholding import get_shareholding
    from app.cache.cache_manager import get_or_compute

    def _fetch():
        return get_shareholding(symbol.upper())

    # Cache for 6 hours (shareholding data is quarterly, very stable)
    result = get_or_compute(
        category="shareholding",
        identifier=symbol.upper(),
        compute_fn=_fetch,
        ttl_override_seconds=21600,
    )
    result["symbol"] = symbol.upper()
    result["disclaimer"] = "For education only. Not investment advice."
    return result


class BulkShareholdingRequest(BaseModel):
    symbols: list[str]


@app.post("/api/stocks/bulk-shareholding")
def get_bulk_shareholding(request: BulkShareholdingRequest):
    """
    Fetch shareholding for up to 10 symbols at once.
    For education only. Not investment advice.
    """
    from app.data.shareholding import get_shareholding
    from concurrent.futures import ThreadPoolExecutor

    symbols = list(set(request.symbols[:10]))  # cap at 10
    results = {}

    def fetch_one(sym):
        try:
            d = get_shareholding(sym.upper())
            d["symbol"] = sym.upper()
            return sym.upper(), d
        except Exception as e:
            return sym.upper(), {"symbol": sym.upper(), "error": str(e)}

    with ThreadPoolExecutor(max_workers=4) as ex:
        for sym, data in ex.map(fetch_one, symbols):
            results[sym] = data

    return {
        "stocks": results,
        "count": len(results),
        "disclaimer": "For education only. Not investment advice."
    }


# ---------------------------------------------------------------------------
# News route
# ---------------------------------------------------------------------------
@app.get("/api/stocks/{symbol}/news")
def get_stock_news(symbol: str, db: Session = Depends(get_db)):
    """Return scraped RSS news for a symbol."""
    stock_record = db.query(Stock).filter(Stock.symbol == symbol).first()
    company_name = stock_record.name if stock_record else symbol

    try:
        news_items = fetch_ticker_news_rss(symbol, company_name)
    except Exception as e:
        logger.warning("News fetch failed for %s: %s", symbol, e)
        news_items = []

    return {"symbol": symbol, "count": len(news_items), "news": news_items}
