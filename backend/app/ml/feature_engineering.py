import logging
from typing import Tuple
import numpy as np
import pandas as pd
from app.signals.indicators import add_technical_indicators
from app.ml.regime_detector import MarketRegimeDetector

logger = logging.getLogger(__name__)

__all__ = [
    "FEATURE_COLUMNS",
    "FEATURE_COLUMNS_V1",
    "create_feature_matrix",
    "create_inference_row",
    "get_train_test_matrix",
]

# VADER sentiment — Hutto & Gilbert (2014) 'VADER: A Parsimonious Rule-based Model
# for Sentiment Analysis of Social Media Text' — ICWSM 2014.
# Compound score in [-1, 1]: negative=-1 (bearish), positive=+1 (bullish).
try:
    from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer as _VaderAnalyzer
    _vader = _VaderAnalyzer()
    _VADER_AVAILABLE = True
except ImportError:
    _vader = None
    _VADER_AVAILABLE = False

# V1 original 10 features (backward-compatible reference)
FEATURE_COLUMNS_V1 = [
    "ret_1d", "ret_2d", "ret_3d", "ret_5d",
    "rsi_14", "macd_hist", "bb_pct_b",
    "vol_ratio", "atr_pct", "ema_ratio"
]

# Extended 14-feature set (superset of V1).
# Research basis: Gu, Kelly & Xiu (2020) RFS -- 94 stock characteristics study.
# New features:
#   stoch_k            -- Stochastic %%K momentum oscillator [0,1]
#   price_sma200_ratio -- Price / SMA-200 market-regime indicator
#   intraday_range     -- (Close-Open)/(High-Low) candle body direction [-1,1]
#   ret_10d            -- 10-day lagged return (medium-term trend continuation)
FEATURE_COLUMNS = FEATURE_COLUMNS_V1 + [
    "stoch_k",
    "price_sma200_ratio",
    "intraday_range",
    "ret_10d",
    "regime_state",
    "regime_prob_bear",
    "sentiment_score",    # VADER compound score in [-1,1]; Hutto & Gilbert 2014
]


def _stochastic_k(df: pd.DataFrame, period: int = 14) -> pd.Series:
    """Stochastic %%K = (Close - LowestLow) / (HighestHigh - LowestLow) * 100, normalised to [0,1]."""
    lo_min   = df["low"].rolling(window=period).min()
    hi_max   = df["high"].rolling(window=period).max()
    denom    = (hi_max - lo_min).replace(0, np.nan)
    stoch_k  = ((df["close"] - lo_min) / denom * 100).fillna(50.0)
    return (stoch_k / 100.0).clip(0.0, 1.0)


def _compute_daily_sentiment(df: pd.DataFrame, symbol: str = "UNKNOWN",
                              cutoff_date=None) -> pd.Series:
    """
    Compute VADER sentiment per trading day from RSS headlines.

    cutoff_date: if provided (datetime-like), only articles published
                 ON OR BEFORE this date are used. This prevents future
                 news from leaking into historical training rows.

    Research: Hutto & Gilbert (2014) VADER — ICWSM 2014.
    Fallback: 0.0 (neutral) if VADER unavailable or no news found.
    """
    if not _VADER_AVAILABLE or df.empty:
        return pd.Series(0.0, index=df.index)

    try:
        from app.ingestion.news_scraper import fetch_ticker_news_rss
        news = fetch_ticker_news_rss(symbol, symbol, max_articles=30)
        if not news:
            return pd.Series(0.0, index=df.index)

        cutoff = pd.Timestamp(cutoff_date) if cutoff_date is not None else None

        # Score each headline, respecting cutoff
        scored = []
        for item in news:
            pub = item.get("published", "")[:10]  # YYYY-MM-DD
            try:
                pub_ts = pd.Timestamp(pub)
            except Exception:
                pub_ts = None
            # Skip articles published after cutoff (future leakage guard)
            if cutoff is not None and pub_ts is not None and pub_ts > cutoff:
                continue
            score = _vader.polarity_scores(
                item.get("title", "") + " " + item.get("content", "")
            )["compound"]
            scored.append({"score": score, "date": pub})

        if not scored:
            return pd.Series(0.0, index=df.index)

        # Build date-indexed series of mean daily sentiment
        news_df = pd.DataFrame(scored)
        news_df["date"] = pd.to_datetime(news_df["date"], errors="coerce")
        news_df = news_df.dropna(subset=["date"])
        daily_sent = news_df.groupby("date")["score"].mean()

        # Align to price df dates; forward-fill gaps (news persists 3 days)
        if "date" in df.columns:
            price_dates = pd.to_datetime(df["date"])
        else:
            price_dates = pd.to_datetime(df.index)

        aligned = (
            daily_sent
            .reindex(price_dates)
            .ffill(limit=3)
            .fillna(0.0)
        )
        aligned.index = df.index
        return aligned.clip(-1.0, 1.0)

    except Exception as e:
        logger.warning('Sentiment compute failed for %s: %s', symbol, e)
        return pd.Series(0.0, index=df.index)


def _compute_historical_sentiment(df: pd.DataFrame, symbol: str,
                                    cutoff_date=None) -> pd.Series:
    """
    Compute VADER sentiment from historically stored news in ChromaDB.

    cutoff_date: only articles published ON OR BEFORE this date are scored.
                 This prevents future news from leaking into historical training.

    Research: Hutto & Gilbert (2014) VADER — ICWSM 2014.
    Tetlock (2007): news sentiment effects persist 2-4 trading days.

    Falls back to _compute_daily_sentiment() if no stored articles are found.
    Returns: pd.Series in [-1, 1] aligned to df.index
    """
    if not _VADER_AVAILABLE or df.empty:
        return pd.Series(0.0, index=df.index)

    cutoff = pd.Timestamp(cutoff_date) if cutoff_date is not None else None

    try:
        from app.ingestion.vector_store import VectorStoreManager
        vs = VectorStoreManager()

        results = vs.collection.get(
            where={"ticker": {"$eq": symbol}},
            include=["documents", "metadatas"]
        ) if vs.collection else None

        if not results or not results.get('documents'):
            return _compute_daily_sentiment(df, symbol, cutoff_date=cutoff_date)

        docs = results['documents']
        metas = results.get('metadatas', [{}] * len(docs))

        scored = []
        for doc, meta in zip(docs, metas):
            if not doc:
                continue
            pub_date = meta.get('published', '') or meta.get('date', '')
            pub_date = pub_date[:10] if pub_date else ''
            # Skip articles after cutoff (future leakage guard)
            if cutoff is not None and pub_date:
                try:
                    if pd.Timestamp(pub_date) > cutoff:
                        continue
                except Exception:
                    pass
            compound = _vader.polarity_scores(doc)['compound']
            scored.append({'date': pub_date, 'score': compound})

        if not scored:
            return _compute_daily_sentiment(df, symbol, cutoff_date=cutoff_date)

        news_df = pd.DataFrame(scored)
        news_df['date'] = pd.to_datetime(news_df['date'], errors='coerce')
        news_df = news_df.dropna(subset=['date'])
        daily_sent = news_df.groupby('date')['score'].mean()

        price_dates = pd.to_datetime(df['date']) if 'date' in df.columns else pd.to_datetime(df.index)

        aligned = (
            daily_sent
            .reindex(price_dates)
            .ffill(limit=3)
            .fillna(0.0)
        )
        aligned.index = df.index
        return aligned.clip(-1.0, 1.0)

    except Exception as e:
        logger.warning('Historical sentiment failed for %s: %s', symbol, e)
        return _compute_daily_sentiment(df, symbol, cutoff_date=cutoff_date)


def _compute_features_df(df: pd.DataFrame, symbol: str = "UNKNOWN",
                          fit_end_idx: int = None,
                          cutoff_date=None) -> pd.DataFrame:
    """
    Computes all 17 features from raw OHLCV DataFrame.

    fit_end_idx: HMM regime detector fits only on returns[:fit_end_idx] —
                 prevents look-ahead leakage into out-of-sample partitions.
    cutoff_date: only news published on/before this date is used for sentiment —
                 prevents future-news leakage during historical training.
    """
    df_feats = add_technical_indicators(df).copy()
    close = df_feats["close"]

    # --- Lagged returns ---
    df_feats["ret_1d"] = close.pct_change(1)
    df_feats["ret_2d"] = close.pct_change(2)
    df_feats["ret_3d"] = close.pct_change(3)
    df_feats["ret_5d"] = close.pct_change(5)
    df_feats["ret_10d"] = close.pct_change(10)

    # --- Normalised volume/volatility ratios ---
    vol_ma = df_feats["vol_sma_20"].replace(0, np.nan)
    df_feats["vol_ratio"] = (df_feats["volume"] / vol_ma).fillna(1.0)
    df_feats["atr_pct"] = (df_feats["atr_14"] / close).fillna(0.0)
    df_feats["ema_ratio"] = (df_feats["ema_20"] / df_feats["ema_50"].replace(0, np.nan)).fillna(1.0)

    # --- NEW: Stochastic %K [0,1] ---
    df_feats["stoch_k"] = _stochastic_k(df_feats, period=14)

    # --- NEW: Price / SMA-200 regime indicator ---
    sma200 = df_feats["sma_200"].replace(0, np.nan)
    df_feats["price_sma200_ratio"] = (close / sma200).fillna(1.0).clip(0.5, 2.0)

    # --- NEW: Intraday candle body direction [-1, 1] ---
    hl_range = (df_feats["high"] - df_feats["low"]).replace(0, np.nan)
    df_feats["intraday_range"] = ((close - df_feats["open"]) / hl_range).fillna(0.0).clip(-1.0, 1.0)

    # --- NEW: Regime features (HMM fit on training slice up to fit_end_idx) ---
    try:
        detector = MarketRegimeDetector(n_states=2)
        df_feats = detector.add_regime_feature(df_feats, fit_end_idx=fit_end_idx)
    except Exception:
        df_feats['regime_state'] = 0
        df_feats['regime_prob_bear'] = 0.0

    # --- VADER Sentiment score [-1, 1] — cutoff_date prevents future-news leakage ---
    df_feats["sentiment_score"] = _compute_historical_sentiment(
        df_feats, symbol=symbol, cutoff_date=cutoff_date
    ).values


    return df_feats


def create_feature_matrix(
    df: pd.DataFrame,
    forward_horizon: int = 3,
    threshold_pct: float = 0.8,
    symbol: str = "UNKNOWN",
    fit_end_idx: int = None,
    cutoff_date=None,
) -> pd.DataFrame:
    """
    Transforms raw OHLCV into a 17-feature matrix + direction target class.
    Classes: 1=UP, -1=DOWN, 0=FLAT  (forward_horizon-day lookahead).

    Parameters:
      fit_end_idx: HMM fits only on returns[:fit_end_idx] (no look-ahead).
      cutoff_date: Only news published on/before this date used for sentiment
                   (no future-news leakage during historical training).
    """
    if df is None or not isinstance(df, pd.DataFrame) or df.empty or len(df) < 50:
        return pd.DataFrame()

    df_feats = _compute_features_df(df, symbol=symbol,
                                     fit_end_idx=fit_end_idx,
                                     cutoff_date=cutoff_date)
    close = df_feats["close"]

    # --- Forward direction target ---
    fwd_return = (close.shift(-forward_horizon) - close) / close * 100.0
    df_feats["fwd_return"] = fwd_return

    def label(ret):
        if pd.isna(ret):
            return np.nan
        return 1 if ret >= threshold_pct else (-1 if ret <= -threshold_pct else 0)

    df_feats["target_class"] = fwd_return.apply(label)

    df_clean = df_feats.dropna(subset=FEATURE_COLUMNS + ["target_class"]).copy()
    df_clean["target_class"] = df_clean["target_class"].astype(int)
    return df_clean


def create_inference_row(df: pd.DataFrame, symbol: str = "UNKNOWN") -> pd.DataFrame:
    """
    Computes all 17 features for inference without computing or requiring target labels
    or future returns. Avoids dropping the most recent forward_horizon days.

    Returns only the LAST valid feature row (most recent day) as a 1-row DataFrame.
    Raises ValueError if fewer than 200 rows are available.
    Returns None if any feature in the last row is NaN.
    """
    if df is None or len(df) < 200:
        raise ValueError(
            f"Insufficient data for inference: minimum 200 rows required, got {len(df) if df is not None else 0}"
        )

    df_feats = _compute_features_df(df, symbol=symbol, fit_end_idx=None)
    last_row = df_feats[FEATURE_COLUMNS].iloc[[-1]].copy()

    if last_row.isna().any().any():
        return None

    return last_row


def get_train_test_matrix(df: pd.DataFrame) -> Tuple[pd.DataFrame, pd.Series]:
    """Extract feature matrix X and target vector y."""
    matrix = create_feature_matrix(df)
    if matrix.empty:
        return pd.DataFrame(), pd.Series()
    return matrix[FEATURE_COLUMNS], matrix["target_class"]
