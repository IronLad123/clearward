import pandas as pd
import numpy as np

def calculate_rsi(series: pd.Series, period: int = 14) -> pd.Series:
    """Calculate Relative Strength Index (RSI)."""
    delta = series.diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()

    # Avoid division by zero
    rs = gain / (loss.replace(0, np.nan))
    rsi = 100 - (100 / (1 + rs))
    return rsi.fillna(50.0)

def calculate_macd(series: pd.Series, fast: int = 12, slow: int = 26, signal: int = 9):
    """Calculate MACD line, Signal line, and Histogram."""
    ema_fast = series.ewm(span=fast, adjust=False).mean()
    ema_slow = series.ewm(span=slow, adjust=False).mean()
    macd_line = ema_fast - ema_slow
    signal_line = macd_line.ewm(span=signal, adjust=False).mean()
    histogram = macd_line - signal_line
    return macd_line, signal_line, histogram

def calculate_bollinger_bands(series: pd.Series, period: int = 20, num_std: float = 2.0):
    """Calculate Bollinger Bands (Upper, Middle/SMA, Lower) and %B."""
    middle = series.rolling(window=period).mean()
    std = series.rolling(window=period).std()
    upper = middle + (std * num_std)
    lower = middle - (std * num_std)

    # %B = (Price - Lower) / (Upper - Lower)
    pct_b = (series - lower) / (upper - lower).replace(0, np.nan)
    return upper, middle, lower, pct_b.fillna(0.5)

def calculate_atr(df: pd.DataFrame, period: int = 14) -> pd.Series:
    """Calculate Average True Range (ATR)."""
    high = df["high"]
    low = df["low"]
    close = df["close"].shift(1)

    tr1 = high - low
    tr2 = (high - close).abs()
    tr3 = (low - close).abs()

    tr = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
    atr = tr.rolling(window=period).mean()
    return atr.fillna(0.0)

def add_technical_indicators(df: pd.DataFrame) -> pd.DataFrame:
    """
    Appends all core technical indicators to the DataFrame:
        RSI, MACD, Bollinger Bands, EMA 20, EMA 50, and ATR.
    """
    if df.empty or len(df) < 14:
        return df

    df = df.copy()
    close = df["close"]

    # 1. RSI
    df["rsi_14"] = calculate_rsi(close, period=14)

    # 2. MACD
    macd, macd_sig, macd_hist = calculate_macd(close, fast=12, slow=26, signal=9)
    df["macd_line"] = macd
    df["macd_signal"] = macd_sig
    df["macd_hist"] = macd_hist

    # 3. Bollinger Bands
    upper, middle, lower, pct_b = calculate_bollinger_bands(close, period=20, num_std=2.0)
    df["bb_upper"] = upper
    df["bb_middle"] = middle
    df["bb_lower"] = lower
    df["bb_pct_b"] = pct_b

    # 4. Moving Averages
    df["ema_20"] = close.ewm(span=20, adjust=False).mean()
    df["ema_50"] = close.ewm(span=50, adjust=False).mean()
    df["sma_200"] = close.rolling(window=min(200, len(df))).mean()

    # 5. Volatility & Volume
    df["atr_14"] = calculate_atr(df, period=14)
    df["vol_sma_20"] = df["volume"].rolling(window=min(20, len(df))).mean()

    return df
