# Clearward Financial Analytics & Self-Defense Platform
## System Architecture, Quantitative Computations & Engineering Documentation

> **Mandatory Regulatory Disclaimer**: *For education only. Not investment advice. Clearward does not provide buy, sell, or target-price recommendations.*

---

## Table of Contents
1. [Executive Summary](#1-executive-summary)
2. [System Architecture & Technology Stack](#2-system-architecture--technology-stack)
3. [Mathematical Foundations & Quantitative Computations](#3-mathematical-foundations--quantitative-computations)
   - [3.1 Walk-Forward ML Direction Classifier](#31-walk-forward-ml-direction-classifier)
   - [3.2 Hype Guard Anti-Pump Anomaly Engine](#32-hype-guard-anti-pump-anomaly-engine)
   - [3.3 ARIMA Time-Series Range Projection](#33-arima-time-series-range-projection)
   - [3.4 Portfolio Overlap & Mutual Fund Fee Leakage](#34-portfolio-overlap--mutual-fund-fee-leakage)
4. [Backend API Specifications](#4-backend-api-specifications)
5. [Frontend Modules & UI Architecture](#5-frontend-modules--ui-architecture)
6. [SEBI Regulatory Compliance & Non-Directional Framing](#6-sebi-regulatory-compliance--non-directional-framing)
7. [Deployment & Verification Guide](#7-deployment--verification-guide)

---

## 1. Executive Summary

**Clearward** is an institutional-grade financial analytics and self-defense platform engineered for retail equity and mutual fund investors in Indian markets (NSE/BSE).

### Key Value Propositions
* **Financial Self-Defense**: Detects pump-and-dump manipulation, social media volume spikes, and unusual price-volume divergences.
* **Quant Modeling Without Target Leakage**: Employs strict Walk-Forward cross-validation with an embargo horizon to provide honest, un-inflated model evaluation metrics.
* **Mutual Fund Fee Leakage Audit**: Exposes hidden distributor commission drag (Regular vs. Direct plans) over multi-decade horizons.
* **Grounded AI RAG Intelligence**: Delivers factual, news-grounded explanations powered by vector embeddings and Gemini LLM.

---

## 2. System Architecture & Technology Stack

```
                               ┌──────────────────────────────────────────────┐
                               │   Clearward Frontend (React 18 + Vite 5)     │
                               │   • Obsidian Glassmorphism UI (#0C0E1A)      │
                               │   • Recharts, Lucide Icons, Floating Widget  │
                               └──────────────────────┬───────────────────────┘
                                                      │
                                           REST API (HTTP / JSON)
                                                      │
                               ┌──────────────────────▼───────────────────────┐
                               │   FastAPI Server (Python 3.11 Backend)       │
                               │   • SQLAlchemy ORM + SQLite (WAL Mode)       │
                               │   • APScheduler Market Data Sync             │
                               └──────┬───────────────────────┬───────────────┘
                                      │                       │
           ┌──────────────────────────┴────┐             ┌────┴──────────────────────────┐
           ▼                               ▼             ▼                               ▼
 ┌───────────────────┐           ┌──────────────────┐  ┌───────────────────┐   ┌─────────────────┐
 │ Scikit-Learn ML   │           │ Statsmodels ARIMA│  │ YFinance & News   │   │ ChromaDB Vector │
 │ • Random Forest   │           │ • ADF Stationarity│  │ • RSS Feed Parser │   │ • Bounded Buffer│
 │ • Walk-Forward CV │           │ • 95% Bounds     │  │ • Article URL Decoder│  │ • RAG Retrieval │
 └───────────────────┘           └──────────────────┘  └───────────────────┘   └─────────────────┘
```

### Core Tech Stack Components

| Layer | Component | Description / Function |
| :--- | :--- | :--- |
| **Backend API** | FastAPI + Python 3.11 | Asynchronous, low-latency REST endpoints |
| **Database** | SQLite + SQLAlchemy ORM | Single-writer storage with Write-Ahead Logging (`WAL` mode) |
| **Machine Learning** | Scikit-Learn | `RandomForestClassifier` with 3-class target ($\text{UP}, \text{FLAT}, \text{DOWN}$) |
| **Time-Series** | Statsmodels | Autoregressive Integrated Moving Average (ARIMA) confidence bounds |
| **Vector Store / RAG** | ChromaDB + Gemini Flash | Document embedding, news retrieval, and grounded text generation |
| **Frontend SPA** | React 18 + Vite 5 | Modular SPA with custom glassmorphism design tokens |

---

## 3. Mathematical Foundations & Quantitative Computations

### 3.1 Walk-Forward ML Direction Classifier

The machine learning module predicts directional bias over a 3-candle horizon. To prevent lookahead leakage, data is split using strict **Walk-Forward Cross-Validation**:

$$\text{Target Class } y_t = \begin{cases} +1 \quad (\text{UP}) & \text{if } \frac{P_{t+3} - P_t}{P_t} > +0.5\% \\ -1 \quad (\text{DOWN}) & \text{if } \frac{P_{t+3} - P_t}{P_t} < -0.5\% \\ 0 \quad (\text{FLAT}) & \text{otherwise} \end{cases}$$

#### Embargo Horizon Formulation
```
[ Train Window: t_0 ... t_k ] ── (Embargo Gap: 3 Candles) ──> [ Test Window: t_{k+3} ... t_{k+N} ]
```
$$\text{Train Index} = [0, \; t_{\text{test\_start}} - h_{\text{embargo}}]$$
where $h_{\text{embargo}} = 3$. This guarantees that overlapping forward return calculations in the training set never leak into the test evaluation window.

#### Evaluation Metrics
Model performance is reported via out-of-fold (OOF) 2x2 confusion matrices:
* **True Positive ($TP$)**: Correct positive bias call
* **True Negative ($TN$)**: Correct negative bias call
* **False Positive ($FP$)**: False breakout alarm
* **False Negative ($FN$)**: Missed rally
$$\text{Precision} = \frac{TP}{TP + FP}, \quad \text{Recall} = \frac{TP}{TP + FN}, \quad F_1 = 2 \times \frac{\text{Precision} \times \text{Recall}}{\text{Precision} + \text{Recall}}$$

---

### 3.2 Hype Guard Anti-Pump Anomaly Engine

Hype Guard detects synthetic price inflation and Telegram pump-and-dump spikes using a composite multi-factor score ($0 - 100$):

1. **Volume Anomaly Ratio**:
   $$V_{\text{ratio}} = \frac{V_t}{\frac{1}{20}\sum_{i=0}^{19} V_{t-i}}$$

2. **Price-Volume Divergence Indicator**:
   $$\text{Divergence} = \mathbb{I}\left( \Delta P_{5d} > +10\% \quad \land \quad V_{\text{ratio}} < 0.8 \right)$$

3. **Composite Hype Score Calculation**:
   $$\text{Score} = \min\left(100, \; 30 \cdot \max(0, V_{\text{ratio}} - 1) + 40 \cdot \mathbb{I}(\text{RSI}_{14} > 75) + 30 \cdot \mathbb{I}(\Delta P_{5d} > 15\%)\right)$$

---

### 3.3 ARIMA Time-Series Range Projection

For short-term range estimation, the system tests stationarity via Augmented Dickey-Fuller (ADF) testing to set integration order $d \in \{0, 1\}$:

$$y_t' = \mu + \sum_{i=1}^p \phi_i y_{t-i}' + \sum_{j=1}^q \theta_j \epsilon_{t-j} + \epsilon_t$$

$$\text{Confidence Interval}(h) = \hat{y}_{t+h} \pm z_{\alpha/2} \cdot \hat{\sigma} \sqrt{1 + \sum_{i=1}^{h-1} \psi_i^2}$$

For $95\%$ confidence level, $z_{\alpha/2} = 1.96$.

---

### 3.4 Portfolio Overlap & Mutual Fund Fee Leakage

#### Mutual Fund Portfolio Overlap
Given two funds $A$ and $B$ holding security weight sets $W_A$ and $W_B$:
$$\text{Overlap}_{A,B} = \sum_{s \in A \cap B} \min\left(W_{A,s}, \; W_{B,s}\right)$$

#### Direct vs Regular Expense Ratio Drag
$$\text{Future Value} = P \times \frac{(1 + r - c)^n - 1}{r - c}$$
where $c_{\text{regular}} \approx 1.5\%$ and $c_{\text{direct}} \approx 0.15\%$. Over 20 years, $c_{\text{regular}}$ causes a **20%–35% total portfolio wealth loss**.

---

## 4. Backend API Specifications

The FastAPI backend exposes 18 production-ready REST endpoints:

| Method | Endpoint Path | Description |
| :--- | :--- | :--- |
| `GET` | `/health` | Server health & database WAL status |
| `GET` | `/api/stocks` | Full universe list of tracked NIFTY stocks |
| `GET` | `/api/stocks/search?q={query}` | Search stock universe with empty fallback |
| `GET` | `/api/market/summary` | Broad market indices, NIFTY level, VIX |
| `GET` | `/api/sync/status` | Background market data scheduler status |
| `GET` | `/api/stocks/{symbol}/price-history` | Historical candlestick data (1d to 1y) |
| `GET` | `/api/stocks/{symbol}/signals` | Active technical signals (RSI, MACD, EMA) |
| `GET` | `/api/stocks/{symbol}/news` | Visitable RSS news feed items |
| `GET` | `/api/stocks/{symbol}/explanation` | Grounded RAG prose explanation |
| `GET` | `/api/stocks/{symbol}/forecast` | ARIMA $(p,d,q)$ projected range bounds |
| `GET` | `/api/stocks/compare?symbols={s1,s2}` | Side-by-side metrics & confusion matrices |
| `POST`| `/api/stocks/bulk-signals` | Watchlist batch signal fetching |
| `GET` | `/api/watchlist/signals` | Signals for tracked watchlist basket |
| `GET` | `/api/portfolio/stress-scenarios` | Portfolio crash stress-test simulation |
| `GET` | `/api/mf/search?q={query}` | AMFI mutual fund search |
| `GET` | `/api/mf/top-funds` | Top mutual fund schemes by Sharpe ratio |
| `GET` | `/api/retrain/history` | Champion vs Challenger retraining log |
| `POST`| `/api/chat` | RAG-grounded AI chatbot with suggestions |

---

## 5. Frontend Modules & UI Architecture

Clearward features a high-density, dark terminal aesthetic styled with Vanilla CSS (`#0C0E1A` background, `var(--amber-gold)` accents):

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 1. Market Ticker Tape (NIFTY 50, SENSEX, INDIA VIX, Sector Indices)         │
├─────────────────────────────────────────────────────────────────────────────┤
│ 2. Search Header & Global Watchlist Basket Bar                              │
├─────────────────────────────────────────────────────────────────────────────┤
│ 3. Main Workspace Views:                                                    │
│    ├── Stock Intelligence (Candlestick Chart + Technical Indicators)         │
│    ├── Hype Guard (Pump-and-Dump Scanner & Anomaly Meters)                  │
│    ├── Multi-Stock Comparison (Quant Table + 2x2 Confusion Matrix + Radar)   │
│    ├── Portfolio Doctor (MF Overlap & Expense Ratio Calculator)             │
│    ├── Mutual Fund Analyzer (CAGR, Sharpe, Drawdown metrics)                │
│    └── Tracked Watchlist (Summary KPI Cards + Add Bar + Dual View)          │
├─────────────────────────────────────────────────────────────────────────────┤
│ 4. Floating AI Chatbot Popup Widget (Fixed Bottom Right, Always Accessible) │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. SEBI Regulatory Compliance & Non-Directional Framing

To maintain compliance with Securities and Exchange Board of India (SEBI) Research Analyst and Investment Adviser Regulations:

1. **No Buy/Sell/Hold Language**: All trading advice terms are strictly forbidden.
2. **Regime Labels**: Output is framed as statistical directional bias:
   - `POSITIVE BIAS` (instead of Buy/Up)
   - `NEGATIVE BIAS` (instead of Sell/Down)
   - `CONSOLIDATION` (instead of Neutral)
3. **Mandatory Educational Disclaimer**:
   > *For education only. Not investment advice.*

---

## 7. Deployment & Verification Guide

### Automated Unit Test Execution
To run the 22-test backend unit test suite:
```bash
cd backend
pytest tests/
```

### Production Build Compilation
To compile the Vite single-page application:
```bash
cd frontend
npm run build
```

### Server Execution Commands
* **Backend FastAPI Server**:
  ```bash
  cd backend
  uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
  ```
* **Frontend Dev Server**:
  ```bash
  cd frontend
  npm run dev
  ```
