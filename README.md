# Clearward

A financial analytics platform for Indian equity markets — real-time NSE data, ML direction prediction, shareholding patterns, and portfolio risk in one place.

Built as a research project to see whether regime-aware features (HMM market states + VADER news sentiment) actually move the needle on short-horizon direction prediction for Nifty stocks. Short answer: they help, but you need more than 5 stocks to prove it statistically.

> **For education only. Not investment advice.**

---

## Live

| | URL |
|---|---|
| Frontend | [clearward.vercel.app](https://clearward.vercel.app) |
| Backend API | [clearward-backend.onrender.com/docs](https://clearward-backend.onrender.com/docs) |
| GitHub | [github.com/IronLad123/clearward](https://github.com/IronLad123/clearward) |

> The Render free tier spins down after 15 min of inactivity. First request after sleep takes ~30s to wake up — refresh once if you see a timeout.

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

Walk-forward cross-validation with 5 splits, minimum 120 training days, and a **3-day embargo gap** between training and test windows to stop the forward-return target from leaking back. Features are SHA-256 hashed so if the feature schema changes, old pickled models are automatically retired.

Three models train in parallel (3.37× faster than serial):

| Model | Description |
|---|---|
| Random Forest | 17 features: OHLCV-derived technicals + HMM regime state + VADER sentiment score |
| TCN | Temporal Convolutional Network (PyTorch 2.6), dilations 1/2/4/8, receptive field = 31 days |
| MLP | sklearn feed-forward, 14 features, fast fallback when PyTorch unavailable |

The HMM runs a 2-state Gaussian EM algorithm built from scratch with numpy + scipy. No hmmlearn. The two states roughly correspond to trending vs. mean-reverting regimes, and the posterior probabilities become features for the RF classifier rather than hard labels — so the model learns the interaction itself.

**Ablation (5 stocks, 2022–2024):**

| Config | Mean macro-F1 |
|---|---|
| Majority baseline | 0.14 |
| RF, no regime features | 0.26 |
| RF, no sentiment | 0.26 |
| Full RF, 17 features | 0.25 |

The full model beats the majority baseline by 75%. The regime/sentiment delta is small at N=5 — consistent with Gu et al. (2020) who show feature gains only emerge clearly at large N. A 327-symbol experiment is the obvious next step.

---

## Tech stack

```
Backend    FastAPI · SQLite (WAL mode) · APScheduler
ML         scikit-learn · PyTorch 2.6 · numpy · scipy
Data       yfinance · ChromaDB · sentence-transformers · VADER · feedparser
Frontend   React 18 · Vite 5 · Recharts · Lucide · vanilla CSS
CI/CD      GitHub Actions → Vercel (frontend) · Render (backend)
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

The database seeds itself on first run (~30s). ML models train on the first prediction request per stock (~15s cold start, cached after that).

---

## Deploying your own instance

The repo ships with GitHub Actions workflows that handle deployment automatically on every push to `main`. You need 6 secrets in your repo settings.

### 1. Backend → Render

Go to [render.com/new/web](https://render.com/new/web), connect this repo, and fill in:

```
Build:  pip install -r backend/requirements.txt
Start:  cd backend && uvicorn app.main:app --host 0.0.0.0 --port $PORT
Region: Singapore  (closest to NSE data)
Plan:   Free
```

Add env var: `ALLOWED_ORIGINS = https://YOUR-APP.vercel.app,http://localhost:3000`

After it deploys, grab your **Service ID** (Settings page) and **API key** (Account → API Keys).

### 2. Frontend → Vercel

Go to [vercel.com/new](https://vercel.com/new), import this repo:

```
Root directory:   frontend
Build command:    npm run build
Output directory: dist
```

Add env var: `VITE_API_URL = https://YOUR-SERVICE.onrender.com`

After deploy, grab your **Project ID**, **Org ID** (both in Project Settings), and a **token** (Account Settings → Tokens).

### 3. GitHub Secrets

Go to `Settings → Secrets → Actions` in your fork and add:

| Secret | Where to find it |
|---|---|
| `VERCEL_TOKEN` | Vercel → Account Settings → Tokens |
| `VERCEL_ORG_ID` | Vercel → Project Settings → General |
| `VERCEL_PROJECT_ID` | Vercel → Project Settings → General |
| `RENDER_API_KEY` | Render → Account Settings → API Keys |
| `RENDER_SERVICE_ID` | Render → Service → Settings |
| `VITE_API_URL` | Your Render URL |

After that, every push to `main` deploys frontend to Vercel and triggers a Render redeploy automatically. PRs run the test suite only.

---

## Project layout

```
clearward/
├── .github/workflows/
│   ├── deploy.yml          # push to main → Vercel + Render
│   └── test.yml            # PRs → run 29 backend tests + frontend build
├── backend/
│   ├── app/
│   │   ├── main.py                    # 36 API routes
│   │   ├── ml/
│   │   │   ├── models/baseline_rf.py  # Random Forest classifier
│   │   │   ├── models/tcn_model.py    # TCN (PyTorch)
│   │   │   ├── feature_engineering.py # 17-feature matrix + VADER
│   │   │   ├── regime_detector.py     # Gaussian HMM from scratch
│   │   │   ├── validation.py          # Walk-forward + 3-day embargo
│   │   │   └── parallel_trainer.py    # Concurrent fold training
│   │   ├── data/shareholding.py       # NSE SEBI filing fetcher
│   │   ├── rag/explainer.py           # RAG via ChromaDB
│   │   └── routes/                    # Portfolio, MF, chat, hype endpoints
│   ├── tests/                         # 29 tests
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/                # 26 React components
│   │   └── utils/sebiFormatter.js     # POSITIVE BIAS / NEGATIVE BIAS labels
│   ├── vercel.json
│   └── vite.config.js
├── render.yaml                        # Render auto-config
├── Procfile                           # Fallback start command
└── Clearward_Research_Novelties.docx  # Research paper draft
```

---

## API reference

Swagger UI at `/docs`. Key endpoints:

```
GET  /health
GET  /api/stocks/search?q=RELIANCE
GET  /api/stocks/{symbol}/price-history?period=1y
GET  /api/stocks/{symbol}/signals
GET  /api/stocks/{symbol}/predict
GET  /api/stocks/{symbol}/predict/export          CSV download
GET  /api/stocks/{symbol}/shareholding            promoter/FII/DII/public %
GET  /api/stocks/{symbol}/explanation             RAG-generated plain English
GET  /api/stocks/{ticker}/forecast                ARIMA + TCN 10-day
POST /api/stocks/bulk-signals                     batch fetch for watchlist
POST /api/stocks/bulk-shareholding                batch shareholding (max 10)
POST /api/portfolio/audit                         VaR, Sharpe, drawdown
POST /api/chat                                    RAG chatbot
GET  /api/mf/{scheme_code}/analyze                mutual fund analysis
```

---

## Research context

This is the implementation for a paper looking at three things:

1. Do HMM regime features + VADER sentiment improve walk-forward prediction F1 on NSE stocks compared to a pure technical-indicator baseline?
2. Does parallelising walk-forward folds meaningfully reduce wall time? (Yes — 3.37×)
3. What does NSE-calibrated transaction cost modelling (Almgren-Chriss) do to reported strategy returns?

Papers used: Bai et al. 2018 (TCN architecture), Hamilton 1989 (HMM), Ang & Timmermann 2012 (regime changes in financial markets), Gu et al. 2020 (ML in asset pricing), Almgren & Chriss 2001 (optimal execution with market impact).

---

## License

MIT
