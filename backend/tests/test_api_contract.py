import unittest
import sys
from pathlib import Path
sys.path.append(str(Path(__file__).resolve().parent.parent))
from fastapi.testclient import TestClient
from app.main import app
from app.database.db import init_db

class TestAPIContract(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        init_db()
        cls.client = TestClient(app)

        def test_health_check(self):
            res = self.client.get('/health')
            self.assertEqual(res.status_code, 200)
            self.assertEqual(res.json()['status'], 'healthy')

            def test_market_summary_contract(self):
                res = self.client.get('/api/market/summary')
                self.assertEqual(res.status_code, 200)
                data = res.json()
                self.assertIn('market_status', data)
                self.assertIn('indices', data)

                def test_stock_search_contract(self):
                    res = self.client.get('/api/stocks/search?q=Tata')
                    self.assertEqual(res.status_code, 200)
                    data = res.json()
                    self.assertIsInstance(data, list)
                    self.assertGreater(len(data), 0)

                    def test_stock_signals_contract(self):
                        res = self.client.get('/api/stocks/TCS.NS/signals')
                        self.assertEqual(res.status_code, 200)
                        data = res.json()
                        self.assertIn('signals', data)
                        self.assertIn('close_price', data)

                        def test_stock_prediction_contract(self):
                            res = self.client.get('/api/stocks/TCS.NS/predict')
                            self.assertEqual(res.status_code, 200)
                            data = res.json()
                            self.assertIn('primary_prediction', data)
                            self.assertIn('direction', data['primary_prediction'])

                            def test_stock_explanation_contract(self):
                                res = self.client.get('/api/stocks/TCS.NS/explanation')
                                self.assertEqual(res.status_code, 200)
                                data = res.json()
                                self.assertIn('grounding_score', data)
                                self.assertIn('citations', data)

                                def test_stock_compare_contract(self):
                                    res = self.client.get('/api/stocks/compare?symbols=TCS.NS,INFY.NS')
                                    self.assertEqual(res.status_code, 200)
                                    data = res.json()
                                    self.assertEqual(data['count'], 2)
                                    item = data['comparison'][0]
                                    self.assertIn('company_name', item)
                                    self.assertIn('price_chg_5d_pct', item)
                                    self.assertIn('price_chg_20d_pct', item)
                                    self.assertIn('volume_ratio', item)
                                    self.assertIn('hype_score', item)
                                    self.assertIn('verdict_label', item)
                                    if __name__ == '__main__':
                                        unittest.main()
