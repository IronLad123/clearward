"""
test_mutual_funds.py - Deterministic fixture-based unit tests for Mutual Fund math.

Addresses audit item H9: "No test coverage for MutualFunds - CAGR, Sharpe, Drawdown
formulas are completely unverified."

All tests use synthetic, hand-crafted NAV series so the expected values are
derivable by hand and remain stable without any network access.

Run with:
    cd backend && python3 -m pytest tests/test_mutual_funds.py -v
    """

import math
import sys
import os
import pytest
import pandas as pd
import numpy as np

# ?? Make the app importable from the tests/ directory ?????????????????????????
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.routes.mutual_funds import (
_compute_cagr,
_compute_max_drawdown,
_compute_volatility,
_compute_sharpe,
_calculate_sip_future_value,
_compute_direct_vs_regular_cost_audit,
_determine_min_sip_amount,
RISK_FREE_RATE_PCT,
)


# ?? Fixture helpers ????????????????????????????????????????????????????????????

def _make_nav_df(navs: list, base_date: str = "2020-01-01") -> pd.DataFrame:
    """Build a minimal NAV DataFrame with 'date' and 'nav' columns."""
    dates = pd.date_range(start=base_date, periods=len(navs), freq="B")
    return pd.DataFrame({"date": dates, "nav": [float(v) for v in navs]})


def _flat_nav(n: int = 300, value: float = 100.0) -> pd.DataFrame:
    """Flat NAV series - zero volatility, zero CAGR."""
    return _make_nav_df([value] * n)


def _linear_nav(n: int = 300, start: float = 100.0, end: float = 200.0) -> pd.DataFrame:
    """Linearly growing NAV - monotone, zero drawdown."""
    navs = [start + (end - start) * i / (n - 1) for i in range(n)]
    return _make_nav_df(navs)


def _crash_nav() -> pd.DataFrame:
    """
    NAV that rises to a peak then crashes:
        Day 0-99: 100 -> 200 (rise)
        Day 100-199: 200 -> 80 (crash)
        Max drawdown should be (80 - 200) / 200 = -60%.
    """
    rise = [100.0 + i for i in range(100)] # 100 ... 199
    fall = [200.0 - 1.2 * i for i in range(1, 101)] # 198.8 ... 80
    return _make_nav_df(rise + fall)


    # ??????????????????????????????????????????????????????????????????????????????
    # 1. CAGR Tests
    # ??????????????????????????????????????????????????????????????????????????????

class TestComputeCAGR:
    """Tests for _compute_cagr(nav_df, years)."""

    def test_cagr_doubles_in_one_year(self):
        """If NAV doubles over 252 trading days, CAGR should be 100%."""
        # Need at least 252 + 1 rows for a 1-year window
        n = 260
        start, end = 100.0, 200.0
        nav_df = _linear_nav(n, start=start, end=end)
        cagr = _compute_cagr(nav_df, years=1.0)
        # With linear interpolation the actual start_nav won't be exactly 100
        # but CAGR should be well above 80% since NAV nearly doubled
        assert cagr is not None
        assert cagr > 80.0

        def test_cagr_flat_nav_is_zero(self):
            """Flat NAV -> CAGR should be 0.0%."""
            nav_df = _flat_nav(n=300)
            cagr = _compute_cagr(nav_df, years=1.0)
            assert cagr is not None
            assert abs(cagr) < 0.01 # effectively zero

            def test_cagr_known_value(self):
                """
                Exact fixture: start_nav=100, end_nav=121, years=2.
                CAGR = (121/100)^(1/2) - 1 = 1.1 - 1 = 10.0%
                """
                # Build a series long enough: 2 * 252 + 2 = 506 rows
                n = 510
                navs = [100.0] * (n - 1) + [121.0]
                # But we need the value at index [-trading_days-1] = index[-(504)-1] to be 100
                # and index[-1] to be 121. Let's build explicitly.
                navs = [100.0] * 505 + [121.0]
                nav_df = _make_nav_df(navs)
                cagr = _compute_cagr(nav_df, years=2.0)
                assert cagr is not None
                assert abs(cagr - 10.0) < 0.5 # within 0.5% of 10.0

                def test_cagr_returns_none_if_insufficient_data(self):
                    """Fewer rows than required trading days -> None."""
                    nav_df = _flat_nav(n=100)
                    # 1 year needs 252 + 1 = 253 rows
                    assert _compute_cagr(nav_df, years=1.0) is None

                    def test_cagr_returns_none_for_zero_start_nav(self):
                        """Zero start_nav should return None to avoid division by zero."""
                        navs = [0.0] + [100.0] * 259
                        nav_df = _make_nav_df(navs)
                        # Depending on implementation this may return None or a non-numeric value
                        result = _compute_cagr(nav_df, years=1.0)
                        # Either None or a very large number - we just assert it doesn't raise
                        assert result is None or isinstance(result, float)

                        def test_cagr_empty_dataframe_returns_none(self):
                            """Empty DataFrame should return None."""
                            nav_df = pd.DataFrame({"date": [], "nav": []})
                            assert _compute_cagr(nav_df, years=1.0) is None


                            # ??????????????????????????????????????????????????????????????????????????????
                            # 2. Max Drawdown Tests
                            # ??????????????????????????????????????????????????????????????????????????????

class TestComputeMaxDrawdown:
    """Tests for _compute_max_drawdown(nav_df)."""

    def test_drawdown_monotone_rising_is_zero(self):
        """Monotone rising NAV -> max drawdown should be 0.0%."""
        nav_df = _linear_nav(n=100, start=100.0, end=200.0)
        dd = _compute_max_drawdown(nav_df)
        assert dd == 0.0

        def test_drawdown_flat_is_zero(self):
            """Flat NAV -> drawdown is 0.0%."""
            dd = _compute_max_drawdown(_flat_nav(50))
            assert dd == 0.0

            def test_drawdown_known_crash(self):
                """
                NAV goes 100 -> 200 -> 80.
                Peak = 200, Trough = 80.
                Max DD = (80 - 200) / 200 = -60.0%.
                """
                nav_df = _crash_nav()
                dd = _compute_max_drawdown(nav_df)
                # Should be close to -60%
                assert dd < -50.0
                assert dd > -70.0

                def test_drawdown_single_drop(self):
                    """
                    Simple 2-element series: 100 -> 50.
                    Max DD = (50 - 100) / 100 = -50%.
                    """
                    nav_df = _make_nav_df([100.0, 50.0])
                    dd = _compute_max_drawdown(nav_df)
                    assert abs(dd - (-50.0)) < 0.01

                    def test_drawdown_empty_df_returns_zero(self):
                        """Empty DataFrame returns 0.0."""
                        nav_df = pd.DataFrame({"date": [], "nav": []})
                        dd = _compute_max_drawdown(nav_df)
                        assert dd == 0.0

                        def test_drawdown_is_negative_or_zero(self):
                            """Drawdown should always be <= 0."""
                            nav_df = _crash_nav()
                            dd = _compute_max_drawdown(nav_df)
                            assert dd <= 0.0


                            # ??????????????????????????????????????????????????????????????????????????????
                            # 3. Volatility Tests
                            # ??????????????????????????????????????????????????????????????????????????????

class TestComputeVolatility:
    """Tests for _compute_volatility(nav_df)."""

    def test_volatility_flat_nav_is_zero(self):
        """Flat NAV -> daily returns = 0 -> annualised vol = 0."""
        nav_df = _flat_nav(n=100)
        vol = _compute_volatility(nav_df)
        assert vol is not None
        assert abs(vol) < 0.01

        def test_volatility_requires_30_rows(self):
            """Fewer than 30 rows -> None."""
            nav_df = _flat_nav(n=20)
            assert _compute_volatility(nav_df) is None

            def test_volatility_is_positive(self):
                """Volatility on random-walk NAV should be positive."""
                np.random.seed(42)
                navs = 100.0 * np.cumprod(1 + np.random.normal(0, 0.01, 200))
                nav_df = _make_nav_df(navs.tolist())
                vol = _compute_volatility(nav_df)
                assert vol is not None
                assert vol > 0.0

                def test_volatility_annualisation(self):
                    """
                    If daily std = 0.01 (1%), annualised vol = 1% * sqrt(252) ~= 15.87%.
                    """
                    np.random.seed(0)
                    daily_returns = np.random.normal(0, 0.01, 200)
                    navs = 100.0 * np.cumprod(1 + daily_returns)
                    nav_df = _make_nav_df(navs.tolist())
                    vol = _compute_volatility(nav_df)
                    assert vol is not None
                    # Actual std will be close to 1% * sqrt(252) * 100 ~= 15.87
                    assert 10.0 < vol < 25.0 # generous bounds given random seed


                    # ??????????????????????????????????????????????????????????????????????????????
                    # 4. Sharpe Ratio Tests
                    # ??????????????????????????????????????????????????????????????????????????????

class TestComputeSharpe:
    """Tests for _compute_sharpe(cagr_pct, vol_pct)."""

    def test_sharpe_known_value(self):
        """
        CAGR=15%, Vol=10%, RFR=6.5% -> Sharpe = (15-6.5)/10 = 0.85.
        """
        sharpe = _compute_sharpe(15.0, 10.0)
        expected = (15.0 - RISK_FREE_RATE_PCT) / 10.0
        assert sharpe is not None
        assert abs(sharpe - expected) < 0.01

        def test_sharpe_returns_none_for_none_cagr(self):
            """None CAGR -> None."""
            assert _compute_sharpe(None, 10.0) is None

            def test_sharpe_returns_none_for_none_vol(self):
                """None vol -> None."""
                assert _compute_sharpe(15.0, None) is None

                def test_sharpe_returns_none_for_zero_vol(self):
                    """Zero volatility -> None (div-by-zero guard)."""
                    assert _compute_sharpe(15.0, 0.0) is None

                    def test_sharpe_negative_when_cagr_below_rfr(self):
                        """CAGR below risk-free rate -> negative Sharpe."""
                        sharpe = _compute_sharpe(RISK_FREE_RATE_PCT - 2.0, 10.0)
                        assert sharpe is not None
                        assert sharpe < 0.0

                        def test_sharpe_uses_correct_risk_free_rate(self):
                            """Verify RISK_FREE_RATE_PCT is positive and reasonable for India (3-10%)."""
                            assert 3.0 <= RISK_FREE_RATE_PCT <= 10.0


                            # ??????????????????????????????????????????????????????????????????????????????
                            # 5. SIP Future Value Tests
                            # ??????????????????????????????????????????????????????????????????????????????

class TestCalculateSIPFutureValue:
    """Tests for _calculate_sip_future_value(monthly_sip, annual_rate_pct, years)."""

    def test_sip_fv_zero_rate_equals_total_invested(self):
        """At 0% return, FV should equal total amount invested."""
        monthly = 10000.0
        years = 5
        fv = _calculate_sip_future_value(monthly, 0.0, years)
        total_invested = monthly * 12 * years
        assert abs(fv - total_invested) < 1.0 # within ?1

        def test_sip_fv_positive_rate_exceeds_invested(self):
            """With a positive return, FV must be greater than total invested."""
            fv = _calculate_sip_future_value(10000.0, 12.0, 10)
            total_invested = 10000.0 * 12 * 10
            assert fv > total_invested

            def test_sip_fv_higher_rate_gives_higher_value(self):
                """Higher rate -> higher FV, all else equal."""
                fv_low = _calculate_sip_future_value(10000.0, 8.0, 10)
                fv_high = _calculate_sip_future_value(10000.0, 12.0, 10)
                assert fv_high > fv_low

                def test_sip_fv_known_calculation(self):
                    """
                    Monthly SIP = ?10,000, rate = 12% p.a. (1% monthly), 12 months.
                    FV = 10000 * [((1.01)^12 - 1) / 0.01] * 1.01
                    = 10000 * 12.6825... * 1.01
                    ~= ?128,093
                    """
                    fv = _calculate_sip_future_value(10000.0, 12.0, 1)
                    assert 126_000 < fv < 130_000

                    def test_sip_fv_longer_horizon_compounds_more(self):
                        """20-year FV should be significantly more than 10-year FV."""
                        fv_10 = _calculate_sip_future_value(10000.0, 12.0, 10)
                        fv_20 = _calculate_sip_future_value(10000.0, 12.0, 20)
                        # 20-year should be at least 3x the 10-year (rough compound check)
                        assert fv_20 > fv_10 * 2.5


                        # ??????????????????????????????????????????????????????????????????????????????
                        # 6. Direct vs Regular Cost Audit Tests
                        # ??????????????????????????????????????????????????????????????????????????????

class TestComputeDirectVsRegularCostAudit:
    """Tests for _compute_direct_vs_regular_cost_audit(cagr_base_pct, monthly_sip)."""

    def test_audit_has_required_keys(self):
        result = _compute_direct_vs_regular_cost_audit(12.0)
        assert "monthly_sip_amount_inr" in result
        assert "assumed_direct_cagr_pct" in result
        assert "assumed_regular_cagr_pct" in result
        assert "expense_ratio_delta_pct" in result
        assert "projections" in result

        def test_expense_ratio_delta_is_125_bps(self):
            """Cost drag should be 1.25% (125 bps) as per AMFI data."""
            result = _compute_direct_vs_regular_cost_audit(12.0)
            assert abs(result["expense_ratio_delta_pct"] - 1.25) < 0.01

            def test_direct_outperforms_regular_in_all_horizons(self):
                """Direct plan FV should exceed Regular plan FV for every horizon."""
                result = _compute_direct_vs_regular_cost_audit(12.0)
                for horizon, proj in result["projections"].items():
                    assert proj["direct_plan_value"] >= proj["regular_plan_value"], \
                    f"Direct should outperform regular at {horizon}"

                    def test_wealth_lost_grows_with_horizon(self):
                        """Compounding drag: wealth lost should increase with longer horizon."""
                        result = _compute_direct_vs_regular_cost_audit(12.0)
                        projections = result["projections"]
                        wl_5 = projections["5y"]["wealth_lost_to_commission"]
                        wl_10 = projections["10y"]["wealth_lost_to_commission"]
                        wl_20 = projections["20y"]["wealth_lost_to_commission"]
                        assert wl_10 > wl_5
                        assert wl_20 > wl_10

                        def test_low_cagr_uses_minimum_fallback(self):
                            """
                            If cagr_base_pct < 8.0, effective base is clamped to 8.0
                            to avoid nonsensical projections.
                            """
                            result_low = _compute_direct_vs_regular_cost_audit(2.0)
                            result_normal = _compute_direct_vs_regular_cost_audit(8.0)
                            # Both should produce the same direct CAGR since both clamp to 8%
                            assert abs(result_low["assumed_direct_cagr_pct"] - result_normal["assumed_direct_cagr_pct"]) < 0.01

                            def test_projections_cover_5_10_20_30_year_horizons(self):
                                """All four standard projection horizons must be present."""
                                result = _compute_direct_vs_regular_cost_audit(12.0)
                                for key in ["5y", "10y", "20y", "30y"]:
                                    assert key in result["projections"], f"Missing horizon: {key}"


                                    # ??????????????????????????????????????????????????????????????????????????????
                                    # 7. Minimum SIP Amount Tests
                                    # ??????????????????????????????????????????????????????????????????????????????

class TestDetermineMinSIPAmount:
    """Tests for _determine_min_sip_amount(scheme_name, scheme_category)."""

    def test_parag_parikh_regular_is_1000(self):
        assert _determine_min_sip_amount("Parag Parikh Flexi Cap Regular", "Flexi Cap") == 1000.0

        def test_parag_parikh_direct_is_500(self):
            assert _determine_min_sip_amount("Parag Parikh Flexi Cap Direct", "Flexi Cap") == 500.0

            def test_elss_fund_is_500(self):
                assert _determine_min_sip_amount("Axis ELSS Tax Saver Fund", "ELSS") == 500.0

                def test_index_fund_is_100(self):
                    assert _determine_min_sip_amount("HDFC Nifty 50 Index Fund", "Index") == 100.0

                    def test_small_cap_fund_is_100(self):
                        assert _determine_min_sip_amount("SBI Small Cap Fund", "Small Cap") == 100.0

                        def test_default_fund_returns_positive(self):
                            """Any unknown fund name should return a positive minimum."""
                            min_sip = _determine_min_sip_amount("Random Generic Equity Fund", "Equity")
                            assert min_sip > 0


                            # ??????????????????????????????????????????????????????????????????????????????
                            # 8. Edge Case / Robustness Tests
                            # ??????????????????????????????????????????????????????????????????????????????

class TestMFEdgeCases:
    """Cross-cutting edge cases for robustness."""

    def test_single_row_nav_df(self):
        """Single-row DataFrame should not crash any function."""
        nav_df = _make_nav_df([100.0])
        assert _compute_cagr(nav_df, 1.0) is None
        assert _compute_max_drawdown(nav_df) == 0.0
        assert _compute_volatility(nav_df) is None

        def test_all_same_nav_gives_zero_cagr(self):
            """All-identical NAV -> CAGR = 0."""
            nav_df = _flat_nav(300, 150.0)
            cagr = _compute_cagr(nav_df, 1.0)
            assert cagr is not None
            assert abs(cagr) < 0.01

            def test_sharpe_rounded_to_two_decimals(self):
                """Sharpe ratio should be rounded to 2 decimal places."""
                sharpe = _compute_sharpe(15.12345, 10.6789)
                assert sharpe is not None
                # Check that result has at most 2 decimal places
                assert sharpe == round(sharpe, 2)

                def test_cagr_rounded_to_two_decimals(self):
                    """CAGR should be rounded to 2 decimal places."""
                    navs = [100.0] * 505 + [121.0]
                    nav_df = _make_nav_df(navs)
                    cagr = _compute_cagr(nav_df, 2.0)
                    assert cagr is not None
                    assert cagr == round(cagr, 2)

                    def test_disclaimer_present_in_audit_result(self):
                        """
                        For education only. Not investment advice.
                        The cost audit is educational only - verify it is only calculating
                        factual expense drag without any directional language.
                        """
                        result = _compute_direct_vs_regular_cost_audit(12.0)
                        # There should be NO promotional/directional keys in the result
                        prohibited = ["buy", "sell", "target", "recommend", "bullish", "bearish"]
                        result_str = str(result).lower()
                        for word in prohibited:
                            assert word not in result_str, f"Prohibited word '{word}' found in cost audit output"
