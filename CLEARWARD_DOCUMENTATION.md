# Clearward — Financial Risk Intelligence Platform
> **Education Only. Not Investment Advice.**
> *SEBI Non-Advisory Compliance Standard: Strictly zero buy, sell, target price, or guaranteed return language.*

---

## Executive Summary

**Clearward** is an enterprise-grade financial analytics and risk-intelligence platform engineered specifically for Indian retail equity and mutual fund investors. Designed with modern glassmorphic aesthetics and high-performance quantitative backends, Clearward transforms complex price action, market volatility, machine learning regime signals, and portfolio risk structures into clear, objective, factual intelligence.

Rather than making speculative stock calls or buy/sell recommendations, Clearward functions as an **objective risk defense system**. It equips investors with institutional-grade risk metrics—such as Altman Z-Score solvency, walk-forward machine learning directional bias, ARIMA statistical confidence cones, mutual fund overlap matrices, and Groww-aligned distributor fee drag audits.

---

## Datasets & Data Sources Specification

Clearward synthesizes four core datasets across equities, mutual funds, macro benchmarks, and unstructured news streams:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
 DATASET ARCHITECTURE
└────────────────────────────────────────────────────────────────────────────────────────┘
 1. Indian Equities Dataset (Yahoo Finance API → SQLite)
 • 340+ NSE/BSE Symbols (RELIANCE.NS, TCS.NS, HDFCBANK.NS, INFY.NS, etc.)
 • 1-Year Historical Daily OHLCV Price & Volume Series
 • Technical Indicators: EMA (20/50), RSI (14), MACD, Bollinger Bands, ATR

 2. AMFI Mutual Funds Dataset (mfapi.in API → SQLite 23-Hour TTL Cache)
 • 1,500+ Official Registered Indian Schemes
 • Complete Daily NAV History Series
 • Direct vs. Regular Plan Expense Ratio Structures & Scheme Categories
 • Categories: Flexi Cap, Small Cap, Mid Cap, Large Cap, Index, Hybrid, Sectoral

 3. Market Volatility & Benchmark Dataset (Yahoo Finance API)
 • India VIX (Volatility Index)
 • NIFTY 50 (`^NSEI`) & SENSEX (`^BSESN`) Benchmark Indices
 • 10-Year Sovereign Gilt Risk-Free Rate (6.5% Benchmark Proxy)

 4. Financial News & RAG Explainer Vector Store (ChromaDB)
 • Scraped Financial News & Market Commentary
 • MD5-Hashed Article Signatures for Deduplication
 • Sentence-Transformer Vector Embeddings for Retrieval-Augmented Generation
```

---

## Machine Learning & Time-Series Models ("WHAT & HOW")

Clearward deploys three quantitative models combining neural networks, tree ensembles, and statistical time-series forecasting.

### Model 1: Multi-Layer Perceptron (MLP) Neural Network
* **Type**: Deep Feed-Forward Artificial Neural Network (`Scikit-Learn MLPClassifier`).
* **Architecture**:
 - Input Layer: 15 normalized technical feature inputs.
 - Hidden Layer 1: 64 neurons (ReLU activation).
 - Hidden Layer 2: 32 neurons (ReLU activation).
 - Output Layer: 3-class Softmax probabilities (`POSITIVE BIAS`, `NEGATIVE BIAS`, `CONSOLIDATION`).
 - Optimization: Adam optimizer with early stopping and L2 regularization (`alpha=0.0001`).
* **Features Trained On**:
 1. Ratio of Close to EMA 20 & EMA 50
 2. EMA 20 / EMA 50 Slope Ratio
 3. RSI 14 (Relative Strength Index)
 4. MACD Line, Signal Line & Histogram Difference
 5. Normalized ATR (Average True Range volatility)
 6. Bollinger Band %B Position
 7. Volume Anomaly Ratio (Current Volume / 20-Day SMA Volume)
 8. 5-Day Historical Momentum Return %

### Model 2: Random Forest Ensemble Classifier
* **Type**: Decision Tree Ensemble (`Scikit-Learn RandomForestClassifier`).
* **Architecture**: 100 Estimator Trees, max depth 8, Gini impurity criterion.
* **Role**: Serves as a robust baseline regime classifier and generates feature importance rankings to explain model predictions.

### Model 3: Auto-ARIMA Time-Series Forecasting Model
* **Type**: Auto-Regressive Integrated Moving Average (`Statsmodels ARIMA`).
* **Stationarity Pipeline**: Runs Augmented Dickey-Fuller (ADF) unit-root test on price history. If non-stationary (`p > 0.05`), first-order differencing (`d=1`) is automatically applied.
* **Model Selection**: Performs grid search over ARIMA(p,d,q) combinations over a 500-trading-day window, selecting the model with the minimum Akaike Information Criterion (AIC).
* **Output**: Generates 5-day expected mean trajectory accompanied by **80% (inner cone)** and **95% (outer cone)** statistical confidence intervals.

---

## Model Validation, Retraining & Handoff Pipeline ("HOW IT IS TRAINED")

```
 Raw OHLCV Data
 │
 ▼
 ┌─────────────────────────────────────────────────────────────┐
 │ 5-Fold Walk-Forward Splitter (Preserves Chronological Order) │
 └──────────────────────────────┬──────────────────────────────┘
 │
 ▼
 ┌─────────────────────────────────────────────────────────────┐
 │ 3-Day Embargo Horizon Gap (Purges Target Lookahead Leakage) │
 └──────────────────────────────┬──────────────────────────────┘
 │
 ▼
 ┌─────────────────────────────────────────────────────────────┐
 │ Out-of-Fold (OOF) Backtest & F1-Score Evaluation │
 └──────────────────────────────┬──────────────────────────────┘
 │
 ▼
 ┌─────────────────────────────────────────────────────────────┐
 │ Challenger vs. Champion Evaluator (Auto-Promotion) │
 └──────────────────────────────┬──────────────────────────────┘
 │
 ▼
 ┌─────────────────────────────────────────────────────────────┐
 │ Cache Purge Callback (clear_symbol_model_caches(symbol)) │
 └─────────────────────────────────────────────────────────────┘
```

1. **Chronological Walk-Forward Split**: Uses a 5-fold expanding window validator to ensure training always precedes test data (no random shuffling or data leakage).
2. **3-Day Embargo Horizon**: Enforces a 3-trading-day gap between training window end and test window start. This eliminates target lookahead leakage caused by overlapping 3-day forward return labels.
3. **Out-of-Fold (OOF) Backtesting**: Backtests Sharpe ratio, maximum drawdown, and win rates exclusively on out-of-fold cross-validation predictions.
4. **Challenger Promotion & Cache Purging**: Retrains models periodically. If a challenger achieves a superior out-of-fold F1-score than the current champion, it is promoted to active champion, triggering `clear_symbol_model_caches(symbol)` to invalidate stale in-memory weights.

---

## Technology Architecture & Technical Stack

Clearward is built on a decoupled, ultra-fast architecture combining FastAPI, Scikit-Learn, Statsmodels, SQLite in WAL mode, and React 18 with Vite.

```
 ┌────────────────────────────────────────────────────────┐
 │ React 18 + Vite Frontend │
 │ (Space Grotesk, IBM Plex Mono, Glassmorphism, Recharts)│
 └───────────────────────────┬────────────────────────────┘
 │ REST API / JSON
 ▼
 ┌────────────────────────────────────────────────────────┐
 │ FastAPI Python Backend │
 │ (CORS Sanitized, SQLite Cache Stampede Protection) │
 └──────┬────────────────────┬────────────────────┬───────┘
 │ │ │
 ┌────────────────┴──────┐ ┌──────────┴──────────┐ ┌────────┴───────────┐
 │ ML & Forecasting │ │ Portfolio Engine │ │ Data Ingestion │
 │ • Scikit-Learn MLP │ │ • Fee Drag Audit │ │ • Yahoo Finance │
 │ • Statsmodels ARIMA │ │ • Overlap Matrix │ │ • AMFI (mfapi.in) │
 │ • Embargo Validation │ │ • Stress Scenarios │ │ • Vector Store (RAG) │
 └───────────────────────┘ └──────────────────────┘ └──────────────────────┘
```

---

## Comprehensive Module-by-Module Breakdown

Clearward is organized into 12 dedicated analytical modules:

### 1. Stock Intelligence — Overview Dashboard
* **OHLC Candlestick Engine**: Custom SVG candlestick renderer displaying open, high, low, and close price action in IBM Plex Mono.
* **Technical Overlays**:
 * **EMA 20 & EMA 50**: Thin trendline overlays for short-term and medium-term momentum assessment.
 * **Bollinger Bands**: 20-period 2-standard-deviation volatility envelope filled with 8% glass opacity.
 * **RSI & MACD Panels**: Sub-panel oscillators displaying overbought/oversold levels (`RSI > 70` / `< 30`) and MACD signal crossovers.
* **Market Risk Cockpit**: High-level risk posture card summarizing 5-observation price context and India VIX volatility benchmarks.

### 2. Machine Learning Direction & Regime Overlay
* **Model Architecture**: Multi-Layer Perceptron (MLP) Neural Network and Random Forest models trained on multi-scale technical indicators (EMA ratios, RSI, ATR, MACD histogram, Volume Anomaly).
* **SEBI Compliance Framing**: Directional predictions are formatted into non-advisory regime labels:
 * **`▲ POSITIVE BIAS`**: Statistical upside leaning with confidence ring.
 * **`▼ NEGATIVE BIAS`**: Statistical downside leaning.
 * **`— CONSOLIDATION`**: Neutral range-bound expectation.
* **Confidence Pulse**: Thin SVG ring that pulses at a rate dynamically tied to the stock's 14-day ATR (Average True Range).

### 3. 5-Day ARIMA Time-Series Statistical Forecast
* **Stationarity Pipeline**: Runs Augmented Dickey-Fuller (ADF) unit-root tests. If non-stationary (`p > 0.05`), first-order differencing (`d=1`) is automatically applied.
* **AIC Grid Search**: Fits ARIMA(p,d,q) combinations over 500 trading days and selects the lowest Akaike Information Criterion (AIC) model.
* **Confidence Cone**: Displays 5-day mean forecast flanked by 80% (inner band) and 95% (outer band) statistical confidence cones.

### 4. Health & Risk Doctor
* **Altman Z-Score Solvency**: Evaluates balance-sheet solvency risk for manufacturing and service equities to assess financial distress probability.
* **Volatility & Drawdown Health**: Calculates 52-week peak-to-trough drawdown %, historical volatility, and debt-to-equity leverage risks.

### 5. AI Grounded Explainer (RAG Engine)
* **Retrieved News Aggregation**: Scrapes real-time market news and creates vector embeddings using MD5-hashed article signatures in ChromaDB.
* **Clickable Source Chips**: Converts inline prose references into interactive markdown links `[Headline | Source](url)` so investors can verify evidence directly.

### 6. Hype Guard (Behavioral Risk Detector)
* **Social Sentiment vs Fundamental Disconnect**: Scans social media buzz, news volume spikes, and retail trading activity.
* **Hype Score (0–100)**: Detects when market chatter is disconnected from underlying earnings/cash-flow fundamentals.
* **FOMO Defense Alerts**: Provides behavioral warnings to prevent impulse buying at peak hype.

### 7. Portfolio Health Doctor
* **Universal Multi-Asset Audit**: Evaluates any combination of Indian equities (`.NS` / `.BO`) and mutual fund schemes.
* **Groww-Aligned Fee Drag Audit**: Calculates distributor commission leakage (Direct vs Regular expense ratio deltas):
 $$\text{Annual Fee Drag (₹)} = \text{Regular Capital (₹)} \times \text{Category Delta \%}$$
 * Flexi Cap: `0.80% p.a.`
 * Small Cap: `1.00% p.a.`
 * Mid Cap: `0.95% p.a.`
 * Large Cap: `1.00% p.a.`
 * Index Fund: `0.35% p.a.`
* **Pairwise Mutual Fund Overlap %**: Calculates stock-level and category-correlation overlaps to eliminate redundant double exposure.
* **Macro Stress Testing**: Simulates hypothetical drawdowns during **2020 COVID Shock (-28.5%)**, **2008 Financial Crisis (-42.0%)**, and **Interest Rate Spikes (+150 bps)**.

### 8. Mutual Fund Analyzer
* **1,500+ AMFI Scheme Catalog**: Complete search covering every registered Indian mutual fund scheme via `mfapi.in`.
* **Performance Metrics**: 1Y, 3Y, and 5Y CAGR returns, Annualized Volatility, Sharpe Ratio (vs India 10Y Gilt 6.5%), and Max Drawdown %.
* **Direct vs Regular SIP Projection**: Interactive wealth-growth simulation projecting 10-year compounding differences on monthly SIPs.

### 9. Multi-Stock Quantitative Comparison
* **Side-by-Side Table & Radar**: Compares up to 10 stocks simultaneously on 5D Return %, Volatility, Volume Anomaly, RSI, and ML Regime Signals.
* **Zero Dummy Fallbacks**: Operates exclusively on genuine live API data; displays explicit retry error banners if API calls fail.

### 10. Tracked Watchlist
* **Single-Call Bulk API (`POST /api/stocks/bulk-signals`)**: Replaces N+1 parallel HTTP queries with a unified batch response for up to 50 stocks.
* **Dynamic Sorting**: Instant client-side sorting by Hype Score ↑, 5-Day Return ↑/↓, and Volatility.

### 11. Model Changelog & Retraining Audit
* **Model Registry Audit**: Tracks challenger vs champion model evaluations, F1-scores, accuracy metrics, and retraining logs.
* **In-Memory Cache Invalidation**: Automatic execution of `clear_symbol_model_caches(symbol)` upon challenger promotion to ensure stale model weights are immediately purged.

### 12. Academy & Formulas
* **Interactive Formula Reference**: Step-by-step explanations for Sharpe Ratio, Altman Z-Score, ARIMA differencing, and Bollinger Band calculations.
* **SEBI Compliance Manifesto**: Explicit documentation of educational disclaimers and regulatory boundaries.

---

## Security, Data Integrity & Compliance Standards

1. **SEBI/FINRA Non-Advisory Compliance**:
 - Disclaimer present on all views: `For education only. Not investment advice.`
 - Directional calls replaced with statistical bias labels (`POSITIVE BIAS`, `NEGATIVE BIAS`, `CONSOLIDATION`).
2. **CORS Security**:
 - `_get_allowed_origins()` dynamically parses environment variables and strictly blocks `null` and `*` origins to prevent cross-site request forgery (CSRF).
3. **Data Leakage Prevention**:
 - `WalkForwardSplitter` includes `embargo_horizon=3` days between training and test sets to eliminate forward target lookahead leakage.
4. **Cache Stampede Defense**:
 - SQLite cache manager enforces per-key `threading.Lock` mutexes with double-checked read patterns to handle concurrent traffic without database lock contention.

---

## Operations & Running Locally

### Backend Server
```bash
cd backend
python3 -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

### Frontend Server
```bash
cd frontend
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

*Documentation compiled for Clearward Platform release.*
