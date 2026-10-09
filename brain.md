# 🧠 CLEARWARD MASTER ARCHITECTURAL BRAIN (brain.md)
> **Definitive Technical Blueprint, Quantitative Formulations, End-to-End Data Flows, REST API Contracts, and Component Reference**  
> *Target Audience: Autonomous AI Agents, Quantitative Engineers, System Auditors, Full-Stack Developers*  
> *System Version: 2.4.0 (Production)*  
> *Regulatory Standard: SEBI (Research Analysts) Regulations, 2014 (Non-Advisory, Factual, Non-Directional)*

---

## 📑 TABLE OF CONTENTS
1. [System Topology & High-Level Architecture](#1-system-topology--high-level-architecture)
2. [Codebase Directory & File Manifest](#2-codebase-directory--file-manifest)
3. [Database Architecture & Complete Schema DDL (SQLite WAL)](#3-database-architecture--complete-schema-ddl-sqlite-wal)
4. [Data Ingestion, Normalization & Caching Layer](#4-data-ingestion-normalization--caching-layer)
5. [Technical Indicator & Signal Engine](#5-technical-indicator--signal-engine)
6. [Machine Learning & Quantitative Modeling Engine](#6-machine-learning--quantitative-modeling-engine)
   - 6.1 17-Feature Extraction Pipeline
   - 6.2 Purged Walk-Forward Splitter with 3-Day Embargo
   - 6.3 2-State Gaussian Hidden Markov Model (HMM) from Scratch
   - 6.4 Random Forest Classifier with Parallel Recency-Weighted Soft Voting
   - 6.5 Temporal Convolutional Network (TCN) Sequence Classifier
   - 6.6 Realistic NSE Backtester with Statutory Cost Schedule & Almgren-Chriss Impact
   - 6.7 Model Registry, Champion-Challenger Evaluator & Cache Invalidation
7. [Statistical Time-Series Forecasting Engine (ARIMA / SARIMAX)](#7-statistical-time-series-forecasting-engine-arima--sarimax)
8. [RAG Grounded Explainer & ChromaDB Vector Store](#8-rag-grounded-explainer--chromadb-vector-store)
9. [Portfolio Health Doctor & Mutual Fund Analytics Engine](#9-portfolio-health-doctor--mutual-fund-analytics-engine)
10. [Hype Guard & Behavioral Risk Defense Engine](#10-hype-guard--behavioral-risk-defense-engine)
11. [Exhaustive REST API Contract & Payload Reference](#11-exhaustive-rest-api-contract--payload-reference)
12. [Frontend React 18 Architecture & 26-Component Catalog](#12-frontend-react-18-architecture--26-component-catalog)
13. [Security, Concurrency & SEBI Regulatory Compliance](#13-security-concurrency--sebi-regulatory-compliance)
14. [Edge-Case, Fallback & Failure Recovery Matrix](#14-edge-case-fallback--failure-recovery-matrix)
15. [Verification & Test Suite Map](#15-verification--test-suite-map)
16. [Operations, Desktop Packaging & Deployment Guide](#16-operations-desktop-packaging--deployment-guide)
17. [Data Availability, External Sources & Reproducibility Repository](#17-data-availability-external-sources--reproducibility-repository)
18. [IEEE Publication Pipeline & Research Artifacts](#18-ieee-publication-pipeline--research-artifacts)

---

## 1. System Topology & High-Level Architecture

Clearward is an institutional-grade financial analytics and risk defense platform built for Indian equities (NSE/BSE) and AMFI mutual funds. It combines strict time-series statistical modeling, machine learning direction classifiers, grounded RAG explanation, and non-advisory compliance safeguards.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                CLIENT TIER (REACT 18 + VITE)                           │
│  • IBM Plex Mono (Data/Quotes) & Space Grotesk (Headings) • Glassmorphic Dark UI       │
│  • Custom SVG Candlestick Engine • Recharts Overlays • SEBI Formatter & Risk Cockpit   │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │ REST / JSON via apiClient.js (Vite Proxy / Base URL)
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              FASTAPI APPLICATION GATEWAY                               │
│  • Dynamic CORS Sanitizer (Strictly Rejects 'null' & '*') • APScheduler Background Cron│
│  • ThreadPoolExecutor Parallel Fold Training (4 workers) • In-Memory LRU Cache         │
└───────┬───────────────────┬───────────────────┬───────────────────┬────────────────────┘
        │                   │                   │                   │
        ▼                   ▼                   ▼                   ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  ML & REGIME │    │ FORECASTING  │    │  PORTFOLIO   │    │  RAG & HYPE  │
│ • RF-17 Soft │    │ • SARIMAX    │    │ • Parametric │    │ • ChromaDB   │
│   Voting     │    │   Engine     │    │   & Hist VaR │    │ • MiniLM-L6  │
│ • Scratch HMM│    │ • Auto-ARIMA │    │ • Overlap %  │    │ • VADER News │
│ • 3d Embargo │    │   AIC Search │    │ • Fee Drag   │    │ • Grounding  │
└───────┬──────┘    └──────┬───────┘    └──────┬───────┘    └──────┬───────┘
        │                  │                   │                   │
        └──────────────────┼───────────────────┴───────────────────┘
                           ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                         PERSISTENCE & DATA INGESTION TIER                              │
│  • SQLite WAL Mode (stock_analyst.db & api_cache.db) with Double-Checked Locks         │
│  • Yahoo Finance Historical OHLCV • AMFI mfapi.in Daily NAV Ingestion                  │
│  • Google News RSS Feeds with MD5 Hash Signature Deduplication                         │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Codebase Directory & File Manifest

```
Financial_Analytics_Project/
├── backend/
│   ├── app/
│   │   ├── cache/
│   │   │   ├── __init__.py            # Cache package initializer (exports get_cached, set_cached)
│   │   │   ├── cache_manager.py       # SQLite cache with threading.Lock double-checked mutex & LRU
│   │   │   └── mf_client.py           # AMFI Mutual Fund API client (mfapi.in, 23h TTL)
│   │   ├── data/
│   │   │   ├── __init__.py            # Data package initializer
│   │   │   └── shareholding.py        # SEBI promoter/FII/DII/public shareholding parser
│   │   ├── database/
│   │   │   ├── db.py                  # SQLAlchemy engine, session maker, SQLite WAL pragmas
│   │   │   └── models.py              # SQLite ORM models (Stock, PriceHistory, SignalRecord, ModelRegistry)
│   │   ├── ingestion/
│   │   │   ├── news_scraper.py        # RSS news scraper with MD5 hash deduplication
│   │   │   ├── nse_symbol_catalog.py  # 347+ NSE/BSE stock catalog with sector classifications
│   │   │   ├── price_ingestion.py     # Yahoo Finance historical OHLCV fetcher & normalizer
│   │   │   └── vector_store.py        # ChromaDB vector store + sentence-transformers (MiniLM-L6)
│   │   ├── ml/
│   │   │   ├── models/
│   │   │   │   ├── baseline_rf.py     # 150-tree Random Forest Direction Classifier (Balanced weights)
│   │   │   │   ├── lstm_model.py      # MLP Neural Net (legacy name LSTMDirectionClassifier, [32, 16] ReLU)
│   │   │   │   └── tcn_model.py       # PyTorch Temporal Convolutional Network (TCN, 3 dilated blocks)
│   │   │   ├── backtester.py          # Realistic backtester with full NSE transaction costs & Almgren-Chriss
│   │   │   ├── feature_engineering.py # 17-feature matrix creation + VADER news sentiment
│   │   │   ├── parallel_trainer.py    # ThreadPoolExecutor parallel fold trainer with recency decay
│   │   │   ├── regime_detector.py     # 2-state Gaussian HMM Baum-Welch EM from scratch (NumPy/SciPy)
│   │   │   ├── registry.py            # Model metadata registry & SHA-256 schema hashing
│   │   │   └── validation.py          # WalkForwardSplitter with 3-day embargo & timestamp assertion
│   │   ├── rag/
│   │   │   ├── explainer.py           # Grounded explanation generator, citation links & SEBI follow-ups
│   │   │   └── retriever.py           # ChromaDB semantic snippet retriever
│   │   ├── retraining/
│   │   │   ├── evaluator.py           # Challenger vs Champion evaluator & model promoter
│   │   │   └── scheduler.py           # APScheduler background retraining & cache purge jobs
│   │   ├── routes/
│   │   │   ├── chat.py                # POST /api/chat RAG conversational endpoint with Gemini + fallback
│   │   │   ├── hype_and_health.py     # GET /api/hype-score & /api/market-context
│   │   │   ├── mutual_funds.py        # AMFI search, NAV history, fee-drag, CAGR audit
│   │   │   ├── portfolio.py           # Multi-asset VaR, overlap matrix & stress tests
│   │   │   └── time_series_forecast.py# SARIMAX / ARIMA AIC grid search & confidence cones
│   │   ├── signals/
│   │   │   ├── indicators.py          # Technical indicators (RSI, MACD, BB, ATR, EMA, Stoch)
│   │   │   └── signal_filter.py       # Composite signal rules and scoring
│   │   ├── sync/
│   │   │   └── market_sync.py         # Market hours sync scheduler (IST 09:15-15:30)
│   │   ├── config.py                  # Environment config, paths, API settings
│   │   └── main.py                    # Root FastAPI router (36 endpoints), CORS, lifecycle
│   ├── data/
│   │   ├── stock_analyst.db           # Primary SQLite database
│   │   ├── api_cache.db               # SQLite cache database
│   │   └── chroma_db/                 # Persistent ChromaDB vector store
│   ├── scripts/
│   │   ├── bulk_backfill.py           # Bulk OHLCV backfiller across all 347 stocks
│   │   └── run_ablation.py            # 5-stock / universe ablation experiment runner
│   ├── tests/                         # 10 test modules (29 unit & integration tests)
│   ├── requirements.txt               # Pinned Python dependencies
│   └── Dockerfile                     # Containerization specification
├── desktop/
│   └── main.js                        # Electron desktop runtime wrapper
├── frontend/
│   ├── src/
│   │   ├── components/                # 26 React modular UI components
│   │   ├── lib/
│   │   │   └── apiClient.js           # Centralized fetch client (VITE_API_URL fallback)
│   │   ├── utils/
│   │   │   └── sebiFormatter.js       # SEBI non-directional label formatter
│   │   ├── App.jsx                    # Root view controller & state orchestrator
│   │   ├── index.css                  # Design system tokens, typography, glassmorphism
│   │   └── main.jsx                   # React DOM entry point
│   ├── package.json                   # React 18, Vite 5, Recharts, Lucide
│   └── vite.config.js                 # Proxy config & build settings
├── clearward-backend.spec             # PyInstaller desktop bundling spec
├── electron-builder.json              # Electron packaging configuration
├── docker-compose.yml                 # Docker Compose multi-service spec
├── run.sh                             # Development start script
└── start.py                           # Cross-platform startup launcher
```

---

## 3. Database Architecture & Complete Schema DDL (SQLite WAL)

Clearward utilizes two SQLite databases:
1. `stock_analyst.db`: Primary entity store managed by SQLAlchemy ORM.
2. `api_cache.db`: High-performance key-value cache database with automatic TTL and LRU eviction.

Engine initialization in `backend/app/database/db.py` sets SQLite pragmas:
```sql
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA busy_timeout = 5000;
PRAGMA foreign_keys = ON;
```

### Complete Schema DDL

```sql
-- 1. STOCKS TABLE (Entity: Stock in models.py)
CREATE TABLE IF NOT EXISTS stocks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    symbol VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    exchange VARCHAR(20),
    sector VARCHAR(50),
    last_fetched_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS ix_stocks_id ON stocks(id);
CREATE INDEX IF NOT EXISTS ix_stocks_symbol ON stocks(symbol);

-- 2. PRICE HISTORIES TABLE (Entity: PriceHistory in models.py)
CREATE TABLE IF NOT EXISTS price_histories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    symbol VARCHAR(20) NOT NULL,
    date DATETIME NOT NULL,
    open REAL NOT NULL,
    high REAL NOT NULL,
    low REAL NOT NULL,
    close REAL NOT NULL,
    adj_close REAL,
    volume REAL NOT NULL,
    CONSTRAINT uix_symbol_date UNIQUE (symbol, date)
);
CREATE INDEX IF NOT EXISTS ix_price_histories_id ON price_histories(id);
CREATE INDEX IF NOT EXISTS ix_price_histories_symbol ON price_histories(symbol);
CREATE INDEX IF NOT EXISTS ix_price_histories_date ON price_histories(date);
CREATE INDEX IF NOT EXISTS idx_symbol_date ON price_histories(symbol, date);

-- 3. TECHNICAL SIGNALS TABLE (Entity: TechnicalSignal in models.py)
CREATE TABLE IF NOT EXISTS technical_signals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    symbol VARCHAR(20) NOT NULL,
    date DATETIME NOT NULL,
    signal_type VARCHAR(50) NOT NULL,
    direction VARCHAR(10) NOT NULL,
    confidence REAL NOT NULL,
    details_json TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS ix_technical_signals_id ON technical_signals(id);
CREATE INDEX IF NOT EXISTS ix_technical_signals_symbol ON technical_signals(symbol);
CREATE INDEX IF NOT EXISTS ix_technical_signals_date ON technical_signals(date);

-- 4. MODEL REGISTRY TABLE (Entity: ModelRegistry in models.py)
CREATE TABLE IF NOT EXISTS model_registry (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    model_name VARCHAR(50) NOT NULL,
    version VARCHAR(20) NOT NULL,
    is_champion BOOLEAN DEFAULT 0,
    filepath VARCHAR(255) NOT NULL,
    train_end_date DATETIME NOT NULL,
    accuracy REAL NOT NULL,
    f1_score REAL NOT NULL,
    sharpe_ratio REAL,
    decision VARCHAR(20) DEFAULT 'PROMOTED',
    reason TEXT,
    metrics_json TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uix_model_version UNIQUE (model_name, version)
);
CREATE INDEX IF NOT EXISTS ix_model_registry_id ON model_registry(id);
CREATE INDEX IF NOT EXISTS ix_model_registry_model_name ON model_registry(model_name);

-- 5. API CACHE TABLE (api_cache.db)
CREATE TABLE IF NOT EXISTS api_cache (
    cache_key TEXT PRIMARY KEY,
    category TEXT NOT NULL,
    identifier TEXT NOT NULL,
    params_hash TEXT NOT NULL,
    response_json TEXT NOT NULL,
    created_at REAL NOT NULL,
    expires_at REAL NOT NULL,
    hit_count INTEGER DEFAULT 0,
    last_hit_at REAL
);
CREATE INDEX IF NOT EXISTS idx_category ON api_cache(category);
CREATE INDEX IF NOT EXISTS idx_expires ON api_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_last_hit ON api_cache(category, last_hit_at DESC);
```

---

## 4. Data Ingestion, Normalization & Caching Layer

### 4.1 Price Ingestion Engine (`price_ingestion.py`)
- **Symbol Translation**: Automatically appends `.NS` for Indian equities if no exchange suffix is supplied.
- **Cleaning & Backfill**: Validates non-zero trading volumes, drops duplicate timestamps, forward-fills corporate action holidays, and persists to `price_histories`.
- **Database Upsert**: Implements SQLite `ON CONFLICT(symbol, date) DO UPDATE` to keep history updated idempotently.

### 4.2 RSS News Scraper & Deduplication (`news_scraper.py`)
- Scrapes financial feeds for 347+ tickers.
- Generates a deterministic MD5 hash:
  $$\text{ID} = \text{MD5}(\text{symbol} + \text{"\_"} + \text{title.strip().lower()} + \text{"\_"} + \text{published\_date})$$
- Prevents redundant embedding generation in ChromaDB on system restart.

### 4.3 Shareholding Parser (`shareholding.py`)
- Scrapes official SEBI filing shareholding patterns from the NSE API (`https://www.nseindia.com/api/corporate-share-holdings-master`).
- Automatically extracts Promoter, FII (Foreign Institutional Investors), DII (Domestic Mutual Funds & Insurance), and Public retail holdings.
- Fallback: Gracefully pulls Yahoo Finance `major_holders` if NSE endpoint throttles.

### 4.4 Cache Stampede Defense & LRU Eviction (`cache_manager.py`)
- **Per-Key Mutex**: Thread-safe dictionary of `threading.Lock()` mutexes prevents duplicate expensive computations.
- **Double-Checked Locking**: Checks cache before and after acquiring lock.
- **LRU Stock Eviction**: Retains a maximum of 30 recently peeked stocks in cache (`DEFAULT_MAX_RECENTLY_PEEKED_STOCKS = 30`), automatically evicting oldest accessed keys during maintenance cycles.
- **AMFI Mutual Fund TTL**: 23 hours (`82,800 seconds`), matching AMFI daily NAV publication schedules.

---

## 5. Technical Indicator & Signal Engine

Implemented in `backend/app/signals/indicators.py` & `signal_filter.py`.

### Formulations

1. **Relative Strength Index (RSI - 14 Periods)**:
   $$\text{RS} = \frac{\text{EMA}_{14}(\max(0, P_t - P_{t-1}))}{\text{EMA}_{14}(\max(0, P_{t-1} - P_t))}, \quad \text{RSI} = 100 - \left(\frac{100}{1 + \text{RS}}\right)$$

2. **Moving Average Convergence Divergence (MACD - 12, 26, 9)**:
   $$\text{MACD Line} = \text{EMA}_{12}(P) - \text{EMA}_{26}(P), \quad \text{Signal Line} = \text{EMA}_9(\text{MACD Line})$$
   $$\text{MACD Histogram} = \text{MACD Line} - \text{Signal Line}$$

3. **Bollinger Bands (20 Periods, 2.0 Standard Deviations)**:
   $$\text{Middle Band} = \text{SMA}_{20}(P), \quad \sigma_{20} = \text{StdDev}_{20}(P)$$
   $$\text{Upper Band} = \text{Middle} + 2.0 \cdot \sigma_{20}, \quad \text{Lower Band} = \text{Middle} - 2.0 \cdot \sigma_{20}$$
   $$\text{\%B} = \frac{P - \text{Lower}}{\text{Upper} - \text{Lower}}$$

4. **Average True Range (ATR - 14 Periods)**:
   $$\text{TR}_t = \max\left(H_t - L_t, \; |H_t - C_{t-1}|, \; |L_t - C_{t-1}|\right)$$
   $$\text{ATR}_{14} = \text{EMA}_{14}(\text{TR}), \quad \text{ATR \%} = \frac{\text{ATR}_{14}}{C_t}$$

5. **Stochastic Oscillator (\%K - 14 Periods)**:
   $$\%K = \frac{C_t - \min_{14}(L)}{\max_{14}(H) - \min_{14}(L)} \in [0, 1]$$

6. **Composite Signal Rules (`signal_filter.py`)**:
   - `MACD_BULLISH_CROSSOVER`: $\text{Hist}_{t-1} < 0 \land \text{Hist}_t > 0 \land \text{RSI} < 55$ (Base conf: 0.65, Volume boost: +0.15, Low %B boost: +0.10).
   - `RSI_OVERSOLD_REVERSAL`: $\text{RSI}_{t-1} < 30 \land \text{RSI}_t > 30 \land \text{\%B} < 0.2$ (Conf: 0.70).
   - `BOLLINGER_LOWER_BOUNCE`: $\text{\%B} < 0.05 \land C_t > O_t$ (Conf: 0.60).
   - `EMA_GOLDEN_CROSS`: $\text{EMA}_{20, t-1} \le \text{EMA}_{50, t-1} \land \text{EMA}_{20, t} > \text{EMA}_{50, t}$ (Conf: 0.75).
   - `OVERBOUGHT_EXHAUSTION`: $\text{RSI} > 75 \land \text{\%B} > 0.95 \land \text{Hist}_t < \text{Hist}_{t-1}$ (Conf: 0.70).

---

## 6. Machine Learning & Quantitative Modeling Engine

### 6.1 17-Feature Extraction Pipeline (`feature_engineering.py`)

```
Index  Feature Name         Tier             Formula / Definition
----------------------------------------------------------------------------------------------------
1      ret_1d               Tier 1 (Tech)    (Close[t] - Close[t-1]) / Close[t-1]
2      ret_2d               Tier 1 (Tech)    (Close[t] - Close[t-2]) / Close[t-2]
3      ret_3d               Tier 1 (Tech)    (Close[t] - Close[t-3]) / Close[t-3]
4      ret_5d               Tier 1 (Tech)    (Close[t] - Close[t-5]) / Close[t-5]
5      ret_10d              Tier 1 (Tech)    (Close[t] - Close[t-10]) / Close[t-10]
6      rsi_14               Tier 1 (Tech)    RSI(14) / 100.0 in [0, 1]
7      macd_hist            Tier 1 (Tech)    (MACD_Line - Signal_Line) / Close[t]
8      bb_pct_b             Tier 1 (Tech)    (Close - BB_Lower) / (BB_Upper - BB_Lower)
9      vol_ratio            Tier 1 (Tech)    Volume[t] / SMA_20(Volume)
10     atr_pct              Tier 1 (Tech)    ATR(14) / Close[t]
11     ema_ratio            Tier 1 (Tech)    Close[t] / EMA_20(Close)
12     price_sma200_ratio   Tier 1 (Tech)    Close[t] / SMA_200(Close)
13     stoch_k              Tier 1 (Tech)    Stochastic %K in [0, 1]
14     intraday_range       Tier 1 (Tech)    (Close[t] - Open[t]) / (High[t] - Low[t]) in [-1, 1]
15     regime_state         Tier 2 (Regime)  Discrete HMM State (0: Bull/Low-Vol, 1: Bear/High-Vol)
16     regime_prob_bear     Tier 2 (Regime)  Continuous HMM Bear-State Posterior P(Bear | Returns)
17     sentiment_score      Tier 3 (Sent)    3-Day Rolling VADER Compound Score in [-1, +1]
```

#### Target Labeling ($h = 3\text{ days}$)
$$y_t = \begin{cases} +1 \text{ (UP)}, & \text{if } \frac{P_{t+3} - P_t}{P_t} \ge +0.8\% \\ -1 \text{ (DOWN)}, & \text{if } \frac{P_{t+3} - P_t}{P_t} \le -0.8\% \\ 0 \text{ (FLAT)}, & \text{otherwise} \end{cases}$$

---

### 6.2 Purged Walk-Forward Splitter with 3-Day Embargo (`validation.py`)
- Parameters: `min_train_size = 120`, `test_size = 30`, `n_splits = 5`, `embargo_horizon = 3`.
- **Formulation**:
  $$\text{train\_end} = \text{test\_start} - 3$$
  $$\text{train\_idx} = [0, \dots, \text{train\_end} - 1], \quad \text{test\_idx} = [\text{test\_start}, \dots, \text{test\_start} + 29]$$
- **Runtime Invariant Assertion**:
  $$\max(\text{train\_timestamps}) + 3\text{ days} < \min(\text{test\_timestamps})$$
  Violation raises an immediate `ValueError` and halts execution.

---

### 6.3 2-State Gaussian Hidden Markov Model (HMM) from Scratch (`regime_detector.py`)
- **EM Algorithm**:
  1. Forward pass computes $\alpha_t(k) = b_k(r_t) \sum_i \alpha_{t-1}(i) A_{ik}$.
  2. Backward pass computes $\beta_t(i) = \sum_j A_{ij} b_j(r_{t+1}) \beta_{t+1}(j)$.
  3. E-step computes state posterior $\gamma_t(k) = \frac{\alpha_t(k)\beta_t(k)}{\sum_j \alpha_t(j)\beta_t(j)}$ and transition posterior $\xi_t(i, j)$.
  4. M-step updates $\mu_k$, $\sigma_k^2$, and $A_{ij}$.
  5. State with $\max(\sigma_0^2, \sigma_1^2)$ is mapped to State 1 (Bear).

---

### 6.4 Random Forest Classifier with Parallel Soft Voting (`baseline_rf.py` & `parallel_trainer.py`)
- **Hyperparameters**: 150 trees, max depth 6, min leaf samples 10, balanced class weights.
- **Parallel Fold Training**: 5 Walk-Forward folds train concurrently across 4 workers via `ThreadPoolExecutor`.
- **Recency-Weighted Soft Voting**:
  $$\mathbf{P}_{\text{ensemble}} = \sum_{i=0}^4 w_i \mathbf{p}_i \quad \text{where } w_i = \frac{\exp(i / 4)}{\sum_{j=0}^4 \exp(j / 4)}$$

---

### 6.5 Temporal Convolutional Network (TCN) Sequence Classifier (`tcn_model.py`)
- PyTorch sequence model with 3 dilated causal convolution blocks ($d \in \{1, 2, 4\}$, kernel size 3, residual skips). Receptive field $= 29\text{ days}$.

---

### 6.6 Realistic NSE Backtester with Statutory Cost Schedule & Almgren-Chriss Impact (`backtester.py`)
- **Statutory Costs**: Brokerage $0.03\%$, STT $0.10\%$ (sell), GST $18\%$ on brokerage, Stamp Duty $0.015\%$ (buy), SEBI turnover fee ($₹10/\text{Cr}$). Fixed round-trip floor: $\approx 0.34\%$.
- **Almgren-Chriss Temporary Slippage**: $\text{Slippage} = \eta \cdot \sigma_{20d} \cdot \sqrt{\frac{|V_{\text{order}}|}{V_{\text{daily}}}}$ ($\eta = 0.1$). Total realized round-trip friction: $0.49\% - 0.64\%$.
- **Performance Ratios**: Annualized Net Sharpe ($R_f = 6.5\%$), Sortino, and Calmar ratios.

---

### 6.7 Model Registry, Champion-Challenger Evaluator & Cache Invalidation (`evaluator.py`, `registry.py`)
- **Gatekeeper**: Retrained challenger model is promoted if $\text{Macro-F1}_{\text{challenger}} \ge \text{Macro-F1}_{\text{champion}} + 0.02$.
- **Cache Eviction**: Upon promotion, triggers `clear_symbol_model_caches(symbol)` in `main.py`.

---

## 7. Statistical Time-Series Forecasting Engine (ARIMA / SARIMAX)

Implemented in `backend/app/routes/time_series_forecast.py`.

- **Engine**: `statsmodels.tsa.statespace.sarimax.SARIMAX` ($p, d, q \in \{0, 1, 2, 3\}$, seasonal order $(0,0,0,0)$).
- **Stationarity Assessment**: Variance-ratio test automatically selects $d=1$ (differenced) or $d=0$.
- **AIC Grid Search**: Fits candidate orders and selects lowest $\text{AIC} = 2k - 2\ln(\hat{L})$.
- **Confidence Cones**: Outputs 5-day out-of-sample forecast with 80% ($z = 1.282$) and 95% ($z = 1.960$) statistical bounds.

---

## 8. RAG Grounded Explainer & ChromaDB Vector Store

Implemented in `backend/app/rag/explainer.py`, `retriever.py`, and `vector_store.py`.

- **Embeddings**: `sentence-transformers/all-MiniLM-L6-v2` (384-dimensional dense vectors).
- **Storage**: Persistent ChromaDB collection (`clearward_news`).
- **Grounding Verification**: `verify_sentence_grounding()` scores generated sentences against retrieved news snippets.
- **Citation Linking**: `_clean_prose()` converts inline bracket citations `[Title | Source | Date]` into clickable Markdown links `[Title | Source](url)`.

---

## 9. Portfolio Health Doctor & Mutual Fund Analytics Engine

Implemented in `backend/app/routes/portfolio.py` and `mutual_funds.py`.

- **Parametric VaR (95%)**: $\text{VaR}_{95\%} = \mu_p - 1.645 \cdot \sqrt{\mathbf{w}^T \mathbf{\Sigma} \mathbf{w}}$.
- **Historical Simulation VaR (95%)**: $-\text{Percentile}_{5\%}(\sum_i w_i R_{i, t})$.
- **Pairwise Mutual Fund Overlap**: $\text{Overlap}(A, B) = \sum_{k \in A \cap B} \min(w_{k, A}, w_{k, B}) \times 100\%$.
- **AMFI Integration (`mf_client.py`)**: Daily NAV history from `mfapi.in` cached with 23-hour TTL. Computes CAGR (1Y, 3Y, 5Y), Max Drawdown, Volatility $\times \sqrt{252}$, and Sharpe ($R_f=6.5\%$).
- **Direct vs. Regular SIP Compounding Loss**: Projects 10, 20, 30-year wealth lost to distributor commissions using an expense ratio delta $\Delta = 1.25\%\text{ p.a.}$
- **Macro Stress Testing**: COVID 2020 ($-28.5\%$), 2008 Lehman ($-42.0\%$), Interest Rate Hike ($-8.0\%$).

---

## 10. Hype Guard & Behavioral Risk Defense Engine

Implemented in `backend/app/routes/hype_and_health.py`.

- **Hype Score (0–100)**: Composite index evaluating Volume Anomaly ($V / \text{SMA}_{20}(V) > 2.5$), RSI overbought ($> 75$), P/E valuation relative to sector median, and price-volume divergence.
- **Solvency**: Altman Z-Score for non-manufacturing/service equities ($Z = 6.56X_1 + 3.26X_2 + 6.72X_3 + 1.05X_4$).
- **Behavioral Alerts**: Renders `BehavioralNudgeBanner` with FOMO defense warnings when Hype Score $\ge 75$.

---

## 11. Exhaustive REST API Contract & Payload Reference

### Gateway & Stock Analytics Endpoints

#### 1. `GET /health`
- **Response (200 OK)**:
```json
{
  "status": "healthy",
  "database": "connected",
  "models_loaded": 2,
  "timestamp": "2026-08-30T14:10:00Z"
}
```

#### 2. `GET /api/stocks/search?q=RELIANCE`
- **Response (200 OK)**:
```json
[
  {
    "symbol": "RELIANCE.NS",
    "name": "Reliance Industries Limited",
    "sector": "Energy"
  }
]
```

#### 3. `GET /api/stocks/RELIANCE.NS/price-history?period=1y`
- **Response (200 OK)**:
```json
{
  "symbol": "RELIANCE.NS",
  "history": [
    {
      "date": "2025-08-29",
      "open": 3010.50,
      "high": 3045.00,
      "low": 3002.10,
      "close": 3038.75,
      "volume": 4521000,
      "adjusted_close": 3038.75
    }
  ]
}
```

#### 4. `GET /api/stocks/RELIANCE.NS/signals`
- **Response (200 OK)**:
```json
{
  "symbol": "RELIANCE.NS",
  "rsi": 58.4,
  "macd": {
    "line": 12.45,
    "signal": 10.12,
    "histogram": 2.33
  },
  "bollinger": {
    "upper": 3120.00,
    "middle": 2980.50,
    "lower": 2841.00,
    "pct_b": 0.708
  },
  "ema_20": 3005.10,
  "ema_50": 2960.40,
  "composite_score": 35.0,
  "signal": "POSITIVE_MOMENTUM"
}
```

#### 5. `POST /api/stocks/bulk-signals`
- **Request Body**:
```json
{
  "symbols": ["RELIANCE.NS", "TCS.NS"]
}
```
- **Response (200 OK)**:
```json
{
  "stocks": {
    "RELIANCE.NS": {
      "symbol": "RELIANCE.NS",
      "close_price": 3038.75,
      "date": "2025-08-29",
      "signal": "POSITIVE_MOMENTUM",
      "confidence": 0.72
    },
    "TCS.NS": {
      "symbol": "TCS.NS",
      "close_price": 4120.00,
      "date": "2025-08-29",
      "signal": "CONSOLIDATION",
      "confidence": 0.55
    }
  },
  "count": 2
}
```

#### 6. `GET /api/stocks/RELIANCE.NS/predict`
- **Response (200 OK)**:
```json
{
  "symbol": "RELIANCE.NS",
  "direction": "UP",
  "confidence": 0.74,
  "probabilities": {
    "UP": 0.74,
    "FLAT": 0.16,
    "DOWN": 0.10
  },
  "regime": "Bull (Low-Volatility)",
  "model_type": "RandomForestDirectionClassifier (150 trees)",
  "disclaimer": "For education only. Not investment advice."
}
```

#### 7. `GET /api/stocks/RELIANCE.NS/forecast?days=5`
- **Response (200 OK)**:
```json
{
  "ticker": "RELIANCE.NS",
  "model": "ARIMA(1,1,1)",
  "aic": 2415.6,
  "stationarity": {
    "is_stationary": false,
    "differencing_applied": 1
  },
  "forecast": [
    {
      "day": 1,
      "date": "2025-09-01",
      "predicted_price": 3045.20,
      "lower_80": 3020.10,
      "upper_80": 3070.30,
      "lower_95": 3005.50,
      "upper_95": 3084.90
    }
  ],
  "disclaimer": "Statistical confidence cone. Not a guaranteed target price."
}
```

#### 8. `POST /api/portfolio/audit`
- **Request Body**:
```json
{
  "holdings": [
    {"name": "RELIANCE.NS", "holding_type": "stock", "amount_inr": 200000, "category": "Energy"},
    {"name": "Parag Parikh Flexi Cap", "holding_type": "mutual_fund", "amount_inr": 300000, "category": "Flexi Cap", "is_regular_plan": true}
  ]
}
```
- **Response (200 OK)**:
```json
{
  "total_value_inr": 500000,
  "var_95_daily_inr": 8250.00,
  "var_95_pct": 1.65,
  "annual_fee_drag_inr": 2400.00,
  "overlap_matrix": {
    "RELIANCE.NS": {"Parag Parikh Flexi Cap": 6.8}
  },
  "stress_tests": {
    "covid_2020_shock": {"estimated_loss_inr": -118500, "loss_pct": -23.7},
    "rate_hike_150bps": {"estimated_loss_inr": -32500, "loss_pct": -6.5}
  },
  "health_score": 82
}
```

#### 9. `POST /api/chat`
- **Request Body**:
```json
{
  "message": "What does Reliance's RSI of 58 indicate?",
  "symbol": "RELIANCE.NS",
  "history": []
}
```
- **Response (200 OK)**:
```json
{
  "response": "An RSI of 58 indicates moderate positive momentum without entering overbought territory (>70). Price action is supported by constructive volume.",
  "citations": [
    {"chip": "Reliance Q1 Operational Report | Economic Times", "url": "https://economictimes.indiatimes.com/..."}
  ],
  "suggestions": [
    "How does the MACD histogram align with this RSI level?",
    "What is the historical volatility over the past 20 days?"
  ],
  "disclaimer": "For education only. Not investment advice."
}
```

---

## 12. Frontend React 18 Architecture & 26-Component Catalog

### Root Controller (`App.jsx`)
- **State Machine**:
  - `activeSymbol`: Currently selected stock ticker (default: `'RELIANCE.NS'`).
  - `stockSubTab`: Active sub-view (`overview`, `signals`, `forecast`, `doctor`, `explainer`).
  - `watchlist`: Synced with `localStorage`.
  - `abortControllerRef`: Cancels in-flight HTTP requests when switching stocks mid-fetch.

### Complete 26-Component Breakdown

| Component Name | File Path | Props Received | API Endpoint Invoked | Render Output / Key Functionality |
|:---|:---|:---|:---|:---|
| **App** | `src/App.jsx` | None | Parallel fetch of 4 core APIs | Root layout, state orchestrator, tab router |
| **MarketTickerTape** | `src/components/MarketTickerTape.jsx` | None | `GET /api/market/summary`, `POST /api/sync/trigger` | Scrolling ticker tape for Nifty-50, VIX, sync trigger |
| **SearchHeader** | `src/components/SearchHeader.jsx` | `onClose`, `onSelectSymbol` | `GET /api/stocks/search` | Command palette (`Cmd+K`), debounced symbol search |
| **StockChart** | `src/components/StockChart.jsx` | `priceHistory`, `signalsData` | None | SVG Candlestick chart + Recharts indicator overlays |
| **PredictionCard** | `src/components/PredictionCard.jsx` | `prediction`, `activeSymbol` | None | `ConfidencePulseRing` (ATR-pulsing ring) & bias label |
| **SignalCard** | `src/components/SignalCard.jsx` | `signalsData`, `loading` | None | Gauge cards for RSI, MACD, Bollinger Bands, EMA |
| **ExplanationView** | `src/components/ExplanationView.jsx` | `explanation`, `loading` | None | Grounded news prose with clickable `CitationChip` links |
| **TimeSeriesForecastCard** | `src/components/TimeSeriesForecastCard.jsx` | `activeSymbol` | `GET /api/stocks/{ticker}/forecast` | 5-day ARIMA forecast with 80% & 95% confidence cones |
| **HypeAndHealthCard** | `src/components/HypeAndHealthCard.jsx` | `symbol` | `GET /api/hype-score/{ticker}` | Hype Score dial (0–100) & Altman Z solvency indicator |
| **ShareholdingCard** | `src/components/ShareholdingCard.jsx` | `symbol` | `GET /api/stocks/{symbol}/shareholding` | SVG Donut chart of Promoter, FII, DII, Public holdings |
| **RiskCockpit** | `src/components/RiskCockpit.jsx` | `activeSymbol`, `marketContext` | None | 5-point risk posture summary card |
| **RiskManagementCard** | `src/components/RiskManagementCard.jsx` | `symbol`, `priceData`, `prediction` | None | ATR-based position-sizing & stop-loss calculator |
| **BehavioralNudgeBanner**| `src/components/BehavioralNudgeBanner.jsx`| `activeSymbol`, `marketContext` | None | FOMO alerts & behavioral cognitive bias warnings |
| **HypeGuardView** | `src/components/HypeGuardView.jsx` | `activeSymbol`, `marketContext` | None | Full behavioral dashboard for retail buzz spikes |
| **StockComparisonView** | `src/components/StockComparisonView.jsx`| None | `GET /api/stocks/compare` | Multi-stock quantitative radar & comparative metrics |
| **WatchlistView** | `src/components/WatchlistView.jsx` | `watchlist`, `onSelectSymbol` | `POST /api/stocks/bulk-signals` | Bulk-monitored watchlist table with client sorting |
| **PortfolioDoctorView** | `src/components/PortfolioDoctorView.jsx`| `onNavigate` | `POST /api/portfolio/audit`, `GET /api/mf/search` | Multi-asset VaR 95%, overlap matrix, fee-drag audit |
| **MutualFundView** | `src/components/MutualFundView.jsx` | None | `GET /api/mf/{code}/analyze` | AMFI scheme explorer, CAGR charts, SIP projections |
| **ModelChangelogView** | `src/components/ModelChangelogView.jsx` | None | `GET /api/retrain/history` | Model registry promotion logs & macro-F1 deltas |
| **ModelHealthBadge** | `src/components/ModelHealthBadge.jsx` | `onOpenModels` | None | Top bar pill showing active model status & WFV health |
| **ChatbotView** | `src/components/ChatbotView.jsx` | None | `POST /api/chat` | Full-page interactive AI chat with grounded context |
| **FloatingChatWidget** | `src/components/FloatingChatWidget.jsx` | `activeSymbol` | `POST /api/chat` | Floating quick-chat drawer widget |
| **EducationAcademyView**| `src/components/EducationAcademyView.jsx`| None | None | Quantitative formulas & SEBI compliance academy |
| **SettingsView** | `src/components/SettingsView.jsx` | None | None | UI preferences, API base URL, theme configurations |
| **MobileNav** | `src/components/MobileNav.jsx` | `activeTab`, `setActiveTab` | None | Mobile viewport bottom navigation tab bar |
| **ErrorBoundary** | `src/components/ErrorBoundary.jsx` | `children` | None | Catch-all React error boundary with retry fallbacks |

---

## 13. Security, Concurrency & SEBI Regulatory Compliance

### 1. SEBI Regulatory Compliance (`sebiFormatter.js`)
- Governed by SEBI (Research Analysts) Regulations, 2014.
- All directional predictions are converted to statistical biases (`▲ POSITIVE BIAS`, `▼ NEGATIVE BIAS`, `— CONSOLIDATION`).
- Mandatory persistent disclaimer:
  > *"Statistical regime classifications derived from quantitative indicators (RSI, MACD, ARIMA). For education only. Not investment advice."*

### 2. CORS Security (`main.py`)
- Explicitly sanitizes origins and blocks `null` and `*` wildcards.

---

## 14. Edge-Case, Fallback & Failure Recovery Matrix

| Failure Mode / Edge Case | Root Cause / Condition | System Handling & Fallback Behavior |
|:---|:---|:---|
| **Yahoo Finance Outage / 429** | External API rate limiting | Returns cached SQLite price history. Sets `hasApiError=true` banner without crashing. |
| **Insufficient OHLCV (< 80 rows)** | Newly listed IPO or illiquid stock | ML training returns `{"status": "error", "message": "Insufficient data"}`. UI displays rule-based signals. |
| **VADER Lexicon Unavailable** | Missing `vaderSentiment` package | `_VADER_AVAILABLE = False` flag activates. Sentiment defaults to neutral `0.0` across feature matrix. |
| **ARIMA Convergence Failure** | Extreme price discontinuity | Catches `SARIMAX` exception, falls back to drift-adjusted random walk with widened confidence cone. |
| **ChromaDB Empty / Unreachable** | First-time cold start | RAG explainer falls back to deterministic rule-based template generated from price indicators. |
| **Invalid Symbol 404** | User typo in search | `App.jsx` catches 404, sets `invalidSymbolError(symbol)`, presents suggested catalog stocks. |
| **AMFI API Timeout** | `mfapi.in` slow response | Returns cached NAV from `mf_scheme_cache` table (up to 23 hours old). |
| **Parallel Training Deadlock** | Thread pool contention | `ThreadPoolExecutor` has a 30-second timeout per fold; failures fall back to serial training. |

---

## 15. Verification & Test Suite Map

Run all tests via: `cd backend && python3 -m pytest tests/ -q`

| Test File | Test Class / Functions | Verifications & Assertions Tested |
|:---|:---|:---|
| `test_api_contract.py` | `TestAPIContract` | Verifies schemas for `/health`, `/signals`, `/predict`, `/explanation`, `/compare` |
| `test_leakage_assertion.py`| `TestWalkForwardLeakageAssertion` | Asserts `WalkForwardSplitter` raises `ValueError` on train/test timestamp overlap |
| `test_ml_pipeline.py` | 8 dedicated tests | Tests 17-feature extraction, fold monotonicity, parallel speedup, and backtester costs |
| `test_mutual_funds.py` | 8 test classes (48 tests) | Validates CAGR, Max Drawdown, Volatility, Sharpe ($R_f=6.5\%$), SIP compounding, and fee drag |
| `test_portfolio.py` | `TestPortfolioAuditAPI` | Asserts VaR 95% calculations, holding allocations, and stress-test payload parsing |
| `test_rag_grounding.py` | `TestRAGGrounding` | Tests sentence grounding verification and Markdown citation linking |
| `test_time_series_forecast.py`| `TestTimeSeriesForecastAPI` | Tests ADF stationarity heuristics and confidence interval ordering ($L_{95} < L_{80} < \hat{P} < U_{80} < U_{95}$) |
| `test_market_sync.py` | 5 dedicated tests | Tests IST trading hour detection (09:15–15:30) and dynamic interval scheduling |
| `test_cache_lru.py` | 2 dedicated tests | Tests LRU eviction and memory bounds on peeked stock cache |
| `test_gatekeeper_stability.py`| `TestGatekeeperStability` | Tests challenger vs champion evaluation, $+2\text{pp}$ F1 hurdle, and audit persistence |

---

## 16. Operations, Desktop Packaging & Deployment Guide

### 1. Local Development
```bash
# 1. Start Backend Server (FastAPI)
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python3 -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload

# 2. Start Frontend Server (React + Vite)
cd frontend
npm install
npm run dev
# Access UI at http://localhost:3000
```

### 2. Electron Desktop Packaging
```bash
# Compile backend into single binary via PyInstaller
pyinstaller clearward-backend.spec

# Build Electron desktop installer
npm run package
```

### 3. Docker Multi-Container Run
```bash
docker-compose up --build -d
```

---

## 17. Data Availability, External Sources & Reproducibility Repository

### 17.1 Public Data Feeds & Primary Access Portals
Clearward is designed for complete scientific reproducibility and transparency under Indian financial market regulations. All historical market feeds, mutual fund metrics, corporate shareholding reports, and news sentiment corpora originate from publicly accessible endpoints:

| Data Layer | Primary Authority / Source | Access URL / API Schema | Protocol & Cadence | Ingestion Engine |
|:---|:---|:---|:---|:---|
| **NSE Equity OHLCV** | National Stock Exchange of India (NSE) / Yahoo Finance API | `https://finance.yahoo.com/quote/<SYMBOL>.NS` <br> `https://www.nseindia.com` | Daily adjusted closing candles (`auto_adjust=True`), splits/dividends normalized | `backend/app/ingestion/price_ingestion.py` |
| **Mutual Fund NAVs** | Association of Mutual Funds in India (AMFI) | `https://www.amfiindia.com` <br> `https://api.mfapi.in/mf/<scheme_code>` | Daily NAV updates published post-market (21:00 IST), 23-hour cache TTL | `backend/app/cache/mf_client.py` |
| **Corporate Ownership** | SEBI Regulatory Filings / NSE Corporate Shareholding | `https://www.nseindia.com/api/corporate-share-holdings-master` | Quarterly shareholder ownership structure (Promoter, FII, DII, Retail) | `backend/app/ingestion/shareholding.py` |
| **Financial News Feeds** | Indian Financial RSS News (Economic Times, Moneycontrol, LiveMint) | Public RSS Feeds (347 tickers mapped) | Deterministic MD5 deduplicated streaming, ingested into ChromaDB | `backend/app/ingestion/news_scraper.py` |

### 17.2 Core Pilot Constituent Universe
The core empirical validation benchmark is executed on five bellwether constituents of the Nifty-50 index spanning January 2022 to December 2024 (~730 trading days, ~500 usable feature vectors per stock post 200-day warm-up):
- **`RELIANCE.NS`**: Reliance Industries Ltd (Energy/Conglomerate) — High liquidity, low idiosyncratic noise.
- **`TCS.NS`**: Tata Consultancy Services Ltd (IT Services) — Global macro / currency correlation.
- **`HDFCBANK.NS`**: HDFC Bank Ltd (Banking & Financial Services) — Heavyweight index driver.
- **`INFY.NS`**: Infosys Ltd (IT Services) — High analyst efficiency, 47% FLAT class representation.
- **`ICICIBANK.NS`**: ICICI Bank Ltd (Banking) — High beta cyclical momentum.

### 17.3 Official Open-Source Codebase & Persistence
- **Official GitHub Repository**: [`https://github.com/IronLad123/clearward`](https://github.com/IronLad123/clearward)
- **Primary Branch**: `main` (clean local-only development runtime)
- **Persistent Data Store**: `backend/data/stock_analyst.db` (SQLite WAL mode: `stocks`, `price_histories`, `technical_signals`, `model_registry`)
- **Cache Data Store**: `backend/data/api_cache.db` (Key-value SQLite store with LRU eviction)
- **Embedding Store**: `backend/data/chroma_db/` (Persistent vector store with 384-dimensional `all-MiniLM-L6-v2` embeddings)

---

## 18. IEEE Publication Pipeline & Research Artifacts

### 18.1 Manuscript Specifications
Clearward’s accompanying empirical research paper adheres to the IEEE Transactions / Conference two-column layout standard:
- **Title**: *Clearward: A Cost-Aware, Leakage-Safe Multi-Model Framework for Three-Class Direction Prediction on NSE Equities*
- **Author**: Om Srivastava, Financial Analytics Research Project, India
- **Format**: Standard IEEE 2-column layout (Section 0: full-width title & author block; Section 1: 2 columns, 0.25" column gap, Times New Roman typography, small-caps section headings, borderless right-aligned equation tables).
- **Compilation Engine**: Python programmatic document builder (`scratch/generate_ieee_paper.py`) rendering high-DPI vector-grade figures and automated DOCX + PDF export.

### 18.2 Figure Catalog (300 DPI, IEEE Grayscale-Safe Color Palette)
All figures are generated at 300 DPI minimum using IEEE/MATLAB standard color tokens (`#0072BD` Blue, `#D95319` Red, `#77AC30` Green, `#EDB120` Yellow, `#7E2F8E` Purple, `#4DBEEE` Cyan, `#555555` Gray) with redundant hatch and linestyle encodings:
1. **Fig. 1 (`f1_ablation.png`)**: Ablation Study Macro-F1 across 6 configurations (Majority baseline line at 0.1434, 3-class random ceiling line at 0.3333).
2. **Fig. 2 (`f2_importance.png`)**: 17-Feature Normalized Gini Importance grouped across Tier 1 (Technical), Tier 2 (HMM Regime), and Tier 3 (Sentiment).
3. **Fig. 3 (`f3_equity.png`)**: Out-of-fold cumulative equity curves comparing Buy-and-Hold (0.55 Sharpe), Gross Strategy (0.82 Sharpe), and Net Strategy (0.41 Sharpe) with shaded cost-drag area and decoupled sub-axis legend.
4. **Fig. 4 (`f4_regime_sharpe.png`)**: Dual-panel analysis of regime-stratified Sharpe ratios (Bull 0.58 vs Bear 0.31 vs B&H 0.55) alongside turnover / round-trip frequency across models.
5. **Fig. 5 (`f5_sarimax.png`)**: 5-Day SARIMAX price forecast with strictly ordered 80% and 95% confidence cones widening at $\sigma\sqrt{t}$, verifying $L_{95} < L_{80} < \hat{P} < U_{80} < U_{95}$.

### 18.3 Empirical Benchmark Summary
- **Majority Baseline Macro-F1**: $0.1434$ (always FLAT)
- **Production RF-17 Macro-F1**: $0.2515$ ($+75.3\%$ relative improvement)
- **Binary-Collapse Accuracy**: $73.3\%$ (exceeds published Soni et al. benchmark of $67.5\%$ by $+5.8\,\text{pp}$)
- **Statistical Significance**: McNemar's Test $\chi^2 = 16.5, p < 0.001$; Matthews Correlation Coefficient $\text{MCC} = 0.46$.
- **HMM Tier Contribution**: $+2.58\,\text{pp}$ Macro-F1 ($0.2310 \to 0.2568$); `regime_prob_bear` ranks 4th out of 17 features.
- **Statutory Cost Drag**: $0.34\%$ fixed floor $+ 0.15\%$ Almgren-Chriss impact $= 0.49\%\text{--}0.64\%$ round-trip friction, producing a $50\%$ alpha compression ($0.82 \to 0.41$ Sharpe).

---
*Brain document compiled for Clearward Platform developers, AI reasoning agents, and system maintainers.*
