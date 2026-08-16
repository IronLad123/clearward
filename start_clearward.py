#!/usr/bin/env python3
"""
start_clearward.py — Automated Python Launcher & Browser Auto-Opener

Launches FastAPI backend (port 8000) and Vite frontend (port 3000),
then automatically opens http://localhost:3000 in your web browser.
"""

import subprocess
import time
import sys
import webbrowser
import os
import signal

PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(PROJECT_ROOT, "backend")
FRONTEND_DIR = os.path.join(PROJECT_ROOT, "frontend")

processes = []

def cleanup(sig=None, frame=None):
    print("\n======================================================================")
    print(" 🛑 Shutting down Clearward servers...")
    print("======================================================================")
    for p in processes:
        try:
            p.terminate()
        except Exception:
            pass
    sys.exit(0)

signal.signal(signal.SIGINT, cleanup)
signal.signal(signal.SIGTERM, cleanup)

def main():
    print("======================================================================")
    print(" ⚡ CLEARWARD PLATFORM AUTOMATED LAUNCHER")
    print("======================================================================")
    print(f" Root Directory: {PROJECT_ROOT}\n")

    # 1. Launch Backend
    print(" 🟢 Starting Backend FastAPI (http://127.0.0.1:8000)...")
    backend_proc = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8000", "--reload"],
        cwd=BACKEND_DIR
    )
    processes.append(backend_proc)

    time.sleep(2)

    # 2. Launch Frontend
    print(" 🟢 Starting Frontend Vite (http://localhost:3000)...")
    frontend_proc = subprocess.Popen(
        ["npm", "run", "dev"],
        cwd=FRONTEND_DIR
    )
    processes.append(frontend_proc)

    time.sleep(2)

    # 3. Open Browser
    print("\n======================================================================")
    print(" 🚀 OPENING PLATFORM IN BROWSER: http://localhost:3000")
    print("======================================================================")
    print(" Press Ctrl+C to stop servers at any time.\n")
    webbrowser.open("http://localhost:3000")

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        cleanup()

if __name__ == "__main__":
    main()
