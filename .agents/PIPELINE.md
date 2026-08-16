# Clearward Dynamic Agent Pipeline

## Goal

Complete work with minimal context and token use while preserving quality. Agents are selected per task; the full team is never deployed by default.

## Pipeline

```text
User request
 -> Classify scope and risk
 -> Build task packet
 -> Select model and agents
 -> Implement in isolated file ownership
 -> Run targeted checks
 -> Escalate only on failure or high-risk review
 -> Final diff and verification review
```

## Task classes

| Class | Typical work | Agents | Starting model | Verification |
|---|---|---:|---|---|
| `docs` | README, comments, handoff notes | 1 | Luna | Markdown/readability check |
| `ui-small` | CSS, copy, one visual component | 1 | Luna or Terra | Frontend build |
| `ui-feature` | New React view or interaction | 1–2 | Terra | Build + focused UI review |
| `api` | FastAPI route, schema, cache behavior | 2 | Terra | Contract/unit tests |
| `data-ml` | Indicators, forecasts, model validation | 2–3 | Terra | Deterministic tests + leakage review |
| `cross-cutting` | Frontend + backend feature | 3 | Sol planner, Terra implementers | Integration tests + final review |
| `release` | Packaging, security, regression review | 2–4 | Sol reviewer | Full verification |

## Agent roles

- **Classifier:** decides task class, risk, files, and acceptance criteria. It should not edit code.
- **Architect:** used only for ambiguous, cross-cutting, or high-risk work; produces a short contract.
- **Frontend:** owns React, CSS, visual states, and browser-facing behavior.
- **Backend:** owns FastAPI, SQLAlchemy, cache, ingestion, and API contracts.
- **Data/ML:** owns indicators, forecasts, features, backtesting, and leakage controls.
- **QA:** runs targeted checks and reports failures with exact commands and evidence.
- **Reviewer:** checks the final diff, compliance language, contracts, and regressions.

## Routing rules

1. Use one agent for a small isolated change.
2. Use frontend + QA for a frontend feature.
3. Use backend + QA for an API feature.
4. Use data/ML + QA for numerical or model changes.
5. Use Sol planner + parallel specialists only when more than one subsystem changes or the task is ambiguous.
6. Never assign two agents write access to the same file at the same time.
7. Do not spawn a specialist whose files and acceptance criteria are not in the task packet.

## Model escalation

```text
Luna -> Terra -> Sol
```

- **Luna:** straightforward edits, docs, formatting, and routine checks.
- **Terra:** normal implementation and debugging.
- **Sol:** architecture, difficult diagnosis, compliance-sensitive review, or repeated failure.

Escalation requires evidence: failing test, unresolved ambiguity, cross-module contract conflict, or high-risk change. Do not escalate because a task is merely large; split it first.

## Token controls

- Send a task packet, not the entire repository.
- Read the assigned files first; inspect dependencies only when needed.
- Reuse the classifier’s file map and acceptance criteria across agents.
- Require summaries under 300 words.
- Prefer diffs, test output, and line references over pasted source files.
- Stop after acceptance criteria pass.
- Cache stable project rules in `AGENTS.md`; do not repeat them in every prompt.

## Clearward verification gates

Every feature involving finance must pass the applicable gates:

- no advisory or guaranteed-return language;
- disclaimer remains visible;
- calculations remain deterministic and testable;
- API response shape matches the frontend consumer;
- stale or unavailable data is visible;
- relevant tests pass;
- frontend build passes for UI changes.
