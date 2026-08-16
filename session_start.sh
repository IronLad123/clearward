#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# session_start.sh — ArthaRaksha Session Launcher
#
# Run this at the START of every work session.
# Usage:
# chmod +x session_start.sh (first time only)
# ./session_start.sh
#
# What it does:
# 1. Starts backend (FastAPI) and frontend (Vite) if not already running
# 2. Prints last session summary from SESSION_LOG.md
# 3. Prints next priorities so you know exactly where to continue
# 4. Shows URLs and health check
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

PROJECT_DIR="/Users/omsrivastava/Desktop/Financial_Analytics_Project"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"
LOGS_DIR="$PROJECT_DIR/logs"
mkdir -p "$LOGS_DIR"

# ── Header ────────────────────────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║ ArthaRaksha (अर्थरक्षा) — Session Start ║"
echo "║ Financial Self-Defense Platform for Indian Investors ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# ── Check / Start Backend ─────────────────────────────────────────────────────
BACKEND_PID=$(lsof -ti:8000 2>/dev/null | head -1 || true)

if [ -n "$BACKEND_PID" ]; then
 echo " Backend already running on :8000 (PID: $BACKEND_PID)"
else
 echo " Starting backend (FastAPI on port 8000)..."
 cd "$BACKEND_DIR"
 # Activate virtualenv if it exists
 if [ -f "venv/bin/activate" ]; then
 source venv/bin/activate
 fi
 nohup python3 -m uvicorn app.main:app --reload --port 8000 \
 > "$LOGS_DIR/backend.log" 2>&1 &
 echo " → Started. Log: $LOGS_DIR/backend.log"
 echo " → Waiting 3s for startup..."
 sleep 3
fi

# ── Check / Start Frontend ────────────────────────────────────────────────────
FRONTEND_PID=$(lsof -ti:3000 2>/dev/null | head -1 || true)

if [ -n "$FRONTEND_PID" ]; then
 echo " Frontend already running on :3000 (PID: $FRONTEND_PID)"
else
 echo " Starting frontend (Vite on port 3000)..."
 cd "$FRONTEND_DIR"
 nohup npm run dev > "$LOGS_DIR/frontend.log" 2>&1 &
 echo " → Started. Log: $LOGS_DIR/frontend.log"
fi

echo ""

# ── Health Check ──────────────────────────────────────────────────────────────
echo " URLs"
echo " Backend API: http://localhost:8000"
echo " API Docs: http://localhost:8000/docs"
echo " Frontend App: http://localhost:3000"
echo ""

# Quick backend health check
HEALTH=$(curl -s --max-time 3 http://localhost:8000/api/health 2>/dev/null || echo "unreachable")
if echo "$HEALTH" | grep -q "status"; then
 echo " Backend health check: OK"
else
 echo " Backend health check: Not yet ready (may still be starting)"
fi
echo ""

# ── Last Session Summary ──────────────────────────────────────────────────────
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " LAST SESSION"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
# Extract the most recent session block from SESSION_LOG.md
awk '/^## Session:/{count++; if(count==2) exit} count==1{print}' \
 "$PROJECT_DIR/SESSION_LOG.md" | head -25
echo ""

# ── Next Session Priorities ───────────────────────────────────────────────────
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " NEXT PRIORITIES"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
grep -A 8 "### Next Session Priorities" "$PROJECT_DIR/SESSION_LOG.md" \
 | grep -v "^### " | head -8
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " HANDOFF STATUS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
HANDOFF_STATUS=$(grep -m1 "^\*\*Status:\*\*" "$PROJECT_DIR/HANDOFF.md" 2>/dev/null | sed 's/\*\*Status:\*\* //' || echo "Not found")
HANDOFF_MODEL=$(grep -m1 "^\*\*Designed by:\*\*" "$PROJECT_DIR/HANDOFF.md" 2>/dev/null | sed 's/\*\*Designed by:\*\* //' || echo "")

echo " Status: $HANDOFF_STATUS"
echo " Designed by: $HANDOFF_MODEL"
echo ""

# Show pending tasks from HANDOFF
echo " Pending tasks:"
grep "^### Task" "$PROJECT_DIR/HANDOFF.md" 2>/dev/null | while read -r line; do
 echo " → $line"
done

echo ""
echo " On Gemini Flash: say 'Read PROJECT_BRIEF.md and HANDOFF.md. Execute the tasks.'"
echo " On Claude: say 'Read PROJECT_BRIEF.md and HANDOFF.md. Design next module.'"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " AGENT TEAM"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " architect → Design module spec (Claude)"
echo " backend_dev → Build FastAPI code (Gemini Flash)"
echo " frontend_dev → Build React UI (Gemini Flash)"
echo " financial_verifier → Audit formulas (Claude)"
echo " qa_engineer → Run all tests (Gemini Flash)"
echo " scribe → Update all docs (Gemini Flash)"
echo ""
echo " Full cycle: architect → backend_dev + frontend_dev → financial_verifier → qa_engineer → scribe"
echo " Full cycle trigger: 'Invoke the full agent team for [module name]'"

echo ""

# ── Key Files ─────────────────────────────────────────────────────────────────
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " KEY FILES"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " Brief: $PROJECT_DIR/PROJECT_BRIEF.md"
echo " Log: $PROJECT_DIR/SESSION_LOG.md"
echo " Decisions:$PROJECT_DIR/DECISIONS.md"
echo " Handoff: $PROJECT_DIR/HANDOFF.md"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " Ready. Model protocol active. Pipeline operational."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
