import pandas as pd
from typing import List, Dict
from app.signals.indicators import add_technical_indicators


def detect_signals(df: pd.DataFrame) -> List[Dict]:
    """
    Scans a stock's historical price DataFrame with technical indicators
    and extracts active high-confidence trading signals.
    Always returns a list (never None).
    """
    if df.empty or len(df) < 30:
        return []

    df_ind = add_technical_indicators(df)
    latest = df_ind.iloc[-1]
    prev = df_ind.iloc[-2]
    signals = []

    current_close = float(latest["close"])
    rsi = float(latest.get("rsi_14", 50))
    macd_hist = float(latest.get("macd_hist", 0))
    prev_macd_hist = float(prev.get("macd_hist", 0))
    pct_b = float(latest.get("bb_pct_b", 0.5))
    vol = float(latest.get("volume", 0))
    vol_ma = float(latest.get("vol_sma_20", 1.0))
    vol_ratio = vol / (vol_ma if vol_ma > 0 else 1.0)

    ema20 = float(latest.get("ema_20", 0))
    ema50 = float(latest.get("ema_50", 0))
    prev_ema20 = float(prev.get("ema_20", 0))
    prev_ema50 = float(prev.get("ema_50", 0))

    # MACD Bullish Crossover
    if prev_macd_hist < 0 and macd_hist > 0 and rsi < 55:
        confidence = 0.65
        if vol_ratio > 1.3:
            confidence += 0.15
        if pct_b < 0.3:
            confidence += 0.1
        signals.append({
            "signal_type": "MACD_BULLISH_CROSSOVER",
            "direction": "BULLISH",
            "confidence": min(round(confidence, 2), 0.95),
            "description": "MACD line crossed above Signal line with volume support",
            "details": {"rsi": round(rsi, 1), "macd_hist": round(macd_hist, 2), "volume_ratio": round(vol_ratio, 2)},
        })

    # MACD Bearish Crossover
    if prev_macd_hist > 0 and macd_hist < 0 and rsi > 45:
        confidence = 0.65
        if vol_ratio > 1.3:
            confidence += 0.15
        if pct_b > 0.7:
            confidence += 0.1
        signals.append({
            "signal_type": "MACD_BEARISH_CROSSOVER",
            "direction": "BEARISH",
            "confidence": min(round(confidence, 2), 0.95),
            "description": "MACD line crossed below Signal line indicating downward momentum",
            "details": {"rsi": round(rsi, 1), "macd_hist": round(macd_hist, 2), "volume_ratio": round(vol_ratio, 2)},
        })

    # RSI Oversold
    if rsi < 35:
        confidence = 0.7
        if pct_b < 0.1:
            confidence += 0.15
        signals.append({
            "signal_type": "RSI_OVERSOLD",
            "direction": "BULLISH",
            "confidence": min(round(confidence, 2), 0.95),
            "description": f"RSI is oversold at {round(rsi, 1)}, signaling a potential mean-reversion rebound",
            "details": {"rsi": round(rsi, 1), "pct_b": round(pct_b, 2)},
        })

    # RSI Overbought
    if rsi > 70:
        confidence = 0.7
        if pct_b > 0.9:
            confidence += 0.15
        signals.append({
            "signal_type": "RSI_OVERBOUGHT",
            "direction": "BEARISH",
            "confidence": min(round(confidence, 2), 0.95),
            "description": f"RSI is overbought at {round(rsi, 1)}, indicating potential buyer exhaustion",
            "details": {"rsi": round(rsi, 1), "pct_b": round(pct_b, 2)},
        })

    # EMA Golden Cross
    if prev_ema20 <= prev_ema50 and ema20 > ema50:
        signals.append({
            "signal_type": "EMA_GOLDEN_CROSS",
            "direction": "BULLISH",
            "confidence": 0.8,
            "description": "EMA 20 crossed above EMA 50 (Golden Cross trend reversal)",
            "details": {"ema20": round(ema20, 2), "ema50": round(ema50, 2)},
        })

    # EMA Death Cross
    if prev_ema20 >= prev_ema50 and ema20 < ema50:
        signals.append({
            "signal_type": "EMA_DEATH_CROSS",
            "direction": "BEARISH",
            "confidence": 0.8,
            "description": "EMA 20 crossed below EMA 50 (Death Cross trend reversal)",
            "details": {"ema20": round(ema20, 2), "ema50": round(ema50, 2)},
        })

    # Trend Continuation fallback
    if not signals:
        trend_direction = "BULLISH" if ema20 > ema50 else "BEARISH"
        signals.append({
            "signal_type": "TREND_CONTINUATION",
            "direction": trend_direction,
            "confidence": 0.55,
            "description": f"Price in steady {trend_direction.lower()} consolidation",
            "details": {"rsi": round(rsi, 1), "pct_b": round(pct_b, 2)},
        })

    return signals
