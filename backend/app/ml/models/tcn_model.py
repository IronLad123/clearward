import torch
import torch.nn as nn
from torch.nn.utils import weight_norm
import pandas as pd
import numpy as np
from typing import Dict, Any
from app.ml.validation import WalkForwardSplitter
from app.ml.feature_engineering import FEATURE_COLUMNS, create_feature_matrix

class CausalConvBlock(nn.Module):
    def __init__(self, in_channels, out_channels, kernel_size, dilation, padding, dropout):
        super(CausalConvBlock, self).__init__()
        self.conv1 = weight_norm(nn.Conv1d(in_channels, out_channels, kernel_size,
                                           stride=1, padding=padding, dilation=dilation))
        self.relu1 = nn.ReLU()
        self.dropout1 = nn.Dropout(dropout)

        self.conv2 = weight_norm(nn.Conv1d(out_channels, out_channels, kernel_size,
                                           stride=1, padding=padding, dilation=dilation))
        self.relu2 = nn.ReLU()
        self.dropout2 = nn.Dropout(dropout)

        self.net = nn.Sequential(self.conv1, self.relu1, self.dropout1,
                                 self.conv2, self.relu2, self.dropout2)
        
        self.padding = padding
        self.downsample = nn.Conv1d(in_channels, out_channels, 1) if in_channels != out_channels else None
        self.relu = nn.ReLU()
        
    def forward(self, x):
        out = self.net(x)
        out = out[:, :, :-self.padding * 2] if self.padding > 0 else out
        res = x if self.downsample is None else self.downsample(x)
        return self.relu(out + res)

class TCNDirectionClassifier(nn.Module):
    """
    Temporal Convolutional Network for sequence modeling.
    
    Research basis: Bai, Kolter & Koltun (2018) 'An Empirical Evaluation of Generic 
    Convolutional and Recurrent Networks for Sequence Modeling' (arXiv:1803.01271).
    """
    def __init__(self, in_channels=16, n_classes=3, num_channels=[32,32,32], kernel_size=3, dropout=0.2):
        super(TCNDirectionClassifier, self).__init__()
        self.in_channels = in_channels
        self.n_classes = n_classes
        layers = []
        num_levels = len(num_channels)
        
        for i in range(num_levels):
            dilation_size = 2 ** i
            in_ch = in_channels if i == 0 else num_channels[i-1]
            out_ch = num_channels[i]
            padding = (kernel_size - 1) * dilation_size
            layers.append(CausalConvBlock(in_ch, out_ch, kernel_size, dilation=dilation_size,
                                          padding=padding, dropout=dropout))
            
        self.tcn = nn.Sequential(*layers)
        self.linear = nn.Linear(num_channels[-1], n_classes)

    def forward(self, x):
        out = self.tcn(x)
        out = self.linear(out[:, :, -1])
        return out

    def _create_sequences(self, X, y, seq_len=20):
        xs, ys = [], []
        for i in range(len(X) - seq_len):
            xs.append(X[i:i+seq_len])
            ys.append(y[i+seq_len])
        if len(xs) == 0:
            return np.array([]), np.array([])
        return np.stack(xs), np.array(ys)

    def train_walk_forward(self, df: pd.DataFrame) -> Dict[str, Any]:
        from sklearn.metrics import accuracy_score
        
        df_feats = create_feature_matrix(df)
        if len(df_feats) < 200:
            return {}
            
        X_raw = df_feats[FEATURE_COLUMNS].values
        y_raw = df_feats['target_class'].values + 1
        
        splitter = WalkForwardSplitter(min_train_size=200, test_size=40, n_splits=5)
        metrics = []
        
        for train_idx, test_idx in splitter.split(df_feats):
            X_train_raw, y_train_raw = X_raw[train_idx], y_raw[train_idx]
            X_test_raw, y_test_raw = X_raw[test_idx], y_raw[test_idx]
            
            X_train, y_train = self._create_sequences(X_train_raw, y_train_raw)
            X_test, y_test = self._create_sequences(X_test_raw, y_test_raw)
            if len(X_train) == 0 or len(X_test) == 0:
                continue
                
            X_train = np.transpose(X_train, (0, 2, 1))
            X_test = np.transpose(X_test, (0, 2, 1))
            
            tensor_X_train = torch.FloatTensor(X_train)
            tensor_y_train = torch.LongTensor(y_train)
            
            class_counts = np.bincount(y_train, minlength=self.n_classes)
            class_weights = 1.0 / (class_counts + 1e-6)
            class_weights = torch.FloatTensor(class_weights)
            
            criterion = nn.CrossEntropyLoss(weight=class_weights)
            optimizer = torch.optim.Adam(self.parameters(), lr=0.001)
            
            self.train()
            for epoch in range(30):
                optimizer.zero_grad()
                out = self(tensor_X_train)
                loss = criterion(out, tensor_y_train)
                loss.backward()
                optimizer.step()
                
            self.eval()
            with torch.no_grad():
                tensor_X_test = torch.FloatTensor(X_test)
                out = self(tensor_X_test)
                preds = torch.argmax(out, dim=1).numpy()
                acc = accuracy_score(y_test, preds)
                metrics.append(acc)
                
        return {
            "model": "tcn",
            "accuracy": np.mean(metrics) if metrics else 0.0,
            "splits": len(metrics)
        }

    def predict_latest(self, df: pd.DataFrame) -> dict:
        df_feats = create_feature_matrix(df)
        if len(df_feats) < 20:
            return {"direction": 0, "confidence": 0.0, "probabilities": [0,1,0], "model_name": "TCN"}
            
        X_raw = df_feats[FEATURE_COLUMNS].values[-20:]
        X_seq = np.transpose(np.expand_dims(X_raw, axis=0), (0, 2, 1))
        
        self.eval()
        with torch.no_grad():
            tensor_X = torch.FloatTensor(X_seq)
            out = self(tensor_X)
            probs = torch.softmax(out, dim=1)[0].numpy()
            
        pred_class = np.argmax(probs)
        confidence = float(probs[pred_class])
        
        return {
            "direction": int(pred_class - 1),
            "confidence": confidence,
            "probabilities": probs.tolist(),
            "model_name": "TCN"
        }

    def save(self, filepath: str):
        torch.save(self.state_dict(), filepath)

    def load(self, filepath: str):
        self.load_state_dict(torch.load(filepath, weights_only=True))
