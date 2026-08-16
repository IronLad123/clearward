import os
import sys
import subprocess
import time
import webbrowser

def main():
 print("=" * 65)
 print(" AI STOCK ANALYST — UNIVERSAL LAUNCHER")
 print("=" * 65)

 # Resolve root project directory regardless of current working directory
 script_dir = os.path.dirname(os.path.abspath(__file__))
 if os.path.basename(script_dir) == "frontend" or os.path.basename(script_dir) == "backend":
 base_dir = os.path.dirname(script_dir)
 else:
 base_dir = script_dir

 backend_dir = os.path.join(base_dir, "backend")
 frontend_dir = os.path.join(base_dir, "frontend")

 # 1. Start FastAPI Backend
 print("\n1. Starting FastAPI Backend Server on http://localhost:8000...")
 backend_cmd = [sys.executable, "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8000"]
 backend_proc = subprocess.Popen(backend_cmd, cwd=backend_dir)

 time.sleep(2)

 # 2. Start React PWA Frontend
 print("2. Starting React PWA Frontend Server on http://localhost:3000...")
 frontend_cmd = ["npm", "run", "dev"]
 frontend_proc = subprocess.Popen(frontend_cmd, cwd=frontend_dir)

 time.sleep(2)
 print("\n" + "=" * 65)
 print(" ALL SYSTEMS ONLINE!")
 print(" - Web Dashboard: http://localhost:3000")
 print(" - API Documentation: http://localhost:8000/docs")
 print("=" * 65)
 print("Press Ctrl+C to stop both servers...\n")

 try:
 webbrowser.open("http://localhost:3000")
 backend_proc.wait()
 frontend_proc.wait()
 except KeyboardInterrupt:
 print("\nStopping servers...")
 backend_proc.terminate()
 frontend_proc.terminate()
 print(" Shutdown complete.")

if __name__ == "__main__":
 main()
