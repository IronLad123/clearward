"""
lstm_model.py — Feed-Forward MLP direction classifier.

Named LSTMDirectionClassifier for backwards-compatibility with existing imports,
but uses sklearn MLPClassifier internally (no LSTM/RNN layers).
"""
HAS_TENSORFLOW = False
import logging
import os
import numpy as np
import pandas as pd
from typing import Dict, Tuple
from app.ml.feature_engineering import FEATURE_COLUMNS, create_feature_matrix, create_inference_row

logger = logging.getLogger(__name__)


class LSTMDirectionClassifier:
    """
    Feed-Forward Neural Network (MLP) direction classifier.
    Class name kept for backwards-compatibility; uses sklearn MLPClassifier,
    not LSTM or any recurrent architecture.
    """

    def __init__(self, sequence_length: int = 15):
        self.sequence_length = sequence_length
        self.model = None
        self.classes_map = {-1: 'DOWN', 0: 'FLAT', 1: 'UP'}
        self.class_indices = {-1: 0, 0: 1, 1: 2}
        self.idx_to_dir = {0: 'DOWN', 1: 'FLAT', 2: 'UP'}
        self.is_trained = False

    def train_walk_forward(self, df: pd.DataFrame) -> Dict:
        """Train MLP on the feature matrix derived from df.

        Note: accuracy reported here is IN-SAMPLE (training data only),
        not a valid out-of-sample estimate. Use WalkForwardSplitter for
        honest OOF evaluation.
        """
        matrix = create_feature_matrix(df)
        if matrix.empty or len(matrix) < 30:
            return {'status': 'error', 'message': 'Insufficient data for neural net training'}
        X = matrix[FEATURE_COLUMNS]
        y = matrix['target_class']
        from sklearn.metrics import accuracy_score
        from sklearn.neural_network import MLPClassifier
        if HAS_TENSORFLOW:
            self.model = MLPClassifier(hidden_layer_sizes=(32, 16), max_iter=200, random_state=42)
        else:
            logger.warning('TensorFlow not available. Using MLPClassifier (Feed-Forward MLP) fallback.')
            self.model = MLPClassifier(hidden_layer_sizes=(32, 16), max_iter=200, random_state=42)
        self.model.fit(X, y)
        self.is_trained = True
        preds = self.model.predict(X)
        acc = accuracy_score(y, preds)
        return {
            'status': 'success',
            'model_type': 'Feed-Forward MLP (sklearn)',
            'model': 'Feed-Forward MLP (sklearn)',
            'accuracy': round(float(acc), 4),
            'accuracy_note': 'IN-SAMPLE only — not a valid out-of-sample estimate',
            'sequence_length': self.sequence_length,
            'train_samples': len(X),
            'tensorflow_available': HAS_TENSORFLOW,
        }

    def predict_latest(self, df: pd.DataFrame) -> Dict:
        """Predict direction for the most recent candle.

        Uses create_inference_row() to get the freshest feature row without
        requiring a forward return label (which would drop the last 3 days
        when using create_feature_matrix's dropna on target_class).
        """
        if not self.is_trained or self.model is None:
            self.train_walk_forward(df)

        try:
            inference_row = create_inference_row(df)
        except ValueError as e:
            logger.warning('MLP predict_latest: insufficient data — %s', e)
            inference_row = None

        if inference_row is None:
            logger.warning('MLP predict_latest: create_inference_row returned None, returning neutral')
            return {
                'direction': 'FLAT',
                'confidence': 0.5,
                'probabilities': {'UP': 0.33, 'DOWN': 0.33, 'FLAT': 0.34},
                'model': 'Feed-Forward MLP (sklearn)',
                'model_name': 'Feed-Forward MLP (sklearn)',
                'note': 'Insufficient data for inference',
            }

        latest_X = inference_row[FEATURE_COLUMNS].values.reshape(1, -1)
        probs = self.model.predict_proba(latest_X)[0]
        classes = self.model.classes_
        prob_dict = {'UP': 0.33, 'DOWN': 0.33, 'FLAT': 0.34}
        for cls, prob in zip(classes, probs):
            prob_dict[self.classes_map[cls]] = round(float(prob), 3)
        predicted_cls = self.model.predict(latest_X)[0]
        predicted_dir = self.classes_map[predicted_cls]
        confidence = prob_dict[predicted_dir]
        return {
            'direction': predicted_dir,
            'confidence': confidence,
            'probabilities': prob_dict,
            'model_name': 'Feed-Forward MLP (sklearn)',
            'model': 'Feed-Forward MLP (sklearn)',
        }
