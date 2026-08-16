# Session Log — ClearWard

_Running history of every work session. Update at the END of each session._
_Format: Date → What was built → What broke → Decisions made → Next session priorities_

---

## Session: 2026-07-21 (~6 hours)
**Focus:** Core infrastructure, ML pipeline, frontend dashboard, Academy Pillar 1

### Built
- FastAPI backend with 15+ routes (health, price-history, signals, predict, explain, retrain, market-summary, compare, backtest, watchlist)
- ML pipeline: Random Forest + LSTM classifiers, walk-forward validation, champion-challenger evaluator
- Technical indicators: EMA20/50, Bollinger Bands, RSI-14, MACD, ATR-14
- Backtester: equity curve, Sharpe ratio, max drawdown
- RAG explanation engine: ChromaDB + RSS news scraper
- Retraining scheduler: 24h interval, background task
- React dashboard: candlestick chart + indicator overlays (EMA, BB, RSI, MACD toggles)
- Components: Signal, Prediction, Explanation, Risk, Watchlist, Comparison, ModelChangelog
- Academy Pillar 1: animated strategy simulator + formula cards
- Academy tab connected to App.jsx router + MobileNav

### Fixed
- Duplicate `@app.on_event("startup")` in main.py — merged into one
- CORS: `allow_credentials=True` with `allow_origins=["*"]` is invalid — fixed to specific origins
- Missing `return results` in `get_watchlist_signals`
- `df.set_index("date", inplace=False)` no-op bug — removed
- Indicator NaN at index 0 causing chart overlay failures — removed index-0 guards
- App.jsx reading `dataPrice.price_history` instead of `dataPrice.history` — fixed
- Sequential API fetches → replaced with `Promise.all` parallel fetches
- Added `AbortController` to cancel in-flight requests on symbol change
- Watchlist persisted to `localStorage`

### Decisions Made
- India-only scope confirmed
- Mutual funds included in scope
- SEBI rules added to Academy
- Problem statement formalized

---

## Session: 2026-07-25 (~2 hours)
**Focus:** Direction setting, research synthesis, problem formalization, session pipeline

### Built
- Research synthesis (30 papers: SEBI data, behavioral finance, gamification, AI advisory)
- Problem statement document (formal spec: 6 modules, input/output, error states, data sources)
- Full Academy content spec (4 pillars including complete SEBI rules curriculum)
- Session pipeline:
 - `PROJECT_BRIEF.md` — session restoration document
 - `SESSION_LOG.md` — this file
 - `DECISIONS.md` — architectural decisions log (8 ADRs)
 - `session_start.sh` — one-command launcher
 - `backend/app/cache/cache_manager.py` — SQLite TTL cache
 - `backend/app/cache/mf_client.py` — mutual fund client (mfapi.in)
 - `backend/app/cache/__init__.py`

### Decisions Made
- Platform working title: ClearWard (अर्थरक्षा)
- Zero tolerance for errors — every calculation verified against 2+ sources
- No placeholder code ever
- EOD data only (no real-time) confirmed
- mfapi.in for all mutual fund NAV data
- SQLite TTL cache for all external API responses
- 8 ADRs locked (see DECISIONS.md)

### Next Session Priorities
1. `backend/app/routes/mutual_funds.py` — MF Analyzer API routes
2. `frontend/src/components/MutualFundView.jsx` — MF Analyzer UI
3. Academy Pillar 3: SEBI Rules content in EducationAcademyView.jsx
4. Academy Pillar 2: Mutual Fund Fundamentals
5. Module 4: Hype vs. Health Scanner backend logic

---

## Session: 2026-07-25 (~2.5 hours)
**Focus:** Module 2 (Mutual Fund Analyzer) & Academy Pillar 3 (SEBI Rules Masterclass)

### Built
- Backend API route `backend/app/routes/mutual_funds.py`:
 - `GET /api/mf/search?q={query}`: Searches ~1,500+ AMFI mutual fund schemes with 23h SQLite TTL cache.
 - `GET /api/mf/{scheme_code}/analyze`: Computes 1Y/3Y/5Y CAGR, Max Drawdown, Volatility, Sharpe Ratio ($R_f=6.5\%$), Direct/Regular plan detection, and compounding cost audit over 5Y/10Y/20Y/30Y.
 - Sourced from AMFI via `mfapi.in` with full error handling and persistent disclaimers.
- React Frontend Component `frontend/src/components/MutualFundView.jsx`:
 - Debounced scheme search input with instant dropdown autocomplete.
 - Fund Identity Card (NAV, AMC, Category, Direct/Regular badge).
 - Returns & Risk Grid (CAGR, Max Drawdown, Volatility, Sharpe Ratio).
 - Interactive Monthly SIP Slider (₹1,000 to ₹1,00,000) displaying wealth lost to distributor commissions.
- Academy Pillar 3 in `EducationAcademyView.jsx`:
 - SEBI 2024 F&O 93% retail loss data visualizer.
 - Circuit Breakers & Price Limits (5%, 10%, 20%).
 - T+1 Settlement Framework.
 - SCORES 2.0 Redressal Portal & 21-day resolution timelines.
- Connected tab navigation in `App.jsx` and `MobileNav.jsx`.

### Verified
- Vite build: `npm run build` PASSED (0 errors, code-split chunks).
- API TestClient: Tested search and full analysis for Parag Parikh Flexi Cap (`122640`). All math & fee audit metrics PASSED.

### Next Session Priorities
1. `backend/app/routes/portfolio.py` — Module 3: Portfolio Health Doctor (Holdings Overlap & Stress Test API)
2. `frontend/src/components/PortfolioDoctorView.jsx` — Portfolio Health Doctor UI
3. Academy Pillar 2: Mutual Fund Fundamentals & Academy Pillar 4: Financial Life Planning
