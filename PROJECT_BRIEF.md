# Clearward — Project Brief (Session Restoration Document)
_Read this at the start of every session. It replaces re-explaining the project._

---

## Mission
AI-powered financial self-defense and literacy platform for Indian retail investors.
**NOT** a trading platform. **NOT** investment advice. A **protection and education layer**.

---

## Model Workflow Protocol

```
Claude Sonnet/Opus → THINK + DESIGN + SPEC (write to HANDOFF.md)
Gemini Flash (High) → BUILD + EXECUTE + TEST (read HANDOFF.md)
```

| Use Claude for | Use Gemini Flash for |
|----------------|---------------------|
| Architecture decisions | Writing code from a spec |
| Designing module input/output | Creating files and components |
| SEBI rules / Academy content accuracy | Running tests and commands |
| Complex debugging | Fixing specific described bugs |
| Reviewing built code for correctness | Adding routes/components from spec |

**The switch protocol:**
1. On Claude → Design, write exact spec into `HANDOFF.md`
2. Switch to Gemini Flash → Say **"Execute HANDOFF.md"**
3. Flash builds from spec without re-thinking
4. Switch back to Claude → Review output, plan next

**Session start commands:**
- Planning session (Claude): *"Read PROJECT_BRIEF.md and HANDOFF.md"*
- Execution session (Flash): *"Read PROJECT_BRIEF.md and HANDOFF.md. Execute the tasks."*

---

## Core Problem (Evidence-Grounded)
| Fact | Source |
|------|--------|
| 93% of retail F&O traders lost money FY22–FY24 | SEBI, Sept 2024 |
| ₹1.81 lakh crore ($21.7B) destroyed in 3 years | SEBI, Sept 2024 |
| Average loss per trader: ₹2,00,000 | SEBI, Sept 2024 |
| 43% of F&O traders are under 30 years old | SEBI, Sept 2024 |
| 76% of Indian adults are financially illiterate | S&P Global FinLit |
| 216 million demat accounts (Dec 2025), growing 27–33% YoY | CDSL/NSDL |
| 75%+ of new accounts from Tier 2/3 cities | NSE/PIB |

---

## Target Users
**Primary:** Age 18–35, Tier 1/2/3 India, 0–2 years experience, ₹25K–5L capital.
Opened Groww/Zerodha after seeing COVID rally. Follows Telegram tips. No real knowledge.

**Secondary:** Age 25–45, SIP investor who set it and forgot it. In Regular plans.
Paying 1–1.5% extra expense ratio. Holds 6 large-cap funds owning the same 50 stocks.

---

## Guiding Principles (Non-Negotiable)
- Show **RISK** before reward
- Show **FRICTION** before action
- Show **EDUCATION** before execution
- India-only: NSE/BSE stocks + AMFI mutual funds + SEBI regulations
- ₹ currency everywhere, always
- Zero placeholders, zero dummy code, zero tolerance for errors
- Persistent disclaimer on every output: _"For education only. Not investment advice."_
- Every calculation documented and verified against at least 2 sources
- Missing/stale data shown explicitly — never silently ignored

---

## The Six Modules

| # | Module | Input | Output |
|---|--------|-------|--------|
| 1 | **Stock Risk Analyzer** | NSE symbol + optional ₹ amount | Risk score, drawdown, signal + confidence %, ₹ loss estimate, promoter pledging |
| 2 | **Mutual Fund Analyzer** | Fund name/AMFI code + optional SIP | Cost audit, perf vs benchmark, Direct/Regular flag, SIP projection |
| 3 | **Portfolio Health Doctor** | All holdings (stocks + MFs) in ₹ | Asset allocation, overlap, stress test, cost audit, top 3 actions |
| 4 | **Hype vs. Health Scanner** | NSE symbol | Volume anomaly, hype flag, fundamental vs price check |
| 5 | **Behavioral Nudge Engine** | Session behavior (silent, system-level) | Contextual warnings: FOMO, VIX, overtrading, low liquidity |
| 6 | **Academy (4 Pillars)** | Concept + user skill level | Formula, example, simulator, SEBI rules, quiz |

### Academy Pillars
1. Technical Analysis (EMA, RSI, MACD, Bollinger Bands, ATR)
2. Mutual Fund Fundamentals (NAV, expense ratio, Direct vs Regular, SIP math, ELSS)
3. SEBI Rules & Investor Rights (circuits, T+1, F&O danger zone, MF rules, SCORES, rights)
4. Financial Fundamentals (compounding, inflation, emergency fund, 80C planning)

---

## What We Do NOT Build
| Out of Scope | Reason |
|---|---|
| Trade execution / order placement | Requires SEBI registration |
| Price targets / return guarantees | Illegal without SEBI RIA |
| Real-time tick data | Cost-prohibitive; EOD sufficient |
| Non-Indian markets | Out of scope Phase 1 |
| User funds / wallets | Requires RBI authorization |

---

## Tech Stack

### Backend (Python, port 8000)
- **FastAPI** — REST API
- **SQLAlchemy + SQLite** (WAL mode) — primary database
- **yfinance** — NSE/BSE OHLCV data (.NS suffix for NSE)
- **mfapi.in** — AMFI mutual fund NAV data (free, no auth, ~1500+ schemes)
- **ChromaDB** — vector store for RAG explanations
- **scikit-learn** — Random Forest classifier
- **TensorFlow/Keras** — LSTM classifier
- **SQLite TTL Cache** (`app/cache/cache_manager.py`) — all external API responses cached

### Frontend (React + Vite, port 3000)
- **React** + **Vite** — SPA
- **Recharts** — candlestick + indicator overlays
- **Lucide React** — icons
- **CSS Variables** design system
- Fonts: Space Grotesk (display), Public Sans (body), IBM Plex Mono (numbers)
- Brand: Signal Gold `#C9A54D`, Rally Green `#3DDC84`, Selloff Red `#FF5C6C`

---

## Data Sources
| Data | Source | TTL Cache |
|------|--------|-----------|
| Stock OHLCV | `yfinance` (`.NS` suffix) | 6 hours |
| Mutual fund NAV history | `mfapi.in` | 23 hours |
| MF scheme list / search | `mfapi.in/mf` + `mfapi.in/mf/search` | 23 hours |
| India VIX | `yfinance` (`^INDIAVIX`) | 6 hours |
| Market summary | `yfinance` (NIFTY50, SENSEX) | 15 minutes |
| SEBI rules content | Static (sebi.gov.in public docs) | 7 days |
| Promoter pledging | BSE filings (public, quarterly) | 7 days |

---

## File Structure
```
Financial_Analytics_Project/
├── backend/
│ ├── app/
│ │ ├── main.py ← FastAPI routes (15+ endpoints)
│ │ ├── config.py
│ │ ├── database/ ← SQLAlchemy models, db.py (WAL mode)
│ │ ├── ingestion/ ← price_ingestion, news_scraper, vector_store, nse_catalog
│ │ ├── signals/ ← indicators.py, signal_filter.py
│ │ ├── ml/ ← baseline_rf.py, lstm_model.py, backtester.py, validation.py
│ │ ├── retraining/ ← evaluator.py, scheduler.py
│ │ └── cache/ ← cache_manager.py, mf_client.py (NEW)
│ ├── data/ ← api_cache.db (SQLite cache, git-ignored)
│ └── tests/
├── frontend/
│ └── src/
│ ├── App.jsx ← root, router, parallel Promise.all fetches
│ ├── components/
│ │ ├── StockChart.jsx
│ │ ├── PredictionCard.jsx
│ │ ├── SignalCard.jsx
│ │ ├── ExplanationView.jsx
│ │ ├── WatchlistView.jsx
│ │ ├── RiskManagementCard.jsx
│ │ ├── EducationAcademyView.jsx ← Academy (Pillar 1 complete)
│ │ ├── ModelChangelogView.jsx
│ │ ├── StockComparisonView.jsx
│ │ ├── SearchHeader.jsx
│ │ ├── MobileNav.jsx
│ │ ├── MarketTickerTape.jsx
│ │ ├── DisclaimerBanner.jsx
│ │ ├── ModelHealthBadge.jsx
│ │ └── ErrorBoundary.jsx
│ └── index.css
├── PROJECT_BRIEF.md ← THIS FILE
├── SESSION_LOG.md ← running session history
├── DECISIONS.md ← architectural decisions (ADRs)
├── session_start.sh ← one-command server launcher
└── start.py ← original launcher
```

---

## Current Build Status

### Completed
- FastAPI backend: all core routes working
- ML pipeline: Random Forest + LSTM, walk-forward validation, champion-challenger evaluator
- Technical indicators: EMA20/50, Bollinger Bands, RSI-14, MACD, ATR-14
- Backtester: equity curve, Sharpe ratio, max drawdown
- RAG explanation engine: ChromaDB + RSS news scraper
- Retraining scheduler: 24h interval
- SQLite cache layer: `app/cache/cache_manager.py` + `mf_client.py`
- React dashboard: candlestick chart + indicator overlays (EMA, BB, RSI, MACD toggles)
- Components: Signal, Prediction, Explanation, Risk, Watchlist, Comparison, ModelChangelog
- Module 4: **Hype vs. Health Scanner** (`GET /api/hype-score/{ticker}`, `HypeAndHealthCard.jsx`)
- Module 5: **Behavioral Nudge Engine** (`GET /api/market-context`, `BehavioralNudgeBanner.jsx`)
- Academy Pillar 1: animated strategy simulator + formula cards (EMA, RSI, MACD, BB, ATR)
- Mobile navigation + responsive layout
- Error boundary, disclaimer banner, market ticker tape
- Session pipeline & 5-Agent team protocol

### In Progress / Next
1. **Module 2: Mutual Fund Analyzer** — backend routes + React component
2. **Module 3: Portfolio Health Doctor** — backend computation + React component
3. **Academy Pillar 2** — Mutual Fund Fundamentals
4. **Academy Pillar 3** — SEBI Rules & Investor Rights
5. **Academy Pillar 4** — Financial Fundamentals

---

## How to Start Every Session
```bash
# Option 1: One command (recommended)
cd /Users/omsrivastava/Desktop/Financial_Analytics_Project
./session_start.sh

# Option 2: Manual
source backend/venv/bin/activate
python3 -m uvicorn app.main:app --reload --port 8000 # in /backend
cd frontend && npm run dev # in /frontend

# URLs
# Backend API: http://localhost:8000
# Frontend app: http://localhost:3000
# API docs: http://localhost:8000/docs
```

---

## Locked Architectural Decisions (see DECISIONS.md)
- ADR-001: India-only scope
- ADR-002: Not a trading platform
- ADR-003: EOD data only (no real-time)
- ADR-004: mfapi.in for mutual fund data
- ADR-005: SQLite TTL cache for all external APIs
- ADR-006: React + Vite (no Next.js migration)
- ADR-007: Design system tokens (Signal Gold, Rally Green, Selloff Red)
- ADR-008: Persistent disclaimer on every output
