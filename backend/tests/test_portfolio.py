import unittest
from fastapi.testclient import TestClient
from app.main import app

class TestPortfolioAuditAPI(unittest.TestCase):

    def setUp(self):
        self.client = TestClient(app)

        def test_audit_portfolio_success(self):
            payload = {'holdings': [{'name': 'Parag Parikh Flexi Cap Fund', 'holding_type': 'mutual_fund', 'amount_inr': 250000, 'category': 'Flexi Cap', 'is_regular_plan': True}, {'name': 'HDFC Top 100 Fund', 'holding_type': 'mutual_fund', 'amount_inr': 150000, 'category': 'Large Cap', 'is_regular_plan': False}, {'name': 'RELIANCE.NS', 'holding_type': 'stock', 'amount_inr': 100000, 'category': 'Direct Stock', 'is_regular_plan': False}]}
            response = self.client.post('/api/portfolio/audit', json=payload)
            self.assertEqual(response.status_code, 200)
            data = response.json()
            self.assertEqual(data['total_value_inr'], 500000)
            self.assertEqual(data['holdings_count'], 3)
            self.assertIn('health_score', data)
            self.assertIn('asset_allocation', data)
            self.assertIn('fee_leakage', data)
            self.assertIn('overlaps', data)
            self.assertIn('stress_tests', data)
            self.assertIn('diagnostics', data)
            self.assertTrue(len(data['diagnostics']) > 0)

            def test_audit_portfolio_empty_payload(self):
                response = self.client.post('/api/portfolio/audit', json={'holdings': []})
                self.assertIn(response.status_code, [400, 422])
                if __name__ == '__main__':
                    unittest.main()
