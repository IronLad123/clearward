import json
from datetime import datetime
from sqlalchemy.orm import Session
from app.database.models import ModelRegistry

def log_model_run(db: Session, model_name: str, version: str, filepath: str, accuracy: float, f1_score: float, sharpe_ratio: float=0.0, is_champion: bool=False, metrics_dict: dict=None) -> ModelRegistry:
    """
    Logs trained model metadata and performance metrics to the database registry.
    """
    if is_champion:
        db.query(ModelRegistry).filter(ModelRegistry.model_name == model_name).update({'is_champion': False})
        entry = ModelRegistry(model_name=model_name, version=version, filepath=filepath, train_end_date=datetime.utcnow(), accuracy=round(accuracy, 4), f1_score=round(f1_score, 4), sharpe_ratio=round(sharpe_ratio, 2), is_champion=is_champion, metrics_json=json.dumps(metrics_dict or {}))
        db.add(entry)
        db.commit()
        db.refresh(entry)
        return entry

def get_active_champion_model(db: Session, model_name: str='RandomForest') -> ModelRegistry:
    """
    Fetches active champion model entry from registry.
    """
    return db.query(ModelRegistry).filter(ModelRegistry.model_name == model_name, ModelRegistry.is_champion == True).first()
