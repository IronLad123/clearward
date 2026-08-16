#!/usr/bin/env bash
# ==============================================================================
#  Clearward Financial Analytics & Self-Defense Platform — Quick Start Launcher
# ==============================================================================

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "======================================================================"
echo " ⚡ CLEARWARD FINANCIAL ANALYTICS PLATFORM LAUNCHER"
echo "======================================================================"
echo " Project Directory: ${PROJECT_DIR}"
echo ""

# Function to stop background processes on exit (Ctrl+C)
cleanup() {
    echo ""
    echo "======================================================================"
    echo " 🛑 Stopping Clearward Servers..."
    echo "======================================================================"
    kill $(jobs -p) 2>/dev/null
    exit 0
}

trap cleanup SIGINT SIGTERM EXIT

# 1. Start Backend FastAPI Server on Port 8000
echo " 🟢 Starting Backend FastAPI Server on http://127.0.0.1:8000 ..."
cd "${PROJECT_DIR}/backend"
python3 -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload &
BACKEND_PID=$!

# Wait 2 seconds for backend to initialize DB & routes
sleep 2

# 2. Start Frontend Vite Dev Server on Port 3000
echo " 🟢 Starting Frontend Vite Dev Server on http://localhost:3000 ..."
cd "${PROJECT_DIR}/frontend"
npm run dev &
FRONTEND_PID=$!

echo ""
echo "======================================================================"
echo " 🚀 CLEARWARD PLATFORM IS READY!"
echo "======================================================================"
echo " 📊 Open in Browser:  http://localhost:3000"
echo " ⚡ API Documentation: http://127.0.0.1:8000/docs"
echo "======================================================================"
echo " Press Ctrl+C at any time to shut down both servers cleanly."
echo ""

# Keep launcher process running to hold signal traps
wait
