import joblib
import time
import numpy as np
import pandas as pd
from typing import Dict
from sklearn.ensemble import RandomForestClassifier
from app.ml.feature_engineering import FEATURE_COLUMNS, create_feature_matrix
from app.ml.validation import WalkForwardSplitter
from app.ml.parallel_trainer import ParallelGroupTrainer

import logging
logger = logging.getLogger(__name__)


class RandomForestDirectionClassifier:
    """
    Random Forest direction classifier (UP / DOWN / FLAT).

    Training uses ParallelGroupTrainer which runs all Walk-Forward folds
    concurrently via ThreadPoolExecutor, then combines predictions with
    recency-weighted soft voting.

    Research basis:
      [1] Cerqueira et al. 2023 — Walk-Forward folds are embarrassingly parallel
      [2] ReWTS (JAIR 2023)    — recent-period sub-models should dominate ensemble
      [3] Gu, Kelly & Xiu 2020 — large RF feature set for financial direction
    """

    def __init__(self, n_estimators: int = 150, max_depth: int = 6):
        # Production model — trained on ALL data after parallel OOF eval
        self.model = RandomForestClassifier(
            n_estimators=n_estimators,
            max_depth=max_depth,
            min_samples_leaf=10,
            random_state=42,
            class_weight="balanced",
            n_jobs=-1,   # use all CPUs for the final production model
        )
        self.classes_map   = {-1: "DOWN", 0: "FLAT", 1: "UP"}
        self.is_trained    = False
        self.oof_predictions      = None
        self.last_train_metrics   = {}
        self._parallel_trainer    = None   # ParallelGroupTrainer instance after fit

    # ------------------------------------------------------------------
    # Training
    # ------------------------------------------------------------------

    def train_walk_forward(self, df: pd.DataFrame, symbol: str = 'UNKNOWN') -> Dict:
        """
        Train via Parallel Group Walk-Forward:
          1. Build 14-feature matrix from OHLCV.
          2. Instantiate ParallelGroupTrainer with the configured WalkForwardSplitter.
          3. All N folds run concurrently (ThreadPoolExecutor).
          4. OOF metrics are aggregated with recency-weighted averaging.
          5. Final production model trains on ALL data for live predictions.
          6. predict_latest() uses recency-weighted soft vote across fold models.
        """
        t_total_start = time.perf_counter()

        matrix = create_feature_matrix(df)
        if matrix.empty or len(matrix) < 80:
            return {"status": "error", "message": "Insufficient data for training"}

        X = matrix[FEATURE_COLUMNS]
        y = matrix["target_class"]

        # Walk-Forward splitter — same parameters as before
        splitter = WalkForwardSplitter(
            min_train_size=200,
            test_size=40,
            n_splits=5,
            embargo_horizon=3,
        )

        # Global class array for probability alignment across folds
        global_classes = np.array(sorted(y.unique()))

        # ---- Parallel group training ----
        trainer = ParallelGroupTrainer(
            splitter=splitter,
            max_workers=4,      # 4 concurrent fold workers
            recency_decay=1.0,  # newest fold gets e^1 ~ 2.7x weight of oldest
        )
        metrics = trainer.fit(X, y, global_classes)
        self._parallel_trainer = trainer

        # Rebuild OOF index from fold results
        oof_preds   = []
        oof_indices = []
        for r in trainer.fold_results_:
            oof_preds.extend(r["preds"].tolist())
            oof_indices.extend(r["test_idx"].tolist())
        self.oof_predictions = pd.Series(oof_preds, index=X.index[oof_indices])
        self.oof_predictions = self.oof_predictions[~self.oof_predictions.index.duplicated(keep='last')]

        # ---- Final production model: train on ALL data ----
        self.model.fit(X, y)
        self.is_trained = True

        t_total_ms = round((time.perf_counter() - t_total_start) * 1000, 1)

        # Attach timing to metrics
        metrics["total_train_ms"] = t_total_ms
        metrics["trainer"] = "ParallelGroupTrainer"

        logger.info(
            "[RF] Parallel training done. acc=%.3f f1=%.3f folds=%d "
            "wall=%.0fms speedup=%.1fx",
            metrics["accuracy"],
            metrics["f1_score"],
            metrics["n_folds"],
            metrics["parallel_timing"]["parallel_wall_ms"],
            metrics["parallel_timing"]["speedup_ratio"],
        )

        self.last_train_metrics = metrics
        
        # Save to registry
        if symbol != 'UNKNOWN':
            self.save_to_registry(symbol, metrics)
            
        return metrics

    # ------------------------------------------------------------------
    # Prediction — recency-weighted soft vote from parallel fold ensemble
    # ------------------------------------------------------------------

    def predict_latest(self, df: pd.DataFrame) -> dict:
        """
        Predict direction for the latest candle.

        If ParallelGroupTrainer is fitted, uses recency-weighted soft vote
        across all fold models (most recent fold has highest weight).
        Falls back to the single production model if trainer is not available.
        """
        neutral = {
            "direction": "NEUTRAL",
            "confidence": 0.5,
            "probabilities": {"UP": 0.33, "DOWN": 0.33, "FLAT": 0.34},
            "feature_contributions": [],
        }
        if not self.is_trained or self.model is None:
            return neutral

        matrix = create_feature_matrix(df)
        if matrix.empty:
            return neutral

        latest_x = matrix[FEATURE_COLUMNS].iloc[[-1]].fillna(0)
        x_values = latest_x.values.astype(np.float32)

        # -- Recency-weighted soft vote (if parallel trainer available) --
        if self._parallel_trainer is not None and self._parallel_trainer.is_fitted_:
            proba = self._parallel_trainer.predict_proba(x_values)[0]  # shape (n_classes,)
            classes = self._parallel_trainer.global_classes_
            prob_dict = {
                str(int(c)): round(float(p), 4)
                for c, p in zip(classes, proba)
            }
            prediction_source = "parallel_ensemble"
        else:
            # Fallback to single production model
            proba_raw = self.model.predict_proba(latest_x)[0]
            classes   = self.model.classes_
            prob_dict = {str(int(c)): round(float(p), 4) for c, p in zip(classes, proba_raw)}
            prediction_source = "single_model"

        best_class  = max(prob_dict, key=prob_dict.get)
        confidence  = prob_dict[best_class]

        # Feature contributions from the production model (trained on full data)
        importances  = getattr(self.model, "feature_importances_", None)
        contributions = []
        if importances is not None and len(importances) == len(FEATURE_COLUMNS):
            latest_vals = latest_x.iloc[0].to_dict()
            name_map = {
                "rsi_14":             "RSI (14)",
                "macd_hist":          "MACD Histogram",
                "bb_pct_b":           "Bollinger %B",
                "vol_ratio":          "Volume Ratio",
                "atr_pct":            "ATR Volatility %",
                "ema_ratio":          "EMA 20/50 Ratio",
                "stoch_k":            "Stochastic %K",
                "price_sma200_ratio": "Price/SMA-200",
                "intraday_range":     "Intraday Range",
                "ret_1d":             "1-Day Return",
                "ret_2d":             "2-Day Return",
                "ret_3d":             "3-Day Return",
                "ret_5d":             "5-Day Return",
                "ret_10d":            "10-Day Return",
            }
            for col, imp in zip(FEATURE_COLUMNS, importances):
                val = float(latest_vals.get(col, 0))
                impact_dir = (
                    "BULLISH"
                    if (best_class == "1" and val > 0) or (best_class == "-1" and val < 0)
                    else "BEARISH"
                )
                contributions.append({
                    "feature":        name_map.get(col, col),
                    "raw_val":        round(val, 4),
                    "importance_pct": round(float(imp * 100), 1),
                    "impact":         impact_dir,
                })
            contributions = sorted(
                contributions, key=lambda x: x["importance_pct"], reverse=True
            )[:5]

        return {
            "direction":           self.classes_map.get(int(best_class), "FLAT"),
            "confidence":          round(float(confidence), 4),
            "probabilities":       {
                self.classes_map.get(int(k), "FLAT"): v
                for k, v in prob_dict.items()
            },
            "feature_contributions": contributions,
            "model_name":          "RandomForest + Parallel Walk-Forward Ensemble",
            "prediction_source":   prediction_source,
        }

    # ------------------------------------------------------------------
    # Persistence
    # ------------------------------------------------------------------

    def _feature_hash(self) -> str:
        """SHA256 of sorted FEATURE_COLUMNS — detects feature set changes."""
        import hashlib
        return hashlib.sha256(','.join(sorted(FEATURE_COLUMNS)).encode()).hexdigest()[:12]

    def save_to_registry(self, symbol: str, metrics: dict, models_dir: str = 'data/models') -> str:
        """
        Save trained RF + parallel trainer state with versioned filename.
        Research: Sculley et al. 2015 — model artifact versioning.
        Filename: {models_dir}/{symbol}_rf_{feature_hash}_{date}.pkl
        Also writes metadata JSON alongside the pkl.
        Returns the saved filepath.
        """
        import os, json, joblib
        from datetime import datetime
        os.makedirs(models_dir, exist_ok=True)
        date_str = datetime.utcnow().strftime('%Y%m%d')
        feat_hash = self._feature_hash()
        fname = f"{symbol.replace('.','_')}_rf_{feat_hash}_{date_str}.pkl"
        fpath = os.path.join(models_dir, fname)
        joblib.dump({'model': self.model, 'parallel_trainer': self._parallel_trainer, 'feature_columns': FEATURE_COLUMNS}, fpath)
        meta = {
            'symbol': symbol, 'date': date_str, 'feature_hash': feat_hash,
            'accuracy': metrics.get('accuracy'), 'f1_score': metrics.get('f1_score'),
            'n_folds': metrics.get('n_folds'), 'feature_columns': FEATURE_COLUMNS,
            'model_file': fname,
        }
        with open(fpath.replace('.pkl', '_meta.json'), 'w') as f:
            json.dump(meta, f, indent=2)

        self.cleanup_registry(symbol, models_dir, keep_n=3)
        return fpath

    @staticmethod
    def cleanup_registry(symbol: str, models_dir: str = 'data/models', keep_n: int = 3):
        """
        Delete old model versions, keeping only the `keep_n` most recent
        .pkl files for this symbol. Also deletes matching _meta.json files.

        Called automatically after every save_to_registry().
        """
        import glob
        import os
        pattern = os.path.join(models_dir, f"{symbol.replace('.', '_')}_rf_*.pkl")
        existing = sorted(glob.glob(pattern))  # sorted = oldest first
        to_delete = existing[:-keep_n] if len(existing) > keep_n else []
        for f in to_delete:
            try:
                os.remove(f)
                meta = f.replace('.pkl', '_meta.json')
                if os.path.exists(meta):
                    os.remove(meta)
                logger.info('ModelRegistry: deleted old version %s', f)
            except Exception as del_err:
                logger.warning('ModelRegistry: could not delete %s: %s', f, del_err)

    @classmethod
    def load_from_registry(cls, symbol: str, models_dir: str = 'data/models') -> 'RandomForestDirectionClassifier':
        """
        Load the most recently saved model for a symbol.
        Returns None if no saved model found.
        """
        import os, glob, joblib
        pattern = os.path.join(models_dir, f"{symbol.replace('.','_')}_rf_*.pkl")
        files = sorted(glob.glob(pattern))
        if not files:
            return None
        payload = joblib.load(files[-1])   # latest by filename sort (date suffix)
        inst = cls()
        inst.model = payload['model']
        inst._parallel_trainer = payload.get('parallel_trainer')
        inst.is_trained = True
        return inst

    def save(self, filepath: str):
        joblib.dump(self.model, filepath)

    def load(self, filepath: str):
        self.model = joblib.load(filepath)
        self.is_trained = True
