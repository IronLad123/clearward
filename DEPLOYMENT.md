# AI Stock Analyst — Deployment & Operations Guide

This guide describes how to configure, deploy, run, and verify the **AI Stock Analyst** application on a local development environment or production server.

---

## System Prerequisites

Ensure the following environments are installed on the host system:
1. **Python**: Version `3.11` or higher.
2. **Node.js**: Version `18.0` or higher (includes `npm`).
3. **SQLite**: Native system package (used in WAL mode for concurrent operations).
4. **Git**: For pulling repository files.

---

## Environment Setup & Configuration

Copy the example environment file to initialize environment variables:

```bash
cp .env.example .env
```

### Configuration Options (`.env`):
* `DATABASE_URL`: SQLAlchemy connection string. Defaults to SQLite: `sqlite:///./backend/data/stocks.db`
* `CHROMA_DB_PATH`: Folder path for the news RSS vector embedding store. Defaults to: `./backend/data/chroma`
* `RETRAIN_HISTORY_LIMIT`: Number of historical model evaluations to display in the Changelog audits. Defaults to: `50`
* `MODEL_SELECTION`: Primary model type used for prediction (e.g. `RandomForest` or `LSTM`). Defaults to: `RandomForest`

---

## One-Click Orchestration Launcher

You can launch both the backend FastAPI service and the frontend Vite React server simultaneously using the integrated startup script:

```bash
python3 start.py
```

This script:
1. Validates node modules and installs missing frontend dependencies.
2. Resolves python dependencies in the environment.
3. Automatically provisions the SQLite databases and triggers default stock catalog seeding.
4. Spawns the uvicorn API worker (port `8000`) and the Vite development server (port `3000`).

---

## Backend API Manual Deployment

If you prefer to orchestrate the backend services manually, execute the following commands:

### 1. Create and Activate Virtual Environment
```bash
python3 -m venv venv
source venv/bin/activate
```

### 2. Install Requirements
```bash
pip install -r backend/requirements.txt
```

### 3. Database Initialization & Seeding
Start the database generation manually:
```bash
python3 -c "from app.database.db import init_db; init_db()"
```
This enables SQLite **Write-Ahead Logging (WAL)** mode for parallel writes and pre-pings database connections.

### 4. Run the API Server
```bash
cd backend
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
* Interactive OpenAPI specifications are served at [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs).

---

## Frontend Manual Deployment

Deploy the frontend dashboard separately for production distribution or dev environments:

### 1. Navigate & Install Modules
```bash
cd frontend
npm install
```

### 2. Run Local Development Server
```bash
npm run dev
```
* Vite will spin up the PWA dev app on [http://localhost:3000](http://localhost:3000).

### 3. Build Production Bundle
To compile the static React assets into the optimized production bundle, run:
```bash
npm run build
```
The compiled output is output to `frontend/dist/` and can be served via Nginx or Apache.

---

## Testing and Verification

Verify the system integrity by executing the automated test suite:

```bash
python3 -m unittest discover -s backend/tests -p "test_*.py"
```

This runs:
* **Contract Tests**: Validates FastAPI routes against JSON spec contracts.
* **Pipeline Tests**: Verifies data ingestion and extraction.
* **ML Leakage Tests**: Deliberately constructs a leaky dataset to assert thatexpanding-window walk-forward boundaries are locked down.
* **Retraining Gatekeeper stability**: Validates Champion vs Challenger promotion bounds.
