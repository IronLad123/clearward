import unittest
import sys
from pathlib import Path
sys.path.append(str(Path(__file__).resolve().parent.parent))
import pandas as pd
import numpy as np
from app.ml.validation import WalkForwardSplitter

class TestWalkForwardLeakageAssertion(unittest.TestCase):

    def setUp(self):
        dates = pd.date_range(start='2024-01-01', periods=200, freq='D')
        self.df_clean = pd.DataFrame({'timestamp': dates, 'close': np.random.randn(200).cumsum() + 100})

        def test_valid_split_passes(self):
            splitter = WalkForwardSplitter(min_train_size=100, test_size=20, n_splits=3)
            folds = list(splitter.split(self.df_clean))
            self.assertGreater(len(folds), 0)

            def test_leaky_dataset_fails_assertion(self):
                splitter = WalkForwardSplitter(min_train_size=100, test_size=20, n_splits=3)
                train_idx = np.arange(0, 120)
                leaky_test_idx = np.arange(100, 140)
                with self.assertRaises(ValueError) as ctx:
                    splitter.assert_no_leakage(self.df_clean, train_idx, leaky_test_idx)
                    self.assertIn('Walk-Forward Leakage Violation Detected', str(ctx.exception))
                    if __name__ == '__main__':
                        unittest.main()
