# Architectural Decisions Log (ADR)

_Once a decision is CLOSED here, it is NOT revisited without explicit user approval._
_Format: Decision → Rationale → Consequences → Status_

---

## ADR-001: India-Only Scope
**Decision:** Platform covers only Indian markets — NSE/BSE stocks, AMFI mutual funds, SEBI regulations.

**Rationale:** 93% retail loss rate in India, 216M demat accounts growing 27–33% YoY, 76% financial illiteracy = highest impact per unit of effort. Deeply India-specific regulatory context (SEBI, AMFI, Indian tax law) makes global scope counterproductive. User confirmed.

**Consequences:** No US stocks, no crypto, no forex, no international MFs in Phase 1.

**Status:** CLOSED — _2026-07-25_

---

## ADR-002: Not a Trading Platform
**Decision:** Platform does NOT execute trades, provide buy/sell calls, or act as a SEBI-registered investment advisor.

**Rationale:** Trading execution requires SEBI broker registration. Investment advice requires SEBI RIA (Registered Investment Advisor) registration. Neither is in scope. Mission is protection and education, not execution. Legal liability avoided.

**Consequences:** No broker API integration. No order placement. All outputs labeled "For education only. Not investment advice. Past performance does not guarantee future results."

**Status:** CLOSED — _2026-07-25_

---

## ADR-003: End-of-Day Data Only (No Real-Time)
**Decision:** All price data sourced from end-of-day (EOD) snapshots via yfinance. No real-time or tick data.

**Rationale:** Real-time data APIs cost $200–$2,000/month (NSE official, Refinitiv, Bloomberg). EOD data is free via yfinance. Our analysis use cases (technical indicators, ML signals, risk analysis) do not require tick-level precision. Real-time data creates false urgency, which contradicts our protection-first philosophy.

**Consequences:** Prices shown may be up to 1 trading day old. Every price display must show a timestamp. No intraday analysis.

**Status:** CLOSED — _2026-07-25_

---

## ADR-004: Mutual Fund Data via mfapi.in
**Decision:** Use `mfapi.in` (community-maintained AMFI data wrapper) for all mutual fund NAV history and scheme metadata.

**Rationale:** Free, no authentication required. Covers all ~1,500+ AMFI-registered schemes. Returns clean JSON. Official AMFI data underneath. Alternative (direct AMFI scraping) is brittle and requires HTML parsing.

**Consequences:** Dependent on community-maintained service. Fallback: direct AMFI text file parsing at `https://www.amfiindia.com/spages/NAVAll.txt`. Must handle mfapi.in downtime gracefully with cached data + explicit user warning.

**Status:** CLOSED — _2026-07-25_

---

## ADR-005: SQLite TTL Cache for All External APIs
**Decision:** Cache all external API responses (yfinance, mfapi.in) in a dedicated SQLite database with time-to-live (TTL) expiry.

**Rationale:** yfinance is rate-limited and slow (3–8s per call). mfapi.in updates once daily. Repeated calls for the same data within a session waste time and risk throttling. Cache reduces latency to <100ms on hit.

**TTL Policy:**
| Category | TTL |
|----------|-----|
| Stock OHLCV | 6 hours |
| Stock signals | 6 hours |
| Mutual fund NAV | 23 hours |
| Market summary | 15 minutes |
| News/explanation | 12 hours |
| SEBI static content | 7 days |

**Consequences:** Cache must be proactively invalidated after market close (6:00 PM IST for stocks, 11:00 PM IST for MF NAVs). Cache module must fail-open — if cache read/write fails, real API call proceeds normally.

**Status:** CLOSED — _2026-07-25_

---

## ADR-006: React + Vite SPA (No Migration to Next.js)
**Decision:** Keep existing React + Vite single-page application. Do not migrate to Next.js or any SSR framework.

**Rationale:** Already built and working. SSR not needed — platform is a tool, not a public-facing marketing site. SEO not a priority. Code-splitting via `React.lazy` + `Suspense` is sufficient. Migration cost exceeds benefit.

**Consequences:** No server-side rendering. No server-side routing. Client-side only. All API calls go to FastAPI backend on port 8000.

**Status:** CLOSED — _2026-07-25_

---

## ADR-007: Design System Tokens
**Decision:** Use the following fixed design tokens across all components.

**Colors:**
- Signal Gold: `#C9A54D` — active states, branding, highlights
- Rally Green: `#3DDC84` — bullish signals, positive values
- Selloff Red: `#FF5C6C` — bearish signals, negative values, warnings
- Background Dark: `#0b0f17`
- Card Background: `rgba(17, 24, 39, 0.75)` (glassmorphism)

**Typography:**
- Display / Headings: Space Grotesk
- Body / UI: Public Sans
- Numbers / Data: IBM Plex Mono (tabular-nums, prevents layout shift)

**Design Philosophy:** "Terminal precision, retail warmth" — precise enough to trust with real money, warm enough that a first-time investor in Sitapur or Seattle doesn't feel lost.

**Consequences:** All new components must use these tokens via CSS variables. No ad-hoc colors.

**Status:** CLOSED — _2026-07-25_

---

## ADR-008: Persistent Disclaimer on Every Output
**Decision:** Every signal, recommendation, analysis output, and projection carries this disclaimer:
> "For education only. Not investment advice. Past performance does not guarantee future results."

**Rationale:** Legal protection. User trust. SEBI guidelines require non-registered entities to clearly disclaim advisory status. Research shows users interpret AI output as authoritative — explicit disclaimers are necessary to counteract this.

**Consequences:** DisclaimerBanner component already exists. Every new module (MF Analyzer, Portfolio Doctor, Hype Scanner) must display the disclaimer. No exceptions.

**Status:** CLOSED — _2026-07-25_
