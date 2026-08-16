# ClearWard — Agent Team

_The specialized team that builds, verifies, and maintains this project._

---

## Team Overview

```
 ┌─────────────────┐
 │ ARCHITECT │ ← Claude (high capability)
 │ Plans & Specs │ Reads context, designs modules,
 │ → HANDOFF.md │ writes exact execution specs
 └────────┬────────┘
 │ Writes spec to HANDOFF.md
 ─────────────┼─────────────
 │ │
 ┌────────▼────────┐ ┌─────────▼───────┐
 │ BACKEND DEV │ │ FRONTEND DEV │ ← Gemini Flash (fast)
 │ FastAPI/Python │ │ React/JSX │ Run in PARALLEL
 │ Reads HANDOFF │ │ Reads HANDOFF │
 └────────┬────────┘ └─────────┬───────┘
 │ │
 └──────────┬──────────────┘
 │ Both report DONE
 ┌──────────▼──────────────┐
 │ FINANCIAL VERIFIER │ ← Claude (accuracy critical)
 │ Audits every formula │ Runs independently
 │ VERIFIED / FIX │ Can run in parallel with builders
 └──────────┬──────────────┘
 │
 ┌──────────▼──────────────┐
 │ QA ENGINEER │ ← Gemini Flash (fast)
 │ Tests, curls, builds │ Runs after builders complete
 │ PASS / FAIL │
 └──────────┬──────────────┘
 │
 ┌──────────▼──────────────┐
 │ SCRIBE │ ← Gemini Flash (fast)
 │ Updates all docs │ Always runs last
 │ SESSION_LOG, HANDOFF │
 └─────────────────────────┘
```

---

## The 5 Agents

### Architect (`architect`)
**Model:** Claude (Sonnet/Opus)
**Reads:** PROJECT_BRIEF.md, HANDOFF.md, SESSION_LOG.md
**Writes:** HANDOFF.md (execution spec)
**Job:** Design modules with zero ambiguity. Every formula cited. Every error state explicit.

**Invoke when:**
- Starting a new module
- Resolving ambiguous requirements
- Reviewing completed code for architectural correctness

---

### Backend Dev (`backend_dev`)
**Model:** Gemini Flash (High)
**Reads:** HANDOFF.md (backend tasks)
**Writes:** Python/FastAPI files in backend/
**Job:** Implement exactly what the spec says. Always uses cache. Full error handling.

**Invoke when:**
- HANDOFF.md has backend tasks with status READY TO EXECUTE
- Running in parallel with Frontend Dev

---

### Frontend Dev (`frontend_dev`)
**Model:** Gemini Flash (High)
**Reads:** HANDOFF.md (frontend tasks)
**Writes:** React components in frontend/src/components/
**Job:** Build premium UI from spec. ClearWard design system only. Always runs npm build.

**Invoke when:**
- HANDOFF.md has frontend tasks with status READY TO EXECUTE
- Running in parallel with Backend Dev

---

### Financial Verifier (`financial_verifier`)
**Model:** Claude (Sonnet/Opus)
**Reads:** Code files with financial formulas, HANDOFF.md spec
**Writes:** Nothing (auditor only)
**Job:** Verify every formula, SEBI rule, and calculation against authoritative sources.

**Invoke when:**
- Any new financial calculation is added (CAGR, Sharpe, drawdown, etc.)
- Any SEBI or AMFI rule is stated in Academy content
- Before deploying a financial module
- Output: VERIFIED or NEEDS_CORRECTION with exact citation

---

### QA Engineer (`qa_engineer`)
**Model:** Gemini Flash (High)
**Reads:** HANDOFF.md verification steps
**Writes:** Nothing (tester only)
**Job:** Run all tests, curl all endpoints, build frontend. Report pass/fail.

**Invoke when:**
- Backend Dev and Frontend Dev have both completed their tasks
- Final check before marking HANDOFF tasks as DONE

---

### Scribe (`scribe`)
**Model:** Gemini Flash (High)
**Reads:** Reports from all other agents + current state of pipeline files
**Writes:** SESSION_LOG.md, HANDOFF.md (marks DONE), PROJECT_BRIEF.md (status)
**Job:** Keep all documentation in sync. Always runs last in every cycle.

**Invoke when:**
- QA has completed and all tasks are verified
- At the end of every build session

---

## How to Invoke the Team

### Option A: Full Build Cycle (new feature)
```
1. invoke architect → "Design the [module name] module"
2. invoke backend_dev → "Execute HANDOFF.md backend tasks" ─┐ parallel
 invoke frontend_dev → "Execute HANDOFF.md frontend tasks" ─┘
3. invoke financial_verifier → "Verify all formulas in [file]"
4. invoke qa_engineer → "Run full test suite"
5. invoke scribe → "Update all docs with today's results"
```

### Option B: Quick Backend Fix
```
1. invoke backend_dev → "Fix [specific bug] in [file]"
2. invoke qa_engineer → "Run backend tests only"
3. invoke scribe → "Log the fix"
```

### Option C: Verification Only
```
invoke financial_verifier → "Verify formulas in backend/app/routes/mutual_funds.py"
```

### Option D: Planning Only
```
invoke architect → "Design the Portfolio Health Doctor module spec"
```

---

## Agent Responsibilities Matrix

| Task | Architect | Backend | Frontend | Verifier | QA | Scribe |
|------|-----------|---------|----------|----------|----|--------|
| Module design | PRIMARY | — | — | — | — | — |
| Write Python code | — | PRIMARY | — | — | — | — |
| Write React code | — | — | PRIMARY | — | — | — |
| Verify formulas | Designs | — | — | PRIMARY | — | — |
| Run tests | — | — | — | — | PRIMARY | — |
| Update SESSION_LOG | — | — | — | — | — | PRIMARY |
| Update HANDOFF | Writes | — | — | — | — | Marks done |
| Review built code | Reviews | — | — | Formulas | — | — |
| npm build check | — | — | After write | — | Full | — |

---

## Quality Gates

Every module must pass ALL of these before moving to next:

| Gate | Owner | Check |
|------|-------|-------|
| Spec completeness | Architect | Zero ambiguous instructions |
| Backend import test | Backend Dev | `python3 -c "import app.main"` passes |
| Frontend build test | Frontend Dev | `npm run build` passes |
| Formula verification | Financial Verifier | All formulas VERIFIED |
| API endpoint test | QA Engineer | All curls return expected HTTP codes |
| Docs updated | Scribe | SESSION_LOG + HANDOFF + PROJECT_BRIEF updated |

---

## Current Team Trigger Phrase

To start the full cycle with any model, say:

> **"Invoke the full agent team for [module name]"**

Or individually:
> **"Invoke architect to design [module]"**
> **"Invoke backend_dev and frontend_dev in parallel to execute HANDOFF.md"**
> **"Invoke financial_verifier on [file]"**
> **"Invoke qa_engineer"**
> **"Invoke scribe to close this session"**

---

_Team version: 1.0 | Defined: 2026-07-25_
