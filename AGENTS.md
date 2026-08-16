# Clearward Agent Operating Rules

These rules apply to all agent-assisted work in this project.

## Default execution policy

1. Classify the task before reading the repository deeply.
2. Build a small task packet containing only the relevant files, constraints, and acceptance tests.
3. Deploy the smallest agent set that can complete the task safely.
4. Start with the cheapest capable model and escalate only after a concrete failure or a high-risk review requirement.
5. Agents must edit only their assigned files and must return a short change summary.
6. Run targeted verification before broad verification.
7. Do not replace deterministic financial calculations with an LLM.

## Project safety rules

- Preserve the disclaimer: `For education only. Not investment advice.`
- Never add buy, sell, target-price, or guaranteed-return language.
- Keep financial calculations in Python and test them with deterministic fixtures.
- Show stale, missing, or cached market data explicitly.
- Use existing design tokens before introducing new colors or typography.
- Keep frontend and backend contracts synchronized.

## Completion standard

A task is complete only when its acceptance criteria are met, relevant tests pass, and the final reviewer reports no unresolved regression.

See `.agents/PIPELINE.md` for routing and `.agents/task-packet.template.json` for the handoff format.
