import unittest
import numpy as np
import pandas as pd
from fastapi.testclient import TestClient
from app.main import app
from app.routes.portfolio import (
    compute_portfolio_var_95,
    compute_portfolio_sharpe,
    compute_portfolio_max_drawdown,
)


class TestPortfolioAuditAPI(unittest.TestCase):

    def setUp(self):
        self.client = TestClient(app)

    def test_audit_portfolio_success(self):
        payload = {
            'holdings': [
                {'name': 'Parag Parikh Flexi Cap Fund', 'holding_type': 'mutual_fund', 'amount_inr': 250000, 'category': 'Flexi Cap', 'is_regular_plan': True},
                {'name': 'HDFC Top 100 Fund', 'holding_type': 'mutual_fund', 'amount_inr': 150000, 'category': 'Large Cap', 'is_regular_plan': False},
                {'name': 'RELIANCE.NS', 'holding_type': 'stock', 'amount_inr': 100000, 'category': 'Direct Stock', 'is_regular_plan': False}
            ]
        }
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

    def test_var_95_uses_fifth_percentile(self):
        """
        Verify VaR 95% is computed as the empirical 5th percentile of daily returns,
        NOT parametric normal (mean - 1.65 * std).
        """
        # Create a skewed return distribution with fat negative tail
        np.random.seed(42)
        normal_returns = np.random.normal(0.001, 0.01, 1000)
        # Add fat-tail negative shocks
        skewed_returns = np.concatenate([normal_returns, np.full(50, -0.08)])

        var_empirical = compute_portfolio_var_95(skewed_returns)
        mean_val = float(np.mean(skewed_returns))
        std_val = float(np.std(skewed_returns, ddof=1))
        var_parametric = mean_val - 1.65 * std_val

        expected_5th = float(np.percentile(skewed_returns, 5))
        self.assertAlmostEqual(var_empirical, round(expected_5th, 4), places=3)
        # On fat-tailed distribution, empirical 5th percentile differs significantly from normal parametric
        self.assertNotEqual(round(var_empirical, 2), round(var_parametric, 2))

    def test_sharpe_ratio_uses_annualized_returns(self):
        """
        Verify Sharpe ratio uses annualized returns by scaling daily excess Sharpe by sqrt(252).
        """
        np.random.seed(123)
        daily_returns = np.random.normal(0.0008, 0.012, 500)
        annualized_sharpe = compute_portfolio_sharpe(daily_returns, risk_free_rate_pct=6.5)

        # Sharpe ratio range check instead of hardcoded point value
        self.assertTrue(-1.0 < annualized_sharpe < 3.0, f"Sharpe {annualized_sharpe} out of range")

        # Verify annualization factor relationship
        rfr_daily = (6.5 / 100.0) / 252.0
        daily_sharpe = (np.mean(daily_returns) - rfr_daily) / np.std(daily_returns, ddof=1)
        expected_annualized = daily_sharpe * np.sqrt(252)
        self.assertAlmostEqual(annualized_sharpe, round(expected_annualized, 2), places=2)

    def test_max_drawdown_always_non_positive(self):
        """
        Verify max drawdown is always negative or zero.
        """
        rising_cum_returns = [100.0, 105.0, 110.0, 115.0, 120.0]
        dd_rising = compute_portfolio_max_drawdown(rising_cum_returns)
        self.assertEqual(dd_rising, 0.0)
        self.assertLessEqual(dd_rising, 0.0)

        volatile_cum_returns = [100.0, 120.0, 90.0, 110.0, 80.0]
        dd_volatile = compute_portfolio_max_drawdown(volatile_cum_returns)
        self.assertLess(dd_volatile, 0.0)
        # Peak was 120, trough was 80 -> (80-120)/120 = -33.33%
        self.assertAlmostEqual(dd_volatile, -33.33, places=1)


if __name__ == '__main__':
    unittest.main()
