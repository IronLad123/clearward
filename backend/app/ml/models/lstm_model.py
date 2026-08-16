HAS_TENSORFLOW = False
import os
import numpy as np
import pandas as pd
from typing import Dict, Tuple
from app.ml.feature_engineering import FEATURE_COLUMNS, create_feature_matrix

class LSTMDirectionClassifier:
    """
    Feed-Forward Neural Network (MLP) direction classifier.
    """

    def __init__(self, sequence_length: int=15):
        self.sequence_length = sequence_length
        self.model = None
        self.classes_map = {-1: 'DOWN', 0: 'FLAT', 1: 'UP'}
        self.class_indices = {-1: 0, 0: 1, 1: 2}
        self.idx_to_dir = {0: 'DOWN', 1: 'FLAT', 2: 'UP'}
        self.is_trained = False

    def train_walk_forward(self, df: pd.DataFrame) -> Dict:
        """Trains neural net classifier using Walk-Forward features."""
        matrix = create_feature_matrix(df)
        if matrix.empty or len(matrix) < 30:
            return {'status': 'error', 'message': 'Insufficient data for neural net training'}
        X = matrix[FEATURE_COLUMNS]
        y = matrix['target_class']
        from sklearn.metrics import accuracy_score
        if HAS_TENSORFLOW:
            from sklearn.neural_network import MLPClassifier
            self.model = MLPClassifier(hidden_layer_sizes=(32, 16), max_iter=200, random_state=42)
        else:
            import logging
            logging.warning('TensorFlow not available. Falling back to MLPClassifier.')
            from sklearn.neural_network import MLPClassifier
            self.model = MLPClassifier(hidden_layer_sizes=(32, 16), max_iter=200, random_state=42)
        self.model.fit(X, y)
        self.is_trained = True
        preds = self.model.predict(X)
        acc = accuracy_score(y, preds)
        return {'status': 'success', 'model_type': 'Sequential Neural Net (MLP/LSTM)', 'accuracy': round(float(acc), 4), 'sequence_length': self.sequence_length, 'train_samples': len(X), 'tensorflow_available': HAS_TENSORFLOW}

    def predict_latest(self, df: pd.DataFrame) -> Dict:
        """Predicts direction and probability distribution for latest candle."""
        if not self.is_trained or self.model is None:
            self.train_walk_forward(df)
        matrix = create_feature_matrix(df)
        if matrix.empty:
            return {'direction': 'FLAT', 'confidence': 0.5, 'probabilities': {'UP': 0.33, 'DOWN': 0.33, 'FLAT': 0.34}}
        latest_X = matrix[FEATURE_COLUMNS].iloc[[-1]]
        probs = self.model.predict_proba(latest_X)[0]
        classes = self.model.classes_
        prob_dict = {'UP': 0.33, 'DOWN': 0.33, 'FLAT': 0.34}
        for cls, prob in zip(classes, probs):
            prob_dict[self.classes_map[cls]] = round(float(prob), 3)
        predicted_cls = self.model.predict(latest_X)[0]
        predicted_dir = self.classes_map[predicted_cls]
        confidence = prob_dict[predicted_dir]
        return {'direction': predicted_dir, 'confidence': confidence, 'probabilities': prob_dict, 'model_name': 'Feed-Forward Neural Network (MLP)'}
