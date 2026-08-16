# Clearward

A financial analytics platform for Indian equity markets — real-time NSE data, ML direction prediction, shareholding patterns, and portfolio risk in one place.

Built as a research project to see whether regime-aware features (HMM market states + VADER news sentiment) actually move the needle on short-horizon direction prediction for Nifty stocks.

> **For education only. Not investment advice.**

---

## Features

Search any of the 347 indexed NSE stocks and you get:

**Analysis**
- OHLCV price chart (2-year history, refreshed daily)
- RSI, MACD, Bollinger Bands with a composite signal score
- ML direction prediction — 17-feature Random Forest + TCN ensemble, trained with walk-forward cross-validation
- ARIMA + TCN 10-day price forecast
- Promoter / FII / DII / public shareholding breakdown from SEBI filings

**Portfolio tools**
- Paste your holdings → VaR (95%), Sharpe, Sortino, max drawdown, sector concentration
- Stress test against custom market crash scenarios
- Mutual fund analyzer — expense ratio, top holdings, portfolio overlap

**Research tools**
- HypeGuard: RSS news sentiment score via ChromaDB vector similarity
- RAG chatbot: plain-English questions, answers grounded in ingested news
- CSV export of any prediction run
- Model changelog: see every retraining event per symbol

---

## How the ML pipeline works

Walk-forward cross-validation with 5 splits, minimum 120 training days, and a **3-day embargo gap** between train and test windows to stop the forward-return target from leaking back. Features are SHA-256 hashed so if the feature schema changes, old models are automatically retired.

Three models train in parallel (3.37× faster than serial):

| Model | Description |
|---|---|
| Random Forest | 17 features: OHLCV technicals + HMM regime state + VADER sentiment |
| TCN | Temporal Convolutional Network (PyTorch 2.6), dilations 1/2/4/8 |
| MLP | sklearn feed-forward, fast fallback |

The HMM runs a 2-state Gaussian EM built from scratch with numpy + scipy — no hmmlearn. Posterior probabilities become features for the RF rather than hard labels.

**Ablation (5 stocks, 2022–2024):**

| Config | Mean macro-F1 |
|---|---|
| Majority baseline | 0.14 |
| RF, no regime/sentiment | 0.26 |
| Full RF, 17 features | 0.25 |

Beats majority baseline by 75%. The regime/sentiment delta is small at N=5 — consistent with Gu et al. (2020).

---

## Stack

```
Backend    FastAPI · SQLite (WAL mode) · APScheduler
ML         scikit-learn · PyTorch 2.6 · numpy · scipy
Data       yfinance · ChromaDB · sentence-transformers · VADER · feedparser
Frontend   React 18 · Vite 5 · Recharts · Lucide · vanilla CSS
```

---

## Running locally

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

Open **http://localhost:3000**

The database seeds itself on first run (~30s). ML models train on the first prediction request per stock (~15s cold start, cached after).

---

## Project structure

```
clearward/
├── backend/
│   ├── app/
│   │   ├── main.py                    # 36 API routes
│   │   ├── ml/
│   │   │   ├── models/baseline_rf.py  # Random Forest
│   │   │   ├── models/tcn_model.py    # TCN (PyTorch)
│   │   │   ├── feature_engineering.py # 17-feature matrix + VADER
│   │   │   ├── regime_detector.py     # Gaussian HMM from scratch
│   │   │   ├── validation.py          # Walk-forward + 3-day embargo
│   │   │   └── parallel_trainer.py    # Concurrent fold training
│   │   ├── data/shareholding.py       # NSE SEBI filing fetcher
│   │   ├── rag/explainer.py           # RAG via ChromaDB
│   │   └── routes/                    # Portfolio, MF, chat, hype
│   ├── tests/                         # 29 tests
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/                # 26 React components
│   │   └── utils/sebiFormatter.js     # POSITIVE BIAS / NEGATIVE BIAS labels
│   └── vite.config.js
└── Clearward_Research_Novelties.docx  # Research paper draft
```

---

## API

Swagger UI at `/docs` when running locally. Key endpoints:

```
GET  /health
GET  /api/stocks/search?q=RELIANCE
GET  /api/stocks/{symbol}/price-history?period=1y
GET  /api/stocks/{symbol}/signals
GET  /api/stocks/{symbol}/predict
GET  /api/stocks/{symbol}/predict/export          CSV
GET  /api/stocks/{symbol}/shareholding
GET  /api/stocks/{symbol}/explanation
GET  /api/stocks/{ticker}/forecast
POST /api/stocks/bulk-signals
POST /api/portfolio/audit
POST /api/chat
GET  /api/mf/{scheme_code}/analyze
```

---

## Research context

Implementation for a paper examining:
1. Do HMM regime features + VADER sentiment improve walk-forward F1 on NSE stocks?
2. Does parallelising walk-forward folds reduce wall time? (Yes — 3.37×)
3. What does NSE-calibrated Almgren-Chriss transaction cost modelling do to reported strategy returns?

Papers: Bai et al. 2018 (TCN), Hamilton 1989 (HMM), Ang & Timmermann 2012, Gu et al. 2020 (ML in asset pricing), Almgren & Chriss 2001 (optimal execution).

---

## License

MIT
