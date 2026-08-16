"""
market_sync.py - Dynamic Market Data Synchronization Engine for Clearward.

Rules:
    1. Indian Stock Market (NSE/BSE) trading hours: Mon-Fri, 09:15 to 15:30 IST (UTC+5:30).
    2. During Market OPEN: Synchronize market data every 5 minutes (300s).
    3. During Market CLOSED: Synchronize market data every 1 hour / 60 minutes (3600s).
    4. Provides dynamic interval status for frontend auto-refresh and manual trigger support.
"""

import logging
import threading
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional
from apscheduler.schedulers.background import BackgroundScheduler

from app.database.db import SessionLocal
from app.ingestion.price_ingestion import fetch_and_store_price_history
from app.cache.cache_manager import purge_expired

logger = logging.getLogger(__name__)

# Core tickers continuously synchronized
SYNC_TICKER_UNIVERSE = [
    "^NSEI",
    "^BSESN",
    "RELIANCE.NS",
    "TCS.NS",
    "HDFCBANK.NS",
    "ICICIBANK.NS",
    "INFY.NS",
    "TATAMOTORS.NS",
    "SBIN.NS",
    "L&T.NS",
]

# State tracking
_sync_lock = threading.Lock()
_last_synced_at: Optional[datetime] = None
_last_sync_status: str = "IDLE"
_total_sync_count: int = 0
_sync_scheduler: Optional[BackgroundScheduler] = None
_is_scheduler_running: bool = False


def get_ist_now() -> datetime:
    """Return current datetime in Indian Standard Time (IST - UTC+5:30)."""
    ist_tz = timezone(timedelta(hours=5, minutes=30))
    return datetime.now(ist_tz)


def is_market_open(dt: Optional[datetime] = None) -> bool:
    """
    Check if the Indian stock market (NSE/BSE) is currently open.
    Trading Session: Monday to Friday, 09:15 AM to 03:30 PM IST.
    """
    if dt is None:
        dt = get_ist_now()
    elif dt.tzinfo is None:
        ist_tz = timezone(timedelta(hours=5, minutes=30))
        dt = dt.replace(tzinfo=timezone.utc).astimezone(ist_tz)
    else:
        ist_tz = timezone(timedelta(hours=5, minutes=30))
        dt = dt.astimezone(ist_tz)

    # Weekday check: Monday (0) to Friday (4)
    if dt.weekday() >= 5:
        return False

    # Minute of day check: 09:15 (555 mins) to 15:30 (930 mins)
    minute_of_day = dt.hour * 60 + dt.minute
    open_minute = 9 * 60 + 15 # 09:15 AM
    close_minute = 15 * 60 + 30 # 03:30 PM

    return open_minute <= minute_of_day < close_minute


def get_sync_interval_minutes(dt: Optional[datetime] = None) -> int:
    """Return 5 minutes if market is open, or 60 minutes (1 hour) if market is closed."""
    return 5 if is_market_open(dt) else 60


def get_sync_interval_seconds(dt: Optional[datetime] = None) -> int:
    """Return 300 seconds (5m) if market is open, or 3600 seconds (1h) if market is closed."""
    return get_sync_interval_minutes(dt) * 60


def run_market_data_sync(force: bool = False) -> Dict[str, Any]:
    """
    Execute market data synchronization:
        1. Fetch updated daily/intraday price candles for core universe
        2. Purge stale/expired cache entries
        3. Update last synced timestamp and status
    """
    global _last_synced_at, _last_sync_status, _total_sync_count

    if not _sync_lock.acquire(blocking=False):
        logger.info("Market data sync already in progress - skipping concurrent call.")
        return {
            "status": "SKIPPED",
            "reason": "Sync already in progress",
            "last_synced_at": _last_synced_at.isoformat() if _last_synced_at else None,
        }

    try:
        _last_sync_status = "RUNNING"
        start_time = datetime.utcnow()
        logger.info(" Starting market data sync (Force=%s, MarketOpen=%s)...", force, is_market_open())

        db = SessionLocal()
        synced_tickers = []
        failed_tickers = []

        try:
            # Sync key tickers
            for symbol in SYNC_TICKER_UNIVERSE:
                try:
                    count = fetch_and_store_price_history(symbol, db, period="5d")
                    synced_tickers.append({"symbol": symbol, "records": count})
                except Exception as ex:
                    logger.warning("Failed to sync ticker %s: %s", symbol, ex)
                    failed_tickers.append({"symbol": symbol, "error": str(ex)})

            # Purge expired SQLite cache
            purged_count = purge_expired()
            logger.info("Cache maintenance: Purged %d expired entries.", purged_count)

        finally:
            db.close()

        _last_synced_at = datetime.utcnow()
        _last_sync_status = "SUCCESS"
        _total_sync_count += 1
        duration_sec = round((datetime.utcnow() - start_time).total_seconds(), 2)

        logger.info(
            " Market data sync completed in %ss. Synced: %d, Failed: %d",
            duration_sec, len(synced_tickers), len(failed_tickers)
        )

        return {
            "status": "SUCCESS",
            "market_open": is_market_open(),
            "sync_interval_minutes": get_sync_interval_minutes(),
            "synced_count": len(synced_tickers),
            "failed_count": len(failed_tickers),
            "duration_seconds": duration_sec,
            "last_synced_at": _last_synced_at.isoformat(),
            "total_sync_count": _total_sync_count,
        }

    except Exception as e:
        _last_sync_status = "FAILED"
        logger.error("Market data sync encountered an error: %s", e, exc_info=True)
        return {
            "status": "FAILED",
            "error": str(e),
            "last_synced_at": _last_synced_at.isoformat() if _last_synced_at else None,
        }

    finally:
        _sync_lock.release()


def _check_and_run_scheduled_sync():
    """
    Periodic tick function (called every 30 seconds by scheduler).
    Calculates elapsed time since last sync and triggers sync if the
    applicable market interval (5m during open, 60m during closed) has elapsed.
    """
    global _last_synced_at

    now = datetime.utcnow()
    interval_seconds = get_sync_interval_seconds()

    if _last_synced_at is None:
        logger.info("Initial sync required on startup.")
        run_market_data_sync(force=True)
        return

    elapsed_seconds = (now - _last_synced_at).total_seconds()
    if elapsed_seconds >= interval_seconds:
        logger.info(
            "Sync threshold reached: elapsed=%.1fs >= required=%ds (MarketOpen=%s)",
            elapsed_seconds, interval_seconds, is_market_open()
        )
        run_market_data_sync(force=False)


def start_market_sync_scheduler():
    """Start background scheduler for dynamic 5m (open) / 60m (closed) market data sync."""
    global _sync_scheduler, _is_scheduler_running

    if not _is_scheduler_running:
        _sync_scheduler = BackgroundScheduler()
        _sync_scheduler.add_job(
            _check_and_run_scheduled_sync,
            trigger="interval",
            seconds=30, # Tick every 30s to evaluate elapsed time against 5m / 1h rule
            id="market_data_sync_job",
            replace_existing=True,
        )
        _sync_scheduler.start()
        _is_scheduler_running = True
        logger.info(" Dynamic Market Data Sync Scheduler started (5m open / 1h closed rule).")


def stop_market_sync_scheduler():
    """Shutdown market sync scheduler."""
    global _sync_scheduler, _is_scheduler_running
    if _is_scheduler_running and _sync_scheduler:
        _sync_scheduler.shutdown(wait=False)
        _is_scheduler_running = False
        logger.info("Market Sync Scheduler shut down.")


def get_sync_status() -> Dict[str, Any]:
    """Return full diagnostic sync status including time until next sync."""
    ist_now = get_ist_now()
    market_active = is_market_open(ist_now)
    interval_sec = get_sync_interval_seconds(ist_now)
    interval_min = get_sync_interval_minutes(ist_now)

    utc_now = datetime.utcnow()
    if _last_synced_at is None:
        next_sync_in_sec = 0
    else:
        elapsed = (utc_now - _last_synced_at).total_seconds()
        next_sync_in_sec = max(0, int(interval_sec - elapsed))

    return {
        "market_status": "OPEN " if market_active else "CLOSED ",
        "is_market_open": market_active,
        "sync_interval_minutes": interval_min,
        "sync_interval_seconds": interval_sec,
        "schedule_rule": "5 min during market open (09:15-15:30 IST Mon-Fri), 1 hr during market close",
        "last_synced_at": _last_synced_at.isoformat() if _last_synced_at else None,
        "last_sync_status": _last_sync_status,
        "next_sync_in_seconds": next_sync_in_sec,
        "total_sync_count": _total_sync_count,
        "ist_time": ist_now.strftime("%Y-%m-%d %H:%M:%S IST"),
    }
