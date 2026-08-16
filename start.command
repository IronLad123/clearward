#!/usr/bin/env bash
# Double-clickable macOS launcher for Clearward Financial Analytics Platform

DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"

echo "======================================================================"
echo " ⚡ LAUNCHING CLEARWARD FINANCIAL ANALYTICS PLATFORM"
echo "======================================================================"
echo ""

# Ensure run.sh is executable
chmod +x ./run.sh

# Open browser after 3 seconds in background
(sleep 3 && open "http://localhost:3000") &

# Execute main launcher
./run.sh
