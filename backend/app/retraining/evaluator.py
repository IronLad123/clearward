import os
import joblib
from datetime import datetime, timedelta
from typing import Dict, List
from sqlalchemy.orm import Session

from app.config import MODELS_DIR
from app.database.models import ModelRegistry, PriceHistory
from app.ingestion.price_ingestion import fetch_and_store_price_history, get_price_history_dataframe
from app.ml.models.baseline_rf import RandomForestDirectionClassifier
from app.ml.backtester import run_backtest_simulation
from app.ml.registry import log_model_run, get_active_champion_model

def evaluate_and_retrain_model(symbol: str, db: Session, rolling_window_n: int = 5, min_new_samples: int = 15, on_promotion_callback=None) -> Dict:
    """
    Stabilized Champion vs Challenger Gatekeeper Pipeline:
        1. Minimum Sample-Size Gate: Ensures >= min_new_samples new labeled data exists.
        2. Rolling Average Metric Evaluation: Requires F1/Sharpe gains over N-run rolling average.
        3. Full Audit Changelog logging in SQLite ModelRegistry.
    """
    # 1. Fetch latest price data
    fetch_and_store_price_history(symbol, db, period="2y")
    df = get_price_history_dataframe(symbol, db)

    if df.empty or len(df) < 80:
        return {
            "status": "skipped",
            "reason": f"Insufficient dataset size ({len(df)} candles) for {symbol}"
        }

    # 2. Check active Champion and minimum sample-size gate
    champion_entry = get_active_champion_model(db, model_name=f"RF_{symbol}")

    if champion_entry and champion_entry.train_end_date:
        # Count samples added since last retrain timestamp
        new_samples = db.query(PriceHistory).filter(
            PriceHistory.symbol == symbol,
            PriceHistory.date > champion_entry.train_end_date
        ).count()

        if new_samples < min_new_samples:
            return {
                "status": "skipped",
                "reason": f"Minimum sample-size gate not met: {new_samples}/{min_new_samples} new samples since last retrain."
            }

    # 3. Train Challenger model
    challenger = RandomForestDirectionClassifier()
    train_metrics = challenger.train_walk_forward(df)

    if train_metrics.get("status") == "error":
        return train_metrics

    bt_res = run_backtest_simulation(df, challenger)
    challenger_acc = train_metrics["accuracy"]
    challenger_f1 = train_metrics["f1_score"]
    challenger_sharpe = bt_res.get("strategy_sharpe", 0.0)

    # 4. Calculate Rolling Average Metrics from last N runs in SQLite
    past_runs = db.query(ModelRegistry).filter(
        ModelRegistry.model_name == f"RF_{symbol}"
    ).order_by(ModelRegistry.created_at.desc()).limit(rolling_window_n).all()

    if past_runs:
        avg_champion_f1 = sum(r.f1_score for r in past_runs) / len(past_runs)
        avg_champion_sharpe = sum(r.sharpe_ratio or 0.0 for r in past_runs) / len(past_runs)
    else:
        avg_champion_f1 = champion_entry.f1_score if champion_entry else 0.0
        avg_champion_sharpe = champion_entry.sharpe_ratio if champion_entry and champion_entry.sharpe_ratio else 0.0

    is_promoted = False
    decision = "REJECTED"
    promotion_reason = ""

    # Ensure unique version string across ModelRegistry
    base_v_num = 0
    while True:
        candidate_version = f"v1.0.{base_v_num}" if not champion_entry else f"v{int(champion_entry.version.replace('v','').split('.')[0])}.{int(champion_entry.version.replace('v','').split('.')[1])}.{int(champion_entry.version.replace('v','').split('.')[2]) + 1 + base_v_num}"
        exists = db.query(ModelRegistry).filter(ModelRegistry.version == candidate_version).first()
        if not exists:
            new_version = candidate_version
            break
        base_v_num += 1

    if not champion_entry:
        is_promoted = True
        decision = "PROMOTED"
        promotion_reason = "Initial Champion Model Registration"
    else:
        f1_diff = challenger_f1 - avg_champion_f1
        sharpe_diff = challenger_sharpe - avg_champion_sharpe

        if f1_diff >= 0.02 or sharpe_diff >= 0.20:
            is_promoted = True
            decision = "PROMOTED"
            promotion_reason = f"Promoted: Rolling F1 gain {f1_diff:+.3f}, Sharpe gain {sharpe_diff:+.2f}"
        else:
            is_promoted = False
            decision = "REJECTED"
            promotion_reason = f"Rejected: Rolling F1 diff {f1_diff:+.3f} below +0.02 threshold"

    if is_promoted and on_promotion_callback:
        try:
            on_promotion_callback(symbol)
        except Exception as cb_err:
            import logging
            logging.getLogger(__name__).warning('Promotion callback error for %s: %s', symbol, cb_err)

    # 5. Save model artifact
    filename = f"rf_{symbol.replace('.', '_')}_{new_version}.joblib"
    filepath = os.path.join(MODELS_DIR, filename)
    challenger.save(filepath)

    # 6. Log audit changelog in SQLite
    registry_record = log_model_run(
        db=db,
        model_name=f"RF_{symbol}",
        version=new_version,
        filepath=filepath,
        accuracy=challenger_acc,
        f1_score=challenger_f1,
        sharpe_ratio=challenger_sharpe,
        is_champion=is_promoted,
        metrics_dict={
            "symbol": symbol,
            "decision": decision,
            "promotion_reason": promotion_reason,
            "train_samples": len(df),
            "feature_importance": train_metrics.get("feature_importance", {})
        }
    )

    if hasattr(registry_record, 'decision'):
        registry_record.decision = decision
        registry_record.reason = promotion_reason
        db.commit()

    return {
        "status": "success",
        "symbol": symbol,
        "version": new_version,
        "decision": decision,
        "is_promoted": is_promoted,
        "reason": promotion_reason,
        "challenger_f1": challenger_f1,
        "champion_avg_f1": avg_champion_f1,
        "artifact": filepath
    }
