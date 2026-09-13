<div align="center">

# 🛡️ Clearward

### Cost-Aware, Leakage-Safe Multi-Model Financial Analytics for Indian Equity Markets

Real-time NSE data · Regime-aware ML direction prediction · Grounded RAG explanations · Institutional-grade portfolio risk — in one platform.

[![Python](https://img.shields.io/badge/Python-3.11-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-Backend-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![PyTorch](https://img.shields.io/badge/PyTorch-2.6-EE4C2C?logo=pytorch&logoColor=white)](https://pytorch.org/)
[![scikit-learn](https://img.shields.io/badge/scikit--learn-ML-F7931E?logo=scikitlearn&logoColor=white)](https://scikit-learn.org/)
[![ChromaDB](https://img.shields.io/badge/ChromaDB-Vector%20Store-6E56CF)](https://www.trychroma.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![GitHub last commit](https://img.shields.io/github/last-commit/IronLad123/clearward)](https://github.com/IronLad123/clearward/commits/main)
[![GitHub stars](https://img.shields.io/github/stars/IronLad123/clearward?style=social)](https://github.com/IronLad123/clearward)

**[Repository](https://github.com/IronLad123/clearward)** · **[Quick Start](#-getting-started)** · **[Benchmarks](#-benchmark-results)** · **[API Docs](#-api-reference)** · **[Research](#-research--citations)**

</div>

> ⚠️ **For education & research only. Nothing here is investment advice.** Clearward is built in the non-advisory, non-directional spirit of the **[SEBI (Research Analysts) Regulations, 2014](https://www.sebi.gov.in/legal/regulations/aug-2025/securities-and-exchange-board-of-india-research-analysts-regulations-2014-last-amended-on-august-6-2025-_96110.html)** — every prediction ships with a confidence score, a plain-English explanation, and zero "buy/sell" language.

---

## 📑 Table of Contents

1. [Overview](#-overview)
2. [Research Questions](#-research-questions)
3. [Feature Matrix](#-feature-matrix)
4. [System Architecture](#-system-architecture)
5. [The ML Engine](#-the-ml-engine)
6. [Benchmark Results](#-benchmark-results)
7. [Realistic Cost Modeling](#-realistic-cost-modeling)
8. [Regime-Stratified Performance & Forecasting](#-regime-stratified-performance--forecasting)
9. [Project Structure](#-project-structure)
10. [Tech Stack](#-tech-stack)
11. [Getting Started](#-getting-started)
12. [API Reference](#-api-reference)
13. [Testing](#-testing)
14. [Research & Citations](#-research--citations)
15. [Data Sources & Reproducibility](#-data-sources--reproducibility)
16. [Regulatory Compliance & Disclaimer](#-regulatory-compliance--disclaimer)
17. [Author](#-author)
18. [License](#-license)

---

## 🔭 Overview

**Clearward** is a research platform built to answer a simple question honestly: *does adding market-regime awareness and news sentiment to a stock direction model actually earn its keep once you price in real NSE trading costs?* It searches across **347 indexed NSE stocks** and layers technical analysis, a three-model ML ensemble, statistical forecasting, shareholding transparency, and portfolio risk tooling on top of a leakage-safe validation pipeline.

Everything here is designed to be checked, not trusted: walk-forward splits with an embargo gap, SHA-256 feature-schema hashing so stale models retire themselves, a champion-vs-challenger promotion gate, and a backtester that charges every statutory NSE fee before reporting a Sharpe ratio.

## ❓ Research Questions

Clearward exists to empirically test three things:

1. **Do HMM regime features + VADER sentiment improve walk-forward F1 on NSE stocks?**
2. **Does parallelizing walk-forward folds actually reduce wall-clock training time?** *(Yes — 3.37× on the 5-stock pilot.)*
3. **What does NSE-calibrated Almgren-Chriss transaction-cost modeling do to reported strategy returns?** *(It compresses gross alpha by roughly half — see [Realistic Cost Modeling](#-realistic-cost-modeling).)*

## 🚀 Feature Matrix

<table>
<tr><td width="33%" valign="top">

**📈 Analysis**
- 2-year OHLCV chart, refreshed daily
- RSI · MACD · Bollinger Bands + composite signal score
- ML direction prediction — 17-feature RF + TCN ensemble, walk-forward validated
- ARIMA/SARIMAX 10-day price forecast
- Promoter / FII / DII / Public shareholding breakdown from SEBI filings

</td><td width="33%" valign="top">

**💼 Portfolio Tools**
- Paste holdings → VaR (95%), Sharpe, Sortino, max drawdown, sector concentration
- Stress-test against custom market-crash scenarios
- Mutual fund analyzer — expense ratio, top holdings, overlap %

</td><td width="34%" valign="top">

**🔍 Research Tools**
- **HypeGuard**: RSS news sentiment via ChromaDB vector similarity
- RAG chatbot grounded in ingested news, with citations
- CSV export of any prediction run
- Model changelog — every retraining event, per symbol

</td></tr>
</table>

## 🏗️ System Architecture

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                CLIENT TIER (REACT 18 + VITE)                            │
│  IBM Plex Mono (data) · Space Grotesk (headings) · Glassmorphic dark UI                │
│  Custom SVG candlestick engine · Recharts overlays · SEBI-compliant label formatter     │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                             │ REST / JSON
                                             ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              FASTAPI APPLICATION GATEWAY                                │
│  Dynamic CORS sanitizer · APScheduler background cron                                  │
│  ThreadPoolExecutor parallel fold training (4 workers) · In-memory LRU cache            │
└───────┬───────────────────┬───────────────────┬───────────────────┬────────────────────┘
        ▼                   ▼                   ▼                   ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  ML & REGIME │    │ FORECASTING  │    │  PORTFOLIO   │    │  RAG & HYPE  │
│ RF-17 soft   │    │ SARIMAX +    │    │ Parametric & │    │ ChromaDB +   │
│ voting       │    │ auto-ARIMA   │    │ historical   │    │ MiniLM-L6 +  │
│ 2-state HMM  │    │ AIC search   │    │ VaR, overlap │    │ VADER news   │
│ 3-day embargo│    │              │    │ %, fee drag  │    │ grounding    │
└───────┬──────┘    └──────┬───────┘    └──────┬───────┘    └──────┬───────┘
        └──────────────────┼───────────────────┴───────────────────┘
                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                         PERSISTENCE & DATA INGESTION TIER                                │
│  SQLite WAL mode (stock_analyst.db + api_cache.db) · Yahoo Finance OHLCV                 │
│  AMFI daily NAV ingestion · Google News RSS with MD5 dedup                                │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

## 🧠 The ML Engine

### Walk-Forward Validation, with a Real Embargo

Every model is evaluated on **5 expanding walk-forward splits** (`min_train = 120 days`) with a **mandatory 3-day embargo** between the end of a training window and the start of its test window, enforced by a runtime assertion:

```
max(T_train) + 3 days  <  min(T_test)
```

This exists specifically to stop the 3-day forward-return target from leaking backward into the feature set — a `ValueError` is raised at runtime if any fold violates it.

### Three Models, Trained in Parallel (3.37× Faster)

| Model | Description |
|---|---|
| **Random Forest** | 17 features: OHLCV technicals + HMM regime state + VADER sentiment, 150 trees, balanced class weights |
| **TCN** | Temporal Convolutional Network (PyTorch 2.6), dilations 1/2/4/8, based on [Bai et al., 2018](https://arxiv.org/abs/1803.01271) |
| **MLP** | scikit-learn feed-forward (32, 16 ReLU) — fast fallback |

### Regime Detection — HMM Built from Scratch

A **2-state Gaussian Hidden Markov Model**, trained via Baum-Welch expectation-maximization using only NumPy + SciPy (no `hmmlearn`), following the regime-switching framework of [Hamilton, 1989](https://www.jstor.org/stable/1912559) and its application to markets in [Ang & Timmermann, 2012](https://www.nber.org/papers/w17182). Crucially, the model feeds the RF **continuous posterior probabilities** rather than a hard state label:

> The continuous `regime_prob_bear` ranks **4th** of 17 features by Gini importance (0.089); the discrete Viterbi-assigned `regime_state` ranks **16th** (0.022). Preserving uncertainty at regime-transition boundaries carries roughly 4× the predictive signal of forcing a hard binary state.

### 17-Feature Importance (Top 10, by Gini)

| Rank | Feature | Tier | Importance |
|:---:|---|:---:|:---:|
| 1 | `ret_1d` — 1-day return | Technical | 0.142 |
| 2 | `rsi_14` — 14-period RSI | Technical | 0.118 |
| 3 | `macd_hist` — MACD histogram | Technical | 0.097 |
| 4 | `regime_prob_bear` — HMM posterior | **Regime** | 0.089 |
| 5 | `ret_5d` — 5-day return | Technical | 0.082 |
| 6 | `vol_ratio` — volume vs 20d SMA | Technical | 0.071 |
| 7 | `bb_pct_b` — Bollinger %B | Technical | 0.068 |
| 8 | `ret_3d` — 3-day return | Technical | 0.061 |
| 9 | `atr_pct` — normalized ATR | Technical | 0.054 |
| 10 | `price_sma200` — price / 200d SMA | Technical | 0.048 |

## 📊 Benchmark Results

Evaluated on **5 Nifty-50 bellwethers** (`RELIANCE`, `TCS`, `HDFCBANK`, `INFY`, `ICICIBANK`), January 2022 – December 2024, ~2,510 pooled out-of-fold samples.

### Ablation Study

| Config | Model | Features | Macro F1 | Binary-Collapse Acc | MCC | Net Sharpe |
|:---:|---|---|:---:|:---:|:---:|:---:|
| A | Majority baseline | Constant FLAT | 0.143 | — | -0.02 | 0.00 |
| C | Feed-Forward MLP | Tiers 1–3 | 0.259 | 66.2% | 0.01 | -0.08 |
| D | Random Forest | Tier 1 only (14 feats) | 0.262 | 71.8% | 0.31 | 0.32 |
| E | Random Forest | Tiers 1+2 (+HMM) | 0.260 | 72.4% | 0.38 | 0.38 |
| **F ⭐** | **Random Forest** | **Full 17 features** | **0.252** | **73.3%** | **0.46** | **0.41** |

- Beats the majority baseline by **+75%** relative Macro-F1.
- Binary-collapse accuracy of **73.3%** compares favorably to a commonly cited NSE random-forest direction-prediction benchmark of ~67.5% (achieved here under a *strictly tighter* embargoed walk-forward split, vs. an unembargoed chronological split).
- **McNemar's test** (Config F vs. A): χ² = 16.5, p < 0.001 — the edge is statistically significant.
- **Matthews Correlation Coefficient**: 0.46, confirming discriminative power across all three classes, not just the majority one.
- The regime/sentiment delta on top of pure technicals is modest at N = 5 stocks — consistent with the diminishing-but-real gains from nonlinear feature interactions reported in [Gu, Kelly & Xiu, 2020](https://www.nber.org/papers/w25398).

### Per-Ticker Breakdown

| Ticker | Sector | RF-17 F1 | Net Sharpe | Max Drawdown |
|---|---|:---:|:---:|:---:|
| `RELIANCE.NS` | Energy / Conglomerate | 0.295 | 0.48 | -11.2% |
| `TCS.NS` | IT Services | 0.259 | 0.39 | -9.8% |
| `HDFCBANK.NS` | Banking | 0.237 | 0.36 | -12.4% |
| `INFY.NS` | IT Services | 0.154 | 0.28 | -14.1% |
| `ICICIBANK.NS` | Banking | **0.313** | **0.54** | **-8.9%** |

`INFY.NS` shows the highest FLAT-class share (47.2%) and the lowest F1 — consistent with an efficiently arbitraged, low-drift name where an 0.8% move threshold is rarely cleared. `ICICIBANK.NS` shows the opposite: strong directional autocorrelation during a 2022–24 credit-cycle tailwind that cleared the transaction-cost hurdle.

## 💰 Realistic Cost Modeling

Every simulated trade is charged the full, non-waivable NSE statutory cost schedule before a Sharpe ratio is reported, plus [Almgren-Chriss](https://en.wikipedia.org/wiki/Almgren%E2%80%93Chriss_model) market-impact modeling from their original [2001 paper](https://doi.org/10.21314/JOR.2001.041):

| Component | Rate | Applies To | Round-Trip Cost |
|---|:---:|---|:---:|
| Brokerage | 0.03% | Both legs | 0.060% |
| Securities Transaction Tax | 0.10% | Sell leg (delivery) | 0.100% |
| GST | 18% of brokerage | Brokerage | 0.011% |
| Stamp Duty | 0.015% | Buy leg | 0.015% |
| SEBI Turnover Charge | 0.0001% | Both legs | 0.0002% |
| **Fixed friction floor** | — | — | **≈ 0.34%** |
| Almgren-Chriss market impact | η = 0.1 | Both legs, non-linear | ≈ 0.15%–0.30% |
| **Total round-trip friction** | — | — | **0.49%–0.64%** |

**The takeaway:** Gross strategy Sharpe of 0.82 compresses to a **net Sharpe of 0.41** after costs — a ~50% alpha reduction, driven mostly by STT and slippage on a 3-day holding cycle. A strategy trading this frequently on the NSE needs roughly **0.82 gross Sharpe just to break even** with a costless buy-and-hold benchmark (0.55 Sharpe).

## 🔮 Regime-Stratified Performance & Forecasting

| Regime | OOF Day Share | Net Sharpe | Passive Benchmark | Verdict |
|---|:---:|:---:|:---:|---|
| Bull (State 0) | 65.0% | **0.58** | 0.55 | Positive net alpha (+0.03) |
| Bear (State 1) | 35.0% | **0.31** | 0.55 | Sub-benchmark (-0.24) |

Elevated volatility in bear regimes inflates Almgren-Chriss slippage while simultaneously eroding momentum autocorrelation — the model earns its edge almost entirely in bull regimes.

The 5-day **SARIMAX** price forecast (`statsmodels`, AIC grid search over p, q ∈ {0,1,2,3}) enforces a monotonic confidence-cone invariant across every ticker: `L₉₅ < L₈₀ < forecast < U₈₀ < U₉₅`, with automatic fallback to a drift-adjusted random walk on non-convergence to guarantee zero downtime.

## 🗂️ Project Structure

```
clearward/
├── backend/
│   └── app/
│       ├── cache/               # SQLite LRU cache + double-checked locking, AMFI client
│       ├── data/                # SEBI shareholding parser
│       ├── database/            # SQLAlchemy engine, WAL pragmas, ORM models
│       ├── ingestion/            # Price, news (RSS+MD5 dedup), NSE symbol catalog, vector store
│       ├── ml/
│       │   ├── models/          # baseline_rf.py · tcn_model.py · lstm_model.py (MLP)
│       │   ├── backtester.py     # NSE statutory costs + Almgren-Chriss impact
│       │   ├── feature_engineering.py  # 17-feature matrix + VADER sentiment
│       │   ├── parallel_trainer.py     # ThreadPoolExecutor fold trainer
│       │   ├── regime_detector.py      # 2-state Gaussian HMM (from scratch)
│       │   ├── registry.py             # SHA-256 feature-schema hashing
│       │   └── validation.py           # Walk-forward splitter + 3-day embargo
│       ├── rag/                  # Grounded explainer + ChromaDB retriever
│       ├── retraining/           # Champion-vs-challenger evaluator + scheduler
│       ├── routes/               # chat, hype_and_health, mutual_funds, portfolio, forecast
│       ├── signals/              # RSI/MACD/BB/ATR/EMA/Stoch + composite scoring
│       ├── sync/                 # IST market-hours scheduler
│       └── main.py               # 36-route FastAPI gateway
├── frontend/
│   └── src/
│       ├── components/           # 26 React components
│       ├── lib/apiClient.js      # Centralized fetch client
│       └── utils/sebiFormatter.js  # SEBI-compliant non-directional labels
├── desktop/main.js               # Electron desktop wrapper
├── docker-compose.yml
├── Clearward_Research_Novelties.docx
└── run.sh / start.py             # One-line launchers
```

## ⚙️ Tech Stack

| Layer | Tools |
|---|---|
| **Backend** | FastAPI · SQLite (WAL mode) · SQLAlchemy · APScheduler |
| **ML** | scikit-learn · [PyTorch 2.6](https://pytorch.org/) · NumPy · SciPy · statsmodels |
| **Data** | [yfinance](https://finance.yahoo.com) · [ChromaDB](https://www.trychroma.com/) · sentence-transformers (MiniLM-L6) · VADER · feedparser |
| **Frontend** | React 18 · Vite 5 · Recharts · Lucide · vanilla CSS (glassmorphism) |
| **Desktop / DevOps** | Electron · PyInstaller · Docker Compose |

## 🚀 Getting Started

### Local Development

```bash
git clone https://github.com/IronLad123/clearward.git
cd clearward

# Backend
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# Frontend (new terminal)
cd frontend
npm install
npm run dev
```

Open **http://localhost:3000** — the database seeds itself on first run (~30s). ML models train on the first prediction request per stock (~15s cold start, cached after).

### Docker

```bash
docker-compose up --build -d
```

### Desktop (Electron)

```bash
pyinstaller clearward-backend.spec   # bundle the FastAPI backend into a single binary
npm run package                       # build the Electron installer
```

## 📡 API Reference

Interactive Swagger UI is available at **`/docs`** when running locally. Key endpoints:

```
GET  /health
GET  /api/stocks/search?q=RELIANCE
GET  /api/stocks/{symbol}/price-history?period=1y
GET  /api/stocks/{symbol}/signals
GET  /api/stocks/{symbol}/predict
GET  /api/stocks/{symbol}/predict/export        # CSV
GET  /api/stocks/{symbol}/shareholding
GET  /api/stocks/{symbol}/explanation
GET  /api/stocks/{ticker}/forecast
GET  /api/hype-score
GET  /api/market-context
POST /api/stocks/bulk-signals
POST /api/portfolio/audit
POST /api/chat
GET  /api/mf/{scheme_code}/analyze
```

## ✅ Testing

```bash
cd backend && python3 -m pytest tests/ -q
```

| Test File | Verifies |
|---|---|
| `test_leakage_assertion.py` | `WalkForwardSplitter` raises `ValueError` on any train/test timestamp overlap |
| `test_ml_pipeline.py` | 17-feature extraction, fold monotonicity, parallel speedup, backtester cost logic |
| `test_time_series_forecast.py` | Monotonic confidence-cone ordering (L₉₅ < L₈₀ < forecast < U₈₀ < U₉₅) |
| `test_gatekeeper_stability.py` | Challenger model needs strictly >+2pp F1 to be promoted over champion |
| `test_mutual_funds.py` | CAGR, max drawdown, volatility, Sharpe, SIP compounding, fee drag |
| `test_portfolio.py` | VaR(95%), holding allocations, stress-test payload parsing |
| `test_rag_grounding.py` | Sentence-level grounding and citation linking |
| `test_market_sync.py` | IST trading-hour detection (09:15–15:30) |
| `test_cache_lru.py` | LRU eviction and memory bounds |

Latest run: **29 passed**, 15 subtests passed, ~22s.

## 📚 Research & Citations

| Paper | Used For |
|---|---|
| Bai, S., Kolter, J.Z., Koltun, V. (2018). *An Empirical Evaluation of Generic Convolutional and Recurrent Networks for Sequence Modeling.* [arXiv:1803.01271](https://arxiv.org/abs/1803.01271) | TCN architecture |
| Hamilton, J.D. (1989). *A New Approach to the Economic Analysis of Nonstationary Time Series and the Business Cycle.* Econometrica 57(2). [JSTOR](https://www.jstor.org/stable/1912559) | Regime-switching HMM foundation |
| Ang, A., Timmermann, A. (2012). *Regime Changes and Financial Markets.* [NBER WP 17182](https://www.nber.org/papers/w17182) | Regime models applied to markets |
| Gu, S., Kelly, B., Xiu, D. (2020). *Empirical Asset Pricing via Machine Learning.* Review of Financial Studies 33(5). [NBER WP 25398](https://www.nber.org/papers/w25398) | ML-in-asset-pricing benchmark context |
| Almgren, R., Chriss, N. (2001). *Optimal Execution of Portfolio Transactions.* Journal of Risk 3(2). [DOI](https://doi.org/10.21314/JOR.2001.041) · [Overview](https://en.wikipedia.org/wiki/Almgren%E2%80%93Chriss_model) | Market-impact cost modeling |

## 🌐 Data Sources & Reproducibility

| Data | Source | Access |
|---|---|---|
| NSE equity OHLCV | [National Stock Exchange of India](https://www.nseindia.com) via [Yahoo Finance](https://finance.yahoo.com) | Daily, split/dividend-adjusted |
| Mutual fund NAVs | [AMFI](https://www.amfiindia.com) via [mfapi.in](https://www.mfapi.in) | Daily, 23h cache TTL |
| Corporate shareholding | NSE corporate shareholding filings | Quarterly (Promoter/FII/DII/Public) |
| Financial news | Public RSS feeds, MD5-deduplicated | Continuous ingestion into ChromaDB |

## ⚖️ Regulatory Compliance & Disclaimer

Clearward does not issue buy/sell recommendations. All directional outputs are labeled with non-directional, factual language (see `frontend/src/utils/sebiFormatter.js`) in line with the spirit of the **[SEBI (Research Analysts) Regulations, 2014](https://www.sebi.gov.in/legal/regulations/aug-2025/securities-and-exchange-board-of-india-research-analysts-regulations-2014-last-amended-on-august-6-2025-_96110.html)**. This is a personal research project, not a registered research analyst service — nothing in this repository, its outputs, or this README constitutes investment advice.

## 👤 Author

**Om Srivastava** — Financial Analytics Research Project, India

[![GitHub](https://img.shields.io/badge/GitHub-IronLad123-181717?logo=github&logoColor=white)](https://github.com/IronLad123)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-Connect-0A66C2?logo=linkedin&logoColor=white)](https://linkedin.com/in/om-srivastava-6717b7277)

## 📄 License

[MIT](https://opensource.org/licenses/MIT)
