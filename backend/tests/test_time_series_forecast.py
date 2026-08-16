"""
test_time_series_forecast.py — Integration and Unit Tests for ARIMA Time Series Forecast API.
"""

import unittest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

REQUIRED_TOP_LEVEL_KEYS = [
    "ticker",
    "forecast",
    "model_comparison",
    "selected_model",
    "stationarity",
    "disclaimer",
]

REQUIRED_STATIONARITY_KEYS = [
    "adf_p_value",
    "is_stationary",
    "variance_ratio",
    "integration_order_d",
]


class TestTimeSeriesForecastAPI(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        res = client.get("/api/stocks/RELIANCE.NS/forecast")
        cls._default_res = res
        cls._default_data = res.json() if res.status_code == 200 else {}

    def test_endpoint_returns_200(self):
        self.assertEqual(self._default_res.status_code, 200)

    def test_response_has_required_keys(self):
        data = self._default_data
        for key in REQUIRED_TOP_LEVEL_KEYS:
            with self.subTest(key=key):
                self.assertIn(key, data)

    def test_forecast_has_correct_length(self):
        forecast = self._default_data.get("forecast", [])
        self.assertEqual(len(forecast), 5)

    def test_custom_days_param(self):
        res = client.get("/api/stocks/RELIANCE.NS/forecast?days=3")
        self.assertEqual(res.status_code, 200)
        forecast = res.json().get("forecast", [])
        self.assertEqual(len(forecast), 3)

    def test_confidence_intervals_ordered(self):
        forecast = self._default_data.get("forecast", [])
        self.assertTrue(len(forecast) > 0)
        for i, point in enumerate(forecast):
            with self.subTest(day=point.get("day", i + 1)):
                ci_95_lo = point["ci_95_lower"]
                ci_80_lo = point["ci_80_lower"]
                mean = point["mean"]
                ci_80_hi = point["ci_80_upper"]
                ci_95_hi = point["ci_95_upper"]
                self.assertLessEqual(ci_95_lo, ci_80_lo)
                self.assertLessEqual(ci_80_lo, mean)
                self.assertLessEqual(mean, ci_80_hi)
                self.assertLessEqual(ci_80_hi, ci_95_hi)

    def test_disclaimer_present(self):
        disclaimer = self._default_data.get("disclaimer", "")
        self.assertIsInstance(disclaimer, str)
        self.assertTrue(len(disclaimer) > 0)

    def test_stationarity_has_required_keys(self):
        stationarity = self._default_data.get("stationarity", {})
        for key in REQUIRED_STATIONARITY_KEYS:
            with self.subTest(key=key):
                self.assertIn(key, stationarity)


if __name__ == "__main__":
    unittest.main()
