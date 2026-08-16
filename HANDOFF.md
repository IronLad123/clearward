# Clearward Financial Analytics Platform - Architectural Handoff

This document contains the definitive architectural decisions for resolving the current project blockers. The execution engineer is expected to implement these exact approaches to maintain strict adherence to SEBI compliance, performance constraints, and our technology stack (FastAPI + SQLite + React 18 + Vite).

## Priority Execution Order
1. **Regulatory & Security** (SEC-1, FE-5) - Critical for compliance and data safety.
2. **ML Validity & Leakage** (ML-2, ML-3) - Must fix before any new models are trained or evaluated.
3. **Stability & OOM Prevention** (DATA-1, DATA-3, FE-3, FE-4) - Ensures the application doesn't crash under load.
4. **Architecture & Performance** (FE-1, FE-2, ML-1, ML-4) - Reduces N+1 issues and technical debt.
5. **Build & Infrastructure** (BUILD-1, DEP-1, DATA-2, RAG-1) - Standardizes deployments and deterministic states.

Estimated Total Effort: ~25-30 hours.

---

## 1. Security & Build Blockers

### SEC-1: CORS 'null' origin with allow_credentials=True
* **Decision:** **Approach B** (Environment-configured whitelist with runtime sanitizer).
* **Target File:** `backend/app/main.py` (or where CORS is configured)
* **Rationale:** Hardcoding 'null' is a severe security vulnerability. Dynamically sanitizing inputs from environment variables provides robust security across environments (Dev/Staging/Prod) while explicitly blocking dangerous wildcard configurations.
* **Implementation:**
```python
import os
from typing import List

DEFAULT_ALLOWED_ORIGINS = ["http://localhost:3000"]

def get_allowed_origins() -> List[str]:
 raw = os.getenv('ALLOWED_ORIGINS')
 origins = [o.strip() for o in raw.split(',')] if raw else DEFAULT_ALLOWED_ORIGINS
 return [o for o in origins if o.lower() not in ('null', '*')]

# Pass get_allowed_origins() to CORSMiddleware
```

### BUILD-1: Desktop build excludes tensorflow but LSTM needs it
* **Decision:** **Approach C** (Lazy import guard with fallback).
* **Target File:** `backend/app/models/factory.py` (or where models are instantiated)
* **Rationale:** Electron builds must remain under 200MB, so bundling TensorFlow is impossible. A lazy import guard provides seamless graceful degradation to the MLPClassifier without needing to maintain fragile environment flags that easily get out of sync.
* **Implementation:**
```python
def get_sequence_model():
 try:
 import tensorflow
 from app.models.lstm import LSTMPredictor
 return LSTMPredictor()
 except ImportError:
 # Fallback for lightweight desktop builds
 from app.models.mlp import MLPDirectionClassifier
 return MLPDirectionClassifier()
```

### DEP-1: requirements.txt uses >= (non-deterministic builds)
* **Decision:** **Approach C** (Migrate to `uv` + `pyproject.toml`).
* **Target File:** Repository root (`requirements.txt` -> `pyproject.toml`)
* **Rationale:** Relying on `>=` causes "works on my machine" bugs. Migrating to `uv` and `pyproject.toml` is the modern Python standard, ensuring deterministic lockfiles, lightning-fast dependency resolution, and strict environment reproducibility.

---

## 2. ML Pipeline Blockers

### ML-1: 'LSTM' is MLPClassifier (misnamed)
* **Decision:** **Approach B** (Rename to MLPDirectionClassifier, remove fake params).
* **Target File:** `backend/app/models/mlp.py` (rename from `lstm.py`)
* **Rationale:** We already have TensorFlow as a dependency, but adding PyTorch just for a true LSTM adds unnecessary bloat. Renaming the existing model and removing the fake `sequence_length` parameter eliminates architectural confusion with zero added dependencies.

### ML-2: Walk-forward validation has 3-day target leakage
* **Decision:** **Approach A** (Purge training boundary with embargo_horizon).
* **Target File:** `backend/app/ml/validation.py` (or equivalent splitter module)
* **Rationale:** Financial ML is highly sensitive to look-ahead bias and target leakage. Embargoing the training boundary is the industry standard for time-series splits, ensuring the model never inadvertently learns from the forward prediction horizon.
* **Implementation:**
```python
import numpy as np

class WalkForwardSplitter:
 def __init__(self, min_train_size=120, test_size=30, n_splits=5, embargo_horizon=3):
 self.embargo_horizon = embargo_horizon
 self.min_train_size = min_train_size
 self.test_size = test_size
 self.n_splits = n_splits

 def split(self, df):
 n_samples = len(df)
 stride = self.test_size
 for i in range(self.n_splits):
 test_start = self.min_train_size + (i * stride)
 test_end = min(test_start + self.test_size, n_samples)
 train_end = test_start - self.embargo_horizon # KEY CHANGE: Prevent 3-day leakage
 train_idx = np.arange(0, train_end)
 test_idx = np.arange(test_start, test_end)
 yield train_idx, test_idx
```

### ML-3: Backtester runs on in-sample data (Sharpe meaningless)
* **Decision:** **Approach A** (Out-of-fold walk-forward).
* **Target File:** `backend/app/ml/backtester.py`
* **Rationale:** In-sample backtesting in finance is dangerously deceptive. A proper out-of-fold (OOF) walk-forward cross-validation process accurately simulates live trading conditions and provides a trustworthy Sharpe ratio, despite the higher implementation time.

### ML-4: Champion promotion doesn't invalidate in-memory cache
* **Decision:** **Approach A** (Callback injection `on_promotion_callback` param).
* **Target File:** `backend/app/ml/evaluator.py` & `backend/app/main.py`
* **Rationale:** Since `clear_symbol_model_caches(symbol)` already exists in `main.py`, having the evaluator import it would cause circular dependency issues. Passing it via a callback injection keeps the ML evaluation module decoupled from FastAPI application state.

---

## 3. Frontend Blockers

### FE-5: 'UP/DOWN prediction' labels are SEBI non-compliant
* **Decision:** **Alt 1** (POSITIVE BIAS / NEGATIVE BIAS / CONSOLIDATION + disclaimer).
* **Target File:** `frontend/src/utils/sebiFormatter.js` (and UI components rendering predictions)
* **Rationale:** Explicit directional claims ("UP/DOWN") violate SEBI guidelines. Changing the nomenclature to "BIAS" and adding visual glyphs safely conveys the model's statistical leanings without guaranteeing returns or presenting as direct financial advice.
* **Implementation:**
```javascript
// src/utils/sebiFormatter.js
export const formatRegimeLabel = (prediction) => {
 switch (prediction?.toUpperCase()) {
 case 'UP': return { label: 'POSITIVE BIAS', glyph: '▲', color: 'var(--rally)' };
 case 'DOWN': return { label: 'NEGATIVE BIAS', glyph: '▼', color: 'var(--selloff)' };
 default: return { label: 'CONSOLIDATION', glyph: '—', color: 'var(--slate)' };
 }
};
```

### FE-1: Hardcoded 'localhost:8000' in multiple components
* **Decision:** **Approach B** (Centralized `src/lib/apiClient.js` + `VITE_API_URL`).
* **Target File:** `frontend/src/lib/apiClient.js`
* **Rationale:** Hardcoding hostnames prevents seamless deployment to staging/production. Centralizing API calls into a single client simplifies future additions like authentication interceptors and global error handling.

### FE-2: WatchlistView N+1 (20 stocks = 40 requests)
* **Decision:** **Approach A** (New bulk backend endpoint `/api/stocks/bulk-signals`).
* **Target Files:** `backend/app/api/routes/stocks.py` & `frontend/src/components/WatchlistView.jsx`
* **Rationale:** An N+1 problem on a dashboard rapidly degrades UX and overwhelms the FastAPI server. A dedicated bulk endpoint dramatically cuts network overhead and allows SQLite to satisfy the request in a single optimized query.

### FE-3: Race conditions in SearchHeader and TimeSeriesForecastCard
* **Decision:** **Single fix** (AbortController).
* **Target Files:** `frontend/src/components/SearchHeader.jsx` & `frontend/src/components/TimeSeriesForecastCard.jsx`
* **Rationale:** Standard practice for React network requests inside `useEffect`. Prevents stale state updates if a previous request resolves after a newer one.
* **Implementation:**
```javascript
useEffect(() => {
 const controller = new AbortController();
 const timer = setTimeout(async () => {
 try {
 const res = await fetch(`/api/stocks/search?q=${encodeURIComponent(searchQuery)}`, { signal: controller.signal });
 if (res.ok) setSuggestions(await res.json());
 } catch(e) {
 if (e.name !== 'AbortError') console.error(e);
 } finally {
 if (!controller.signal.aborted) setIsSearching(false);
 }
 }, 180);
 return () => { clearTimeout(timer); controller.abort(); };
}, [searchQuery]);
```

### FE-4: StockComparisonView silently generates fake hashCode() data on API error
* **Decision:** **Single fix** (Remove fallback, show retry banner).
* **Target File:** `frontend/src/components/StockComparisonView.jsx`
* **Rationale:** Silent failures and fake data in financial platforms break user trust. Explicitly throwing an error state (`hasError=true`) and allowing the user to retry is the correct UX.

---

## 4. Data & RAG Blockers

### DATA-1: vector_store.py articles_db is unbounded — OOM risk
* **Decision:** **Approach C** (Use ChromaDB as primary store, `deque(maxlen=500)` as fallback buffer).
* **Target File:** `backend/app/rag/vector_store.py`
* **Rationale:** Storing unbounded embeddings in memory is a guaranteed Out-Of-Memory (OOM) crash vector. Shifting the primary load to ChromaDB (which safely uses disk/SQLite) while maintaining a strict, limited `deque` buffer protects server memory limits.

### DATA-2: hash(title) is non-deterministic
* **Decision:** **Single fix** (`hashlib.md5`).
* **Target File:** `backend/app/rag/ingestion.py`
* **Rationale:** Python's built-in `hash()` is randomized per session for security, which causes duplicate ingestion of embeddings upon restart. MD5 provides stable, deterministic ID generation across instances.
* **Implementation:**
```python
import hashlib
document_id = hashlib.md5(title.encode()).hexdigest()
```

### DATA-3: cache_manager.py has no stampede protection
* **Decision:** **Approach A** (Per-key `threading.Lock` with double-checked read).
* **Target File:** `backend/app/cache/cache_manager.py`
* **Rationale:** Cache stampedes under high load will lock the single SQLite writer or overwhelm downstream systems. Given this is a single-node FastAPI deployment (no Redis), standard in-memory threading locks provide perfect stampede protection.

### RAG-1: _clean_prose() strips all citations the system prompt demanded
* **Decision:** **Approach B** (Convert citations to clickable markdown links).
* **Target File:** `backend/app/rag/formatter.py`
* **Rationale:** Stripping citations entirely removes trust from the LLM outputs. Converting them into clean, clickable markdown anchors provides the best user experience without cluttering the prose.
