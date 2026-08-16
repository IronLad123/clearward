import unittest
import sys
from unittest.mock import patch
from pathlib import Path
import pandas as pd
sys.path.append(str(Path(__file__).resolve().parent.parent))
from app.database.db import init_db, SessionLocal
from app.ingestion.price_ingestion import fetch_and_store_price_history, get_price_history_dataframe

class TestDataPipeline(unittest.TestCase):

    def setUp(self):
        init_db()
        self.db = SessionLocal()

        def tearDown(self):
            self.db.close()

            def test_price_history_ingestion_and_schema_validation(self):
                fixture = pd.DataFrame({'Open': [100.0, 101.0, 102.0, 101.5, 103.0], 'High': [101.0, 102.0, 103.0, 103.0, 104.0], 'Low': [99.0, 100.0, 101.0, 100.5, 102.0], 'Close': [100.5, 101.5, 102.5, 102.0, 103.5], 'Volume': [100000, 110000, 120000, 105000, 130000]}, index=pd.date_range('2026-01-01', periods=5, freq='B'))
                fixture.index.name = 'Date'
                with patch('app.ingestion.price_ingestion.yf.download', return_value=fixture):
                    count = fetch_and_store_price_history('TCS.NS', self.db, period='1mo')
                    self.assertGreater(count, 0)
                    df = get_price_history_dataframe('TCS.NS', self.db)
                    self.assertFalse(df.empty)
                    self.assertIn('close', df.columns)
                    self.assertIn('volume', df.columns)
                    self.assertEqual(df['close'].isnull().sum(), 0)
                    self.assertTrue((df['close'] > 0).all())
                    if __name__ == '__main__':
                        unittest.main()
