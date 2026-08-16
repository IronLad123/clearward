from apscheduler.schedulers.background import BackgroundScheduler
from datetime import datetime
from sqlalchemy.orm import Session

from app.cache import purge_expired
from app.database.db import SessionLocal
from app.database.models import Stock
from app.retraining.evaluator import evaluate_and_retrain_model

scheduler = BackgroundScheduler()
is_scheduler_running = False

def run_universe_retraining_job():
    """
    Scheduled background task that iterates over all monitored stocks
    and runs the Champion vs Challenger retraining evaluator.
    """
    print(f"[{datetime.utcnow().isoformat()}] STARTING SCHEDULED MODEL RETRAINING JOB...")
    db: Session = SessionLocal()
    try:
        from app.main import clear_symbol_model_caches
        stocks = db.query(Stock).all()
        for stock in stocks:
            res = evaluate_and_retrain_model(stock.symbol, db, on_promotion_callback=clear_symbol_model_caches)
            status_str = "PROMOTED " if res.get("is_promoted") else "REJECTED "
            print(f" - {stock.symbol}: {status_str} (Version: {res.get('version')}) -> {res.get('reason')}")
    except Exception as e:
        print(f"Error during scheduled retraining job: {e}")
    finally:
        db.close()
        print(f"[{datetime.utcnow().isoformat()}] SCHEDULED MODEL RETRAINING COMPLETED.")

def _run_cache_purge_job():
    """
    Periodic background task to purge expired entries from api_cache.db.
    Runs every 6 hours to prevent unbounded SQLite growth from orphaned TTL keys.
    """
    try:
        purged = purge_expired()
        print(f"[{datetime.utcnow().isoformat()}] Cache purge complete - removed {purged} expired entries.")
    except Exception as exc:
        print(f"[{datetime.utcnow().isoformat()}] Cache purge failed: {exc}")


def start_retraining_scheduler(interval_hours: int = 24):
    """Starts background APScheduler job for model retraining and cache purging."""
    global is_scheduler_running
    if not is_scheduler_running:
        # Nightly model retraining job
        scheduler.add_job(
            run_universe_retraining_job,
            trigger="interval",
            hours=interval_hours,
            id="model_retraining_job",
            replace_existing=True
        )
        # Periodic cache purge - every 6 hours (prevents api_cache.db from growing unbounded)
        scheduler.add_job(
            _run_cache_purge_job,
            trigger="interval",
            hours=6,
            id="cache_purge_job",
            replace_existing=True
        )
        scheduler.start()
        is_scheduler_running = True
        print(f" Background Retraining Scheduler started (Interval: every {interval_hours} hours).")
        print(f" Cache Purge Job started (every 6 hours).")

def stop_retraining_scheduler():
    global is_scheduler_running
    if is_scheduler_running:
        scheduler.shutdown(wait=False)
        is_scheduler_running = False
