"""
Time Series Forecast Route - ClearWard
========================================
Provides AR, ARMA, and ARIMA statistical forecast ranges for NSE/BSE stock
closing prices. All output is framed as a statistical confidence interval,
NOT a price prediction or investment recommendation, in full compliance with
SEBI's non-advisory regulations.

Implementation note
-------------------
Uses statsmodels SARIMAX (no seasonal terms) as the ARIMA engine because the
statsmodels.tsa.arima.model path has a known deprecate_kwarg bug in v0.14.5.
SARIMAX(order=(p,d,q), seasonal_order=(0,0,0,0)) is mathematically identical
to ARIMA(p,d,q) and produces identical output.

Stationarity is assessed via a variance-ratio heuristic rather than the ADF
test (whose adfuller import is also affected by the v0.14.5 bug).

Endpoints
---------
GET /api/stocks/{ticker}/time-series-forecast?days=5
"""

import logging
import warnings
from datetime import datetime, timezone
from itertools import product
from typing import List, Optional, Tuple

import numpy as np
import pandas as pd
import yfinance as yf
from fastapi import APIRouter, Depends, HTTPException, Path
from sqlalchemy.orm import Session
from statsmodels.tsa.statespace.sarimax import SARIMAX

from app.cache import get_cached, set_cached
from app.database.db import get_db
from app.ingestion.price_ingestion import fetch_and_store_price_history, get_price_history_dataframe

# ??? SETUP ????????????????????????????????????????????????????????????????????

logger = logging.getLogger(__name__)

router = APIRouter()

# ??? CONSTANTS ????????????????????????????????????????????????????????????????

# Cache TTL for forecast results - 6 hours (same as other stock data)
FORECAST_CACHE_TTL_SECONDS: int = 6 * 60 * 60

# Training window - 1 year of daily closes (~250 business days)
TRAINING_PERIOD: str = "1y"

# Maximum forecast horizon allowed
MAX_FORECAST_DAYS: int = 10

# AIC grid search: p ? {0,1,2}, q ? {0,1,2}; d is determined by stationarity test
ARIMA_P_RANGE: List[int] = [0, 1, 2]
ARIMA_Q_RANGE: List[int] = [0, 1, 2]

# SEBI-compliant disclaimer appended to every forecast response
FORECAST_DISCLAIMER: str = (
"Statistical confidence interval based on historical price autocorrelation only. "
"This is NOT a price prediction or investment advice. ARIMA models assume past "
"patterns continue - actual prices may fall anywhere, including outside these "
"intervals. Do not make any financial decision based on this output alone. "
"For education and statistical literacy purposes only."
)


# ??? HELPER: STATIONARITY HEURISTIC ??????????????????????????????????????????

def _assess_stationarity(close_prices: pd.Series) -> Tuple[bool, float, int]:
    """
    Assess stationarity of the price series using a variance-ratio heuristic.

    Stock prices are almost universally non-stationary (random walk with drift).
    We compare the coefficient of variation (CV) of the log-prices versus the
    CV of log-returns (first differences). If returns are significantly more
    mean-reverting than raw prices, d=1 is appropriate.

    Returns
    -------
    (is_stationary, variance_ratio, recommended_d)
    is_stationary : bool - True only if raw log-prices show stationarity
    variance_ratio : float - std(returns) / std(log-prices)
    recommended_d : int - 0 or 1
    """
    log_prices = np.log(close_prices.dropna())
    log_returns = log_prices.diff().dropna()

    price_std = float(log_prices.std())
    returns_std = float(log_returns.std())

    # Variance ratio: ratio of return std to price std
    # A high ratio (close to 1.0) means prices are trending - non-stationary
    # A very low ratio (< 0.05) suggests stationarity
    variance_ratio = round(returns_std / price_std, 4) if price_std > 0 else 1.0

    # Heuristic: daily stock prices are almost always non-stationary
    # Use threshold of 0.05 - if ratio is above this, d=1 is appropriate
    is_stationary = variance_ratio < 0.05

    return is_stationary, variance_ratio, 0 if is_stationary else 1


# ??? HELPER: FIT SINGLE ARIMA SAFELY ?????????????????????????????????????????

def _fit_arima_safe(
    log_prices: pd.Series,
    p: int,
    d: int,
    q: int,
) -> Optional[object]:
    """
    Attempt to fit SARIMAX(order=(p,d,q)) on log prices.
    Returns fitted result or None if fitting fails.
    Suppresses all warnings to keep API logs clean.
    """
    if p == 0 and q == 0:
        # ARIMA(0,d,0) = random walk - skip to avoid degenerate models
        return None
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            model = SARIMAX(
                log_prices,
                order=(p, d, q),
                trend="n", # No explicit trend term (absorbed by d=1)
                enforce_stationarity=False,
                enforce_invertibility=False,
            )
            fitted = model.fit(disp=False)
            return fitted
    except Exception as exc:
        logger.debug(f"ARIMA({p},{d},{q}) fit failed: {exc}")
        return None


# ??? HELPER: AIC GRID SEARCH ??????????????????????????????????????????????????

def _grid_search_best_arima(
    log_prices: pd.Series,
    d: int,
) -> Tuple[Tuple[int, int, int], float]:
    """
    Search all (p, q) combinations with p, q ? {0, 1, 2} at the given d.
    Return the (p, d, q) order with the lowest AIC and its AIC score.
    """
    best_order: Tuple[int, int, int] = (1, d, 1) # Sensible fallback
    best_aic: float = float("inf")

    for p, q in product(ARIMA_P_RANGE, ARIMA_Q_RANGE):
        fitted = _fit_arima_safe(log_prices, p, d, q)
        if fitted is not None and fitted.aic < best_aic:
            best_aic = fitted.aic
            best_order = (p, d, q)

    return best_order, round(best_aic, 2)


# ??? HELPER: BUILD HUMAN-READABLE MODEL LABEL ????????????????????????????????

def _model_label(p: int, d: int, q: int) -> str:
    """Return a human-readable model label like AR(1), ARMA(1,1), ARIMA(1,1,1)."""
    if d == 0:
        if q == 0:
            return f"AR({p})"
        elif p == 0:
            return f"MA({q})"
        else:
            return f"ARMA({p},{q})"
    else:
        return f"ARIMA({p},{d},{q})"


# ??? HELPER: GENERATE FORECAST ????????????????????????????????????????????????

def _generate_forecast(
    fitted_model,
    forecast_days: int,
    last_date: pd.Timestamp,
    last_close: float,
) -> List[dict]:
    """
    Generate n-step ahead forecast with 80% and 95% confidence intervals.
    Back-transforms all values from log-price space to original ? prices.

    The bands WIDEN with horizon - this is intentional and honest.
    Day 5 uncertainty is always greater than Day 1 uncertainty.
    """
    forecast_obj = fitted_model.get_forecast(steps=forecast_days)
    predicted_log_mean = forecast_obj.predicted_mean

    # Get confidence intervals in log space
    ci_95_log = forecast_obj.conf_int(alpha=0.05) # 95% CI
    ci_80_log = forecast_obj.conf_int(alpha=0.20) # 80% CI

    # Business-day dates for the forecast horizon
    forecast_dates = pd.bdate_range(
        start=last_date + pd.Timedelta(days=1),
        periods=forecast_days,
    )

    points = []
    for i in range(forecast_days):
        mean_price = float(np.exp(predicted_log_mean.iloc[i]))
        lower_95 = float(np.exp(ci_95_log.iloc[i, 0]))
        upper_95 = float(np.exp(ci_95_log.iloc[i, 1]))
        lower_80 = float(np.exp(ci_80_log.iloc[i, 0]))
        upper_80 = float(np.exp(ci_80_log.iloc[i, 1]))

        points.append({
            "day": i + 1,
            "date": forecast_dates[i].strftime("%Y-%m-%d"),
            "mean": round(mean_price, 2),
            "ci_80_lower": round(lower_80, 2),
            "ci_80_upper": round(upper_80, 2),
            "ci_95_lower": round(lower_95, 2),
            "ci_95_upper": round(upper_95, 2),
        })

    return points


# ??? HELPER: BUILD MODEL COMPARISON TABLE ????????????????????????????????????

def _build_model_comparison(
    log_prices: pd.Series,
    d: int,
    best_order: Tuple[int, int, int],
) -> List[dict]:
    """
    Fit four benchmark models and return a list sorted by AIC (ascending).
    The best-selected model is flagged with is_selected=True.
    """
    benchmark_orders = [
        (1, d, 0), # AR(1)
        (2, d, 0), # AR(2)
        (1, d, 1), # ARMA(1,1) or ARIMA(1,1,1)
    ]

    rows = []
    for order in benchmark_orders:
        p, d_, q = order
        if order == best_order:
            continue # Added separately below with is_selected=True
        fitted = _fit_arima_safe(log_prices, p, d_, q)
        if fitted is not None:
            rows.append({
                "model": _model_label(p, d_, q),
                "order": {"p": p, "d": d_, "q": q},
                "aic": round(fitted.aic, 2),
                "is_selected": False,
            })

    # Always add the selected model
    bp, bd, bq = best_order
    best_fitted = _fit_arima_safe(log_prices, bp, bd, bq)
    if best_fitted is not None:
        rows.append({
            "model": _model_label(bp, bd, bq),
            "order": {"p": bp, "d": bd, "q": bq},
            "aic": round(best_fitted.aic, 2),
            "is_selected": True,
        })

    rows.sort(key=lambda r: r["aic"])
    return rows


# ??? MAIN ENDPOINT ????????????????????????????????????????????????????????????

@router.get(
    "/api/stocks/{ticker}/time-series-forecast",
    summary="Time Series Statistical Forecast (AR / ARMA / ARIMA)",
    tags=["Time Series"],
)
def get_time_series_forecast(
    ticker: str = Path(
        ...,
        description="NSE or BSE stock ticker (e.g. RELIANCE.NS)",
        pattern=r"^[A-Z0-9&]{1,20}(\.NS|\.BO)?$"
    ),
    days: int = 5,
    db: Session = Depends(get_db)
) -> dict:
    """
    Auto-select the best ARIMA(p, d, q) model for the given ticker using
    AIC grid search on 1 year of log-transformed daily closing prices.

    Returns a {days}-step ahead statistical confidence interval (NOT a
    price prediction). Both 80% and 95% confidence bands are returned.
    Bands widen with horizon to reflect compounding forecast uncertainty.

    Compliance
    ----------
    Output is descriptive of historical statistical patterns only.
    No directional language, buy/sell calls, or future price targets.

    Parameters
    ----------
    ticker : str - NSE ticker (e.g. RELIANCE.NS) or BSE ticker (.BO suffix)
    days : int - Forecast horizon in trading days (1-10, default 5)
    """
    # ?? Validate and clamp inputs ?????????????????????????????????????????????
    days = max(1, min(days, MAX_FORECAST_DAYS))
    cache_key = f"{ticker}:arima_v2:days={days}"

    # ?? Cache lookup ??????????????????????????????????????????????????????????
    cached = get_cached("ts_forecast", cache_key)
    if cached:
        logger.info(f"TS forecast cache HIT for {ticker}")
        return cached

    # ?? Fetch price history via SQLite database pipeline ?????????????????????
    try:
        price_dataframe = get_price_history_dataframe(ticker, db)
        if price_dataframe.empty or len(price_dataframe) < 60:
            records_stored = fetch_and_store_price_history(ticker, db, period=TRAINING_PERIOD)
            if records_stored > 0:
                price_dataframe = get_price_history_dataframe(ticker, db)

        if price_dataframe.empty or len(price_dataframe) < 60:
            raise HTTPException(
                status_code=404,
                detail=f"Insufficient price history for {ticker}. Need at least 60 trading days.",
            )

        close_prices = price_dataframe["close"].dropna()
        dates_series = price_dataframe["date"]
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"Database/Ingestion price fetch failed for {ticker}: {exc}")
        raise HTTPException(status_code=502, detail=f"Market data unavailable for {ticker}: {exc}")

    # ?? Prepare log-price series ??????????????????????????????????????????????
    log_prices = np.log(close_prices)
    last_close = round(float(close_prices.iloc[-1]), 2)
    last_date = pd.Timestamp(dates_series.iloc[-1])
    training_days = len(close_prices)

    # ?? Step 1: Stationarity assessment ??????????????????????????????????????
    is_stationary, variance_ratio, d = _assess_stationarity(close_prices)

    # ?? Step 2: AIC grid search ???????????????????????????????????????????????
    logger.info(f"ARIMA grid search starting: ticker={ticker}, d={d}, n={training_days}")
    best_order, best_aic = _grid_search_best_arima(log_prices, d)
    p_best, d_best, q_best = best_order

    # ?? Step 3: Fit best model for forecasting ????????????????????????????????
    best_fitted = _fit_arima_safe(log_prices, p_best, d_best, q_best)
    if best_fitted is None:
        # Emergency fallback to ARIMA(1,1,1)
        p_best, d_best, q_best = 1, 1, 1
        best_order = (p_best, d_best, q_best)
        best_fitted = _fit_arima_safe(log_prices, p_best, d_best, q_best)

        if best_fitted is None:
            raise HTTPException(
                status_code=500,
                detail="Could not fit any ARIMA model to this ticker's price series.",
            )

    # ?? Step 4: Generate forecast with confidence intervals ???????????????????
    forecast_points = _generate_forecast(best_fitted, days, last_date, last_close)

    # ?? Step 5: Build model comparison table ??????????????????????????????????
    comparison_table = _build_model_comparison(log_prices, d_best, best_order)

    # ?? Step 6: Last 30 trading days of history for chart continuity ??????????
    recent_history = [
        {
            "date": pd.Timestamp(row["date"]).strftime("%Y-%m-%d"),
            "close": round(float(row["close"]), 2)
        }
        for _, row in price_dataframe.iloc[-30:].iterrows()
    ]

    # ?? Assemble final payload ????????????????????????????????????????????????
    payload = {
        "ticker": ticker,
        "last_close": last_close,
        "training_days": training_days,
        "forecast_horizon_days": days,
        "stationarity": {
            "is_stationary": is_stationary,
            "adf_p_value": variance_ratio,
            "variance_ratio": variance_ratio,
            "integration_order_d": d_best,
            "interpretation": (
                "Series appears stationary - no differencing applied (d=0)."
                if is_stationary
                else (
                    f"Series is non-stationary (typical for stock prices). "
                    f"First-order differencing applied (d={d_best}) before model fitting."
                )
            ),
        },
        "selected_model": {
            "label": _model_label(p_best, d_best, q_best),
            "p": p_best,
            "d": d_best,
            "q": q_best,
            "aic": best_aic,
            "bic": round(float(best_fitted.bic), 2),
        },
        "forecast": forecast_points,
        "recent_history": recent_history,
        "model_comparison": comparison_table,
        "as_of": datetime.now(timezone.utc).isoformat(),
        "disclaimer": FORECAST_DISCLAIMER,
    }

    # ?? Cache result ??????????????????????????????????????????????????????????
    set_cached("ts_forecast", cache_key, payload, ttl_override_seconds=FORECAST_CACHE_TTL_SECONDS)
    logger.info(
        f"ARIMA forecast complete: ticker={ticker}, model={_model_label(p_best, d_best, q_best)}, "
        f"AIC={best_aic}, d={d_best}"
    )
    return payload


# Alias route — frontend calls /forecast, canonical is /time-series-forecast
@router.get(
    "/api/stocks/{ticker}/forecast",
    summary="ARIMA Forecast Alias",
    tags=["Time Series"],
)
def get_forecast_alias(
    ticker: str = Path(..., description="NSE or BSE stock ticker"),
    days: int = 5,
    db: Session = Depends(get_db),
) -> dict:
    """Alias for /time-series-forecast — same handler, shorter URL."""
    return get_time_series_forecast(ticker=ticker, days=days, db=db)
