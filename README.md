# Clearward

A financial analytics platform for Indian equity markets. It combines real-time NSE price data, machine learning direction prediction, and portfolio risk analysis into a single web interface.

Built as a research project exploring whether regime-aware ML features (Hidden Markov Models + VADER sentiment) meaningfully improve short-horizon direction prediction for Nifty-listed stocks.

> **For education only. Not investment advice.**

---

## What it does

You search for any NSE stock (347 indexed), and the platform shows you:

- Price chart with volume (2-year history, refreshed daily from yfinance)
- Technical signals — RSI, MACD, Bollinger Bands, and a composite signal score
- ML direction prediction using a 17-feature Random Forest + TCN ensemble, trained walk-forward with a 3-day embargo gap to prevent target leakage
- ARIMA + TCN time-series forecast for the next 10 trading days
- Shareholding pattern — promoter %, FII, DII, public, pulled from NSE SEBI quarterly filings
- Portfolio audit — paste your holdings and get VaR (95%), Sharpe ratio, max drawdown, and a sector overlap heatmap
- Mutual fund analyzer — pick any AMFI scheme and see its top holdings, expense ratio, and overlap with your existing portfolio
- HypeGuard — a sentiment score derived from RSS news feeds + ChromaDB vector similarity
- RAG chatbot — ask plain-English questions, answers are grounded in the news it has ingested

---

## ML approach

The prediction pipeline runs walk-forward cross-validation (5 splits, min 120 training days) with a 3-day embargo to prevent the forward-return target from leaking into training. Features are hashed for schema versioning so stale models are automatically retired.

Three models run in parallel (3.37× speedup over serial):

| Model | Architecture | Notes |
|---|---|---|
| Random Forest | 17 features including HMM regime state + VADER score | Main classifier |
| TCN | Temporal Convolutional Network, PyTorch 2.6, dilations 1/2/4/8 | Sequence model |
| MLP | Feed-forward, sklearn, 14 features | Fast fallback |

Regime detection uses a 2-state Gaussian HMM (EM algorithm) implemented from scratch with numpy + scipy — no hmmlearn dependency.

Ablation results (5 stocks, 2022–2024, macro-F1):
- Majority baseline: 0.14
- Full RF 17 features: 0.25 (+75% over baseline)
- The regime/sentiment lift is small on 5 stocks, consistent with Gu et al. (2020) showing feature gains require large N

---

## Stack

**Backend** — FastAPI, SQLite (WAL), APScheduler, scikit-learn, PyTorch 2.6, yfinance, ChromaDB, sentence-transformers, VADER

**Frontend** — React 18, Vite 5, Recharts, Lucide icons, vanilla CSS

**Data** — NSE universe via yfinance (347 stocks), AMFI for mutual funds, RSS feeds for news

---

## Running locally

```bash
git clone https://github.com/YOUR_USERNAME/clearward.git
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

Open http://localhost:3000

First run takes ~30 seconds to seed the database. The ML model trains on first prediction request for each stock (cold start ~15s, cached after).

---

## Project structure

```
Financial_Analytics_Project/
├── backend/
│   ├── app/
│   │   ├── main.py              # 36 API routes
│   │   ├── ml/
│   │   │   ├── models/          # RF, TCN, MLP classifiers
│   │   │   ├── feature_engineering.py   # 17-feature matrix
│   │   │   ├── regime_detector.py       # HMM from scratch
│   │   │   ├── validation.py            # Walk-forward + embargo
│   │   │   └── parallel_trainer.py      # 3.37× speedup
│   │   ├── data/
│   │   │   └── shareholding.py  # NSE SEBI filing fetcher
│   │   ├── rag/
│   │   │   └── explainer.py     # ChromaDB + sentence-transformers
│   │   └── routes/              # Portfolio, MF, chat, hype
│   └── tests/                   # 29 tests
├── frontend/
│   └── src/
│       ├── components/          # 26 React components
│       └── utils/
│           └── sebiFormatter.js # SEBI-compliant label formatting
└── Clearward_Research_Novelties.docx   # Research paper draft
```

---

## API

Full Swagger docs at `/docs` when running locally.

Key endpoints:

```
GET  /api/stocks/search?q=RELIANCE
GET  /api/stocks/{symbol}/predict
GET  /api/stocks/{symbol}/shareholding
GET  /api/stocks/{symbol}/price-history?period=1y
GET  /api/stocks/{symbol}/predict/export      (CSV)
POST /api/stocks/bulk-signals                 (watchlist batch)
POST /api/portfolio/audit
GET  /api/stocks/{symbol}/forecast
POST /api/chat
GET  /health
```

---

## Deployment

Frontend is on Vercel. Backend runs on Render (free tier, 512MB RAM).

If the Render instance is sleeping (free tier spins down after 15 min of inactivity), the first request takes ~30s to wake up.

---

## Research context

This project is the implementation basis for a research paper examining:
1. Whether HMM regime features improve walk-forward F1 on NSE stocks
2. The 3.37× parallel training speedup from concurrent walk-forward folds
3. NSE-calibrated transaction costs using the Almgren-Chriss market impact model

Reference papers: Bai et al. 2018 (TCN), Hamilton 1989 (HMM), Ang & Timmermann 2012 (regime changes), Gu et al. 2020 (ML in asset pricing), Almgren & Chriss 2001 (optimal execution).

---

## License

MIT
