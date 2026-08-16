"""
hype_and_health.py - Hype Score & Behavioral Market Context API Routes.

Features:
    1. Hype Score (GET /api/hype-score/{ticker}):
        - Flags unusual/manipulative price-volume patterns.
        - Computes volume anomaly, price-volume divergence, RSI-14 overbought,
        5-day & 20-day returns, and P/E vs sector average comparison.
        - Includes stub field for promoter pledging (out of scope for v1).
        - Maps factors to composite score (0-100) and verdict label: SAFE / CAUTION / RED FLAG.
        - Strict Compliance Rule: Factual descriptive language ONLY. NO directional calls
        ("bullish", "bearish", "buy", "sell") or future price predictions.

        2. Market Context (GET /api/market-context):
            - Fetches ^INDIAVIX from yfinance (cached for 15 mins).
            - Returns current India VIX level and elevated boolean flag (True if VIX > 20.0).

            All endpoints fail open gracefully and include persistent educational disclaimers.
            """

import re
import logging
from datetime import datetime, timezone
from typing import Dict, Any, Optional

import numpy as np
import pandas as pd
import yfinance as yf
from fastapi import APIRouter, HTTPException, Path

from app.cache import get_cached, set_cached
from app.signals.indicators import calculate_rsi

logger = logging.getLogger(__name__)

router = APIRouter()

# ─── CONSTANTS & STATIC MAPPINGS ──────────────────────────────────────────────

DISCLAIMER_TEXT = (
    "For education only. Not investment advice. Describes pattern metrics only; "
    "does not predict price direction or make trade recommendations."
)

# Benchmark sector average P/E ratios for Indian equity market (NSE/BSE)
SECTOR_PE_BENCHMARKS: Dict[str, float] = {
    "IT Services": 26.0,
    "Technology": 26.0,
    "Banking": 18.0,
    "Financial Services": 18.0,
    "Energy": 15.0,
    "Oil & Gas": 15.0,
    "Healthcare": 32.0,
    "Pharmaceuticals": 32.0,
    "Automobile": 24.0,
    "Consumer Goods": 42.0,
    "FMCG": 42.0,
    "Metals & Mining": 12.0,
    "Basic Materials": 15.0,
    "General": 20.0,  # Default benchmark fallback
}


# ─── HELPER FUNCTIONS ──────────────────────────────────────────────────────────

def _get_sector_benchmark_pe(sector_name: Optional[str]) -> float:
    """Resolve sector name to benchmark P/E average."""
    if not sector_name:
        return SECTOR_PE_BENCHMARKS["General"]

    for key, val in SECTOR_PE_BENCHMARKS.items():
        if key.lower() in sector_name.lower():
            return val
    return SECTOR_PE_BENCHMARKS["General"]


def _calculate_hype_score_data(ticker_symbol: str) -> Dict[str, Any]:
    """
    Fetch market data via yfinance (with cache) and calculate composite Hype Score.
    """
    clean_symbol = ticker_symbol.strip().upper()

    # 1. Download price history (1 month for 20 trading days calculation)
    cache_key = f"hype_calc:{clean_symbol}"
    cached_result = get_cached("stock_signals", cache_key)
    if cached_result is not None:
        return cached_result

    try:
        # Download OHLCV candles (3mo period is valid for yfinance)
        df = yf.download(clean_symbol, period="3mo", interval="1d", auto_adjust=True, progress=False)

        if df.empty or len(df) < 14:
            raise ValueError(f"Insufficient price history data for ticker {clean_symbol}")

        if isinstance(df.columns, pd.MultiIndex):
            df.columns = df.columns.get_level_values(0)

        df = df.reset_index()
        df.columns = [col.lower() for col in df.columns]

    except Exception as exc:
        logger.error("Failed to fetch price history for %s: %s", clean_symbol, exc)
        raise HTTPException(
            status_code=503,
            detail=f"Unable to retrieve market data for ticker {clean_symbol}. Please try again."
        )

    # 2. Fetch stock info metadata for P/E & Sector
    try:
        ticker_obj = yf.Ticker(clean_symbol)
        info = ticker_obj.info or {}
    except Exception as exc:
        logger.warning("Failed to fetch ticker info for %s: %s", clean_symbol, exc)
        info = {}

    close_series = df["close"]
    volume_series = df["volume"]

    latest_close = float(close_series.iloc[-1])
    latest_volume = float(volume_series.iloc[-1])

    # Calculate 20-day average volume
    vol_20d_avg = float(volume_series.tail(20).mean()) if len(volume_series) >= 20 else float(volume_series.mean())
    vol_ratio = round(latest_volume / max(vol_20d_avg, 1.0), 2)

    # Daily traded value in ₹ Crore (1 Crore = 10,000,000)
    daily_traded_value_inr = (latest_close * latest_volume) / 10000000.0

    # Calculate RSI-14
    rsi_series = calculate_rsi(close_series, period=14)
    latest_rsi = round(float(rsi_series.iloc[-1]), 1)

    # Trailing price changes
    price_chg_5d_pct = 0.0
    if len(close_series) >= 6:
        close_5d_ago = float(close_series.iloc[-6])
        if close_5d_ago > 0:
            price_chg_5d_pct = round(((latest_close - close_5d_ago) / close_5d_ago) * 100.0, 2)

    price_chg_20d_pct = 0.0
    if len(close_series) >= 21:
        close_20d_ago = float(close_series.iloc[-21])
        if close_20d_ago > 0:
            price_chg_20d_pct = round(((latest_close - close_20d_ago) / close_20d_ago) * 100.0, 2)

    # Price-volume divergence check
    pv_divergence_flag = False
    pv_divergence_desc = "Price and volume trend alignment normal."

    if price_chg_5d_pct > 3.0 and vol_ratio < 0.7:
        pv_divergence_flag = True
        pv_divergence_desc = (
            f"Price increased +{price_chg_5d_pct}% over 5 days while daily volume dropped to "
            f"{vol_ratio}x of 20-day average (volume unconfirmed rally)."
        )
    elif vol_ratio >= 3.0 and abs(price_chg_5d_pct) < 1.5:
        pv_divergence_flag = True
        pv_divergence_desc = (
            f"Unusual volume spike ({vol_ratio}x 20-day average) without significant price movement "
            f"({price_chg_5d_pct}% over 5 days)."
        )
    elif price_chg_5d_pct > 15.0 and vol_ratio > 3.0:
        pv_divergence_flag = True
        pv_divergence_desc = (
            f"Simultaneous price surge (+{price_chg_5d_pct}% in 5d) and volume spike ({vol_ratio}x average)."
        )

    # P/E Evaluation
    trailing_pe = info.get("trailingPE") or info.get("forwardPE")
    sector_name = info.get("sector") or info.get("industry") or "General"
    benchmark_pe = _get_sector_benchmark_pe(sector_name)

    pe_ratio_vs_sector = None
    pe_desc = f"Trailing P/E unavailable. Sector average benchmark: {benchmark_pe:.1f}x."
    if trailing_pe and trailing_pe > 0:
        trailing_pe = round(float(trailing_pe), 2)
        pe_ratio_vs_sector = round(trailing_pe / benchmark_pe, 2)
        pe_desc = (
            f"Trailing P/E is {trailing_pe:.1f}x vs {sector_name} sector average of {benchmark_pe:.1f}x "
            f"({pe_ratio_vs_sector:.1f}x sector multiple)."
        )

    # ─── COMPOSITE HYPE SCORE SCORECARD (0 to 100 points) ─────────────────────
    factor_points = 0
    factors_breakdown = []

    # 1. Volume Anomaly Factor
    vol_points = 0
    if vol_ratio >= 5.0:
        vol_points = 30
        vol_text = f"Extreme volume anomaly: Today's volume is {vol_ratio}x the 20-day average."
    elif vol_ratio >= 3.0:
        vol_points = 20
        vol_text = f"High volume anomaly: Today's volume is {vol_ratio}x the 20-day average."
    elif vol_ratio >= 2.0:
        vol_points = 10
        vol_text = f"Elevated volume: Today's volume is {vol_ratio}x the 20-day average."
    else:
        vol_text = f"Normal volume activity: Today's volume is {vol_ratio}x the 20-day average."

    factor_points += vol_points
    factors_breakdown.append({
        "factor_name": "Volume Anomaly",
        "value": f"{vol_ratio}x",
        "points": vol_points,
        "description": vol_text
    })

    # 2. Price-Volume Divergence Factor
    div_points = 20 if pv_divergence_flag else 0
    factor_points += div_points
    factors_breakdown.append({
        "factor_name": "Price-Volume Divergence",
        "value": "Detected" if pv_divergence_flag else "None",
        "points": div_points,
        "description": pv_divergence_desc
    })

    # 3. RSI-14 Overbought Factor
    rsi_points = 0
    if latest_rsi >= 80.0:
        rsi_points = 25
        rsi_text = f"Extreme overbought levels: RSI-14 is {latest_rsi}, above the 80 threshold."
    elif latest_rsi >= 70.0:
        rsi_points = 15
        rsi_text = f"Overbought threshold reached: RSI-14 is {latest_rsi}, above the conventional 70 threshold."
    else:
        rsi_text = f"RSI-14 is {latest_rsi} (within standard 30-70 range)."

    factor_points += rsi_points
    factors_breakdown.append({
        "factor_name": "RSI-14 Momentum",
        "value": f"{latest_rsi}",
        "points": rsi_points,
        "description": rsi_text
    })

    # 4. Short-Term Surge (5d Return)
    surge_points = 0
    if price_chg_5d_pct >= 15.0:
        surge_points = 25
        surge_text = f"Rapid price surge: Up +{price_chg_5d_pct}% over the last 5 trading days."
    elif price_chg_5d_pct >= 8.0:
        surge_points = 15
        surge_text = f"Elevated momentum: Up +{price_chg_5d_pct}% over the last 5 trading days."
    else:
        surge_text = f"5-day price change is {price_chg_5d_pct:+.2f}%."

    factor_points += surge_points
    factors_breakdown.append({
        "factor_name": "5-Day Trailing Return",
        "value": f"{price_chg_5d_pct:+.2f}%",
        "points": surge_points,
        "description": surge_text
    })

    # 5. Valuation Premium (P/E vs Sector)
    pe_points = 0
    if pe_ratio_vs_sector is not None:
        if pe_ratio_vs_sector >= 2.5:
            pe_points = 20
        elif pe_ratio_vs_sector >= 1.8:
            pe_points = 10

    factor_points += pe_points
    factors_breakdown.append({
        "factor_name": "Sector P/E Valuation",
        "value": f"{trailing_pe}x" if trailing_pe else "N/A",
        "points": pe_points,
        "description": pe_desc
    })

    # 6. Promoter Pledging % (Stub field for v1)
    factors_breakdown.append({
        "factor_name": "Promoter Pledging %",
        "value": None,
        "points": 0,
        "status": "NOT_AVAILABLE_IN_V1",
        "description": "Promoter pledging data source is out of scope for v1 release."
    })

    # Total score clamped to 100
    composite_score = min(factor_points, 100)

    # Verdict Mapping
    if composite_score >= 61:
        verdict_label = "RED FLAG"
        verdict_desc = "Multiple extreme volume, momentum, or valuation anomalies detected."
    elif composite_score >= 31:
        verdict_label = "CAUTION"
        verdict_desc = "Elevated activity or overbought levels detected. Exercise standard risk management."
    else:
        verdict_label = "SAFE"
        verdict_desc = "No major speculative volume or price momentum anomalies detected."

    result = {
        "symbol": clean_symbol,
        "hype_score": composite_score,
        "verdict_label": verdict_label,
        "verdict_description": verdict_desc,
        "metrics": {
            "latest_close": latest_close,
            "latest_volume": latest_volume,
            "volume_20d_avg": vol_20d_avg,
            "volume_ratio": vol_ratio,
            "daily_traded_value_inr_cr": round(daily_traded_value_inr, 2),
            "rsi_14": latest_rsi,
            "price_chg_5d_pct": price_chg_5d_pct,
            "price_chg_20d_pct": price_chg_20d_pct,
            "trailing_pe": trailing_pe,
            "sector_benchmark_pe": benchmark_pe,
        },
        "factors": factors_breakdown,
        "as_of": datetime.now(timezone.utc).isoformat(),
        "disclaimer": DISCLAIMER_TEXT,
    }

    # Store result in cache (6h TTL)
    set_cached("stock_signals", cache_key, result, ttl_override_seconds=21600)
    return result


# ─── API ENDPOINTS ─────────────────────────────────────────────────────────────

@router.get("/hype-score/{ticker}")
def get_hype_score(
    ticker: str = Path(
        ...,
        description="NSE or BSE stock symbol (e.g. RELIANCE.NS, TCS.NS)",
        pattern=r"^[A-Z0-9&]{1,20}(\.NS|\.BO)?$"
    )
) -> Dict[str, Any]:
    """
    GET /api/hype-score/{ticker}

    Returns the composite Hype Score (0-100), verdict label (SAFE / CAUTION / RED FLAG),
    and full factor breakdown.

    COMPLIANCE GUARANTEE: Never renders directional calls ('bullish', 'bearish', 'buy', 'sell')
    or price direction predictions. Strictly describes factual price-volume metrics.
    """
    # Uppercase normalisation (already enforced by regex, but belt-and-suspenders)
    ticker = ticker.upper()
    return _calculate_hype_score_data(ticker)


@router.get("/market-context")
def get_market_context() -> Dict[str, Any]:
    """
    GET /api/market-context

    Fetches current India VIX (^INDIAVIX) to power sitewide behavioral volatility warnings.
    Cached for 15 minutes to reduce API latency.
    """
    cached_vix = get_cached("market_summary", "india_vix")
    if cached_vix is not None:
        return cached_vix

    india_vix_val = None
    elevated_flag = False

    try:
        df = yf.download("^INDIAVIX", period="5d", interval="1d", progress=False)
        if not df.empty:
            if isinstance(df.columns, pd.MultiIndex):
                df.columns = df.columns.get_level_values(0)
            close_col = df["Close"] if "Close" in df.columns else df["close"]
            india_vix_val = round(float(close_col.iloc[-1]), 2)
            elevated_flag = india_vix_val > 20.0
    except Exception as exc:
        logger.warning("Failed to fetch ^INDIAVIX: %s", exc)

    # Fallback to default safe representation if fetch fails
    if india_vix_val is None:
        india_vix_val = 14.5  # Standard historical baseline average for India VIX
        elevated_flag = False

    res = {
        "india_vix": india_vix_val,
        "elevated": elevated_flag,
        "vix_threshold": 20.0,
        "as_of": datetime.now(timezone.utc).isoformat(),
        "disclaimer": DISCLAIMER_TEXT,
    }

    set_cached("market_summary", "india_vix", res, ttl_override_seconds=900)
    return res
