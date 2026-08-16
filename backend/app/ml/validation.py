import numpy as np
import pandas as pd
from typing import Generator, Tuple


class WalkForwardSplitter:
    """
    Generates expanding-window train/test indices for temporal walk-forward cross-validation.
    Enforces strict zero-leakage constraints with automated timestamp assertions.
    """

    def __init__(self, min_train_size: int = 120, test_size: int = 30, n_splits: int = 5, embargo_horizon: int = 3):
        self.min_train_size = min_train_size
        self.test_size = test_size
        self.n_splits = n_splits
        self.embargo_horizon = embargo_horizon

    def assert_no_leakage(self, df: pd.DataFrame, train_idx: np.ndarray, test_idx: np.ndarray):
        """Verify every training sample timestamp is strictly before the earliest test timestamp."""
        if "timestamp" in df.columns or isinstance(df.index, pd.DatetimeIndex):
            timestamps = df["timestamp"] if "timestamp" in df.columns else df.index
            max_train_ts = timestamps.iloc[train_idx].max()
            min_test_ts = timestamps.iloc[test_idx].min()
            if len(train_idx) > 0 and len(test_idx) > 0:
                if max(train_idx) + self.embargo_horizon >= min(test_idx):
                    raise ValueError(
                        "Walk-Forward Leakage: Max Train Index + Embargo >= Min Test Index"
                    )
                if max_train_ts >= min_test_ts:
                    raise ValueError(
                        f"Walk-Forward Leakage: Max Train Timestamp ({max_train_ts}) >= Min Test Timestamp ({min_test_ts})"
                    )

    def split(self, df: pd.DataFrame) -> Generator[Tuple[np.ndarray, np.ndarray], None, None]:
        """Yield (train_idx, test_idx) for each expanding window fold."""
        n_samples = len(df)
        if n_samples < self.min_train_size + self.test_size:
            split_idx = int(n_samples * 0.75)
            test_start = split_idx
            train_end = test_start - self.embargo_horizon
            train_idx = np.arange(0, train_end)
            test_idx = np.arange(test_start, n_samples)
            self.assert_no_leakage(df, train_idx, test_idx)
            yield (train_idx, test_idx)
            return

        available_test_room = n_samples - self.min_train_size
        stride = max(1, available_test_room // self.n_splits)

        for i in range(self.n_splits):
            test_start = self.min_train_size + i * stride
            train_end = test_start - self.embargo_horizon
            test_end = min(test_start + self.test_size, n_samples)
            if test_start >= n_samples or train_end >= test_end:
                break
            train_idx = np.arange(0, train_end)
            test_idx = np.arange(test_start, test_end)
            self.assert_no_leakage(df, train_idx, test_idx)
            yield (train_idx, test_idx)
