"""
cache_manager.py - SQLite-based TTL cache for all external API responses.

Design principles:
    - Every external API call (yfinance, mfapi.in) is cached with a TTL
    - Cache is stored in a dedicated SQLite file separate from the main database
    - Cache keys are deterministic: sha256(category:identifier:sorted_params)
    - Expired entries are cleaned up lazily (on read) - no background thread needed
    - Thread-safe: uses SQLite WAL mode + per-call connections
    - Fail-open: if cache read/write fails for any reason, the real API call
      proceeds normally - the cache NEVER blocks application functionality

    TTL Policy:
        stock_ohlcv -> 6 hours (market hours only; stale after close at 3:30 PM IST)
        stock_signals -> 6 hours
        mutual_fund_nav -> 23 hours (AMFI publishes NAV once daily ~11 PM IST)
        mutual_fund_info -> 23 hours
        market_summary -> 15 minutes
        news -> 12 hours
        explanation -> 12 hours
        sebi_content -> 7 days (static regulatory content rarely changes)
        default -> 6 hours
"""

import sqlite3
import json
import hashlib
import logging
import time
from pathlib import Path
from typing import Any, Optional
from contextlib import contextmanager
import threading
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

_key_locks: dict = {}
_lock_registry_mutex = threading.Lock()

def _get_key_lock(key: str) -> threading.Lock:
    with _lock_registry_mutex:
        if key not in _key_locks:
            _key_locks[key] = threading.Lock()
        return _key_locks[key]

# --- Cache Configuration ------------------------------------------------------

# SQLite cache database - stored in backend/data/ alongside main app database
CACHE_DB_PATH = Path(__file__).parent.parent.parent / "data" / "api_cache.db"

# TTL values in seconds for each cache category
CACHE_TTL: dict[str, int] = {
    "stock_ohlcv": 6 * 3600, # 6 hours
    "stock_signals": 6 * 3600, # 6 hours
    "mutual_fund_nav": 23 * 3600, # 23 hours
    "mutual_fund_info": 23 * 3600, # 23 hours
    "market_summary": 15 * 60, # 15 minutes
    "news": 12 * 3600, # 12 hours
    "explanation": 12 * 3600, # 12 hours
    "sebi_content": 7 * 86400, # 7 days
    "default": 6 * 3600, # 6 hours fallback
}

# Stock-related categories subject to Recently Used / Peeked LRU Eviction
STOCK_CACHE_CATEGORIES = {
    "stock_ohlcv",
    "stock_signals",
    "stock_explanation",
    "news",
    "hype_score",
    "ts_forecast",
}

# Default capacity limit for recently peeked/used stocks in cache
DEFAULT_MAX_RECENTLY_PEEKED_STOCKS: int = 30


# --- Database Initialisation --------------------------------------------------

def _init_cache_db(conn: sqlite3.Connection) -> None:
    """
    Create the cache table and index if they do not already exist.
    Called once per connection.
    """
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=NORMAL")
    conn.execute("""
    CREATE TABLE IF NOT EXISTS api_cache (
        cache_key TEXT PRIMARY KEY,
        category TEXT NOT NULL,
        identifier TEXT,
        payload TEXT NOT NULL,
        created_at REAL NOT NULL,
        expires_at REAL NOT NULL,
        hit_count INTEGER DEFAULT 0,
        last_hit_at REAL
    )
    """)
    # Migration check: add identifier column if table was created in earlier schema
    try:
        conn.execute("ALTER TABLE api_cache ADD COLUMN identifier TEXT")
    except Exception:
        pass # Column already exists
    
    conn.execute("""
    CREATE INDEX IF NOT EXISTS idx_cache_expires
    ON api_cache(expires_at)
    """)
    conn.commit()


@contextmanager
def _cache_db():
    """
    Context manager that opens, initialises, and cleanly closes
    the SQLite cache database connection.
    """
    CACHE_DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(CACHE_DB_PATH), check_same_thread=False)
    try:
        _init_cache_db(conn)
        yield conn
    finally:
        conn.close()


# --- Key Generation -----------------------------------------------------------

def _make_cache_key(
    category: str,
    identifier: str,
    params: Optional[dict] = None
) -> str:
    """
    Generate a deterministic cache key from category, identifier, and params.

    Args:
        category: Cache category (e.g., "stock_ohlcv", "mutual_fund_nav")
        identifier: Primary lookup key (e.g., "RELIANCE.NS", "122639")
        params: Optional additional parameters (e.g., {"period": "1y"})

    Returns:
        A 64-character hex SHA-256 hash uniquely identifying this request.
    """
    params_str = json.dumps(params, sort_keys=True) if params else ""
    raw = f"{category}:{identifier}:{params_str}"
    return hashlib.sha256(raw.encode()).hexdigest()


# --- Core Cache Operations ----------------------------------------------------

def get_cached(
    category: str,
    identifier: str,
    params: Optional[dict] = None
) -> Optional[Any]:
    """
    Retrieve a cached value if it exists and has not expired.

    Args:
        category: Cache category string (must match a key in CACHE_TTL)
        identifier: Primary lookup key
        params: Optional additional parameters used in the cache key

    Returns:
        The cached Python object (deserialised from JSON), or None on miss/expiry.
    """
    try:
        key = _make_cache_key(category, identifier, params)
        now = time.time()

        with _cache_db() as conn:
            row = conn.execute(
                "SELECT payload, expires_at FROM api_cache WHERE cache_key = ?",
                (key,)
            ).fetchone()

            if row is None:
                logger.debug("Cache MISS: %s:%s", category, identifier)
                return None

            payload_str, expires_at = row

            if now > expires_at:
                # Lazy expiry deletion - clean up while we're here
                conn.execute(
                    "DELETE FROM api_cache WHERE cache_key = ?", (key,)
                )
                conn.commit()
                logger.debug("Cache EXPIRED: %s:%s", category, identifier)
                return None

            # Valid cache hit - update access statistics
            conn.execute(
                """UPDATE api_cache
                SET hit_count = hit_count + 1, last_hit_at = ?
                WHERE cache_key = ?""",
                (now, key)
            )
            conn.commit()

            logger.debug("Cache HIT: %s:%s", category, identifier)
            return json.loads(payload_str)

    except Exception as exc:
        # Fail-open: never let a cache failure block an API call
        logger.warning("Cache read failed for %s:%s - %s", category, identifier, exc)
        return None

def get_or_compute(category, identifier, compute_fn, params=None, ttl_override_seconds=None):
    cached = get_cached(category, identifier, params)
    if cached is not None:
        return cached

    key = _make_cache_key(category, identifier, params)
    lock = _get_key_lock(key)
    with lock:
        cached = get_cached(category, identifier, params)
        if cached is not None:
            return cached

        result = compute_fn()
        set_cached(category, identifier, result, params, ttl_override_seconds)
        return result


def set_cached(
    category: str,
    identifier: str,
    data: Any,
    params: Optional[dict] = None,
    ttl_override_seconds: Optional[int] = None
) -> bool:
    """
    Store a value in the cache with the TTL for its category.

    Args:
        category: Category string determining default TTL
        identifier: Primary lookup key
        data: Python object to cache (must be JSON-serialisable)
        params: Optional additional parameters for the cache key
        ttl_override_seconds: Override the category default TTL for this entry

    Returns:
        True if successfully stored, False otherwise.
    """
    try:
        key = _make_cache_key(category, identifier, params)
        ttl = ttl_override_seconds or CACHE_TTL.get(category, CACHE_TTL["default"])
        now = time.time()
        expires_at = now + ttl

        # json.dumps with default=str safely handles datetime, Decimal, etc.
        payload_str = json.dumps(data, default=str)

        with _cache_db() as conn:
            conn.execute(
                """INSERT OR REPLACE INTO api_cache
                (cache_key, category, identifier, payload, created_at, expires_at, hit_count, last_hit_at)
                VALUES (?, ?, ?, ?, ?, ?, 0, ?)""",
                (key, category, identifier, payload_str, now, expires_at, now)
            )
            conn.commit()

        # If writing a stock category entry, enforce LRU eviction so only recently used/peeked stocks stay cached
        if category in STOCK_CACHE_CATEGORIES:
            evict_least_recently_used_stocks()

        logger.debug("Cache SET: %s:%s (TTL: %ds)", category, identifier, ttl)
        return True

    except Exception as exc:
        # Fail-open: never let a cache failure prevent returning data
        logger.warning("Cache write failed for %s:%s - %s", category, identifier, exc)
        return False


def invalidate_cached(
    category: str,
    identifier: str,
    params: Optional[dict] = None
) -> bool:
    """
    Explicitly delete a specific cache entry.

    Useful when data is known to have changed (e.g., after model retrain,
    or forced refresh requested by user).
    """
    try:
        key = _make_cache_key(category, identifier, params)
        with _cache_db() as conn:
            conn.execute("DELETE FROM api_cache WHERE cache_key = ?", (key,))
            conn.commit()
            logger.info("Cache INVALIDATED: %s:%s", category, identifier)
            return True
    except Exception as exc:
        logger.warning("Cache invalidation failed for %s:%s - %s", category, identifier, exc)
        return False


def invalidate_category(category: str) -> int:
    """
    Delete ALL cache entries for a given category.

    Use this to force fresh data for an entire data type -
    e.g., call invalidate_category("stock_ohlcv") after market close
    to ensure tomorrow's first request fetches fresh prices.

    Returns:
        Number of entries deleted.
    """
    try:
        with _cache_db() as conn:
            cursor = conn.execute(
                "DELETE FROM api_cache WHERE category = ?", (category,)
            )
            conn.commit()
            count = cursor.rowcount
            logger.info("Cache CATEGORY CLEARED: %s (%d entries removed)", category, count)
            return count
    except Exception as exc:
        logger.warning("Category invalidation failed for %s - %s", category, exc)
        return 0


def purge_expired() -> int:
    """
    Remove all expired cache entries proactively.

    Call this from the startup event or a periodic task to keep
    the cache database lean. Lazy expiry handles individual misses;
    this handles bulk cleanup.

    Returns:
        Number of expired entries removed.
    """
    try:
        now = time.time()
        with _cache_db() as conn:
            cursor = conn.execute(
                "DELETE FROM api_cache WHERE expires_at < ?", (now,)
            )
            conn.commit()
            count = cursor.rowcount
            if count > 0:
                logger.info("Cache PURGE: %d expired entries removed", count)
                
                # Enforce LRU eviction for recently peeked stocks during maintenance
                evict_least_recently_used_stocks()
            return count
    except Exception as exc:
        logger.warning("Cache purge failed - %s", exc)
        return 0


def get_cache_stats() -> dict:
    """
    Return cache health statistics, used by the /api/health endpoint.

    Returns:
        Dict with total_entries, total_hits, expired_count,
        cache_db_size_kb, and per-category breakdown.
    """
    try:
        now = time.time()
        with _cache_db() as conn:
            totals = conn.execute("""
                SELECT
                COUNT(*) AS total_entries,
                COALESCE(SUM(hit_count), 0) AS total_hits,
                MIN(created_at) AS oldest_entry_ts,
                COUNT(CASE WHEN expires_at < ? THEN 1 END) AS expired_count
                FROM api_cache
            """, (now,)).fetchone()

            by_category = conn.execute("""
                SELECT category,
                COUNT(*) AS entry_count,
                COALESCE(SUM(hit_count), 0) AS total_hits
                FROM api_cache
                GROUP BY category
                ORDER BY total_hits DESC
            """).fetchall()

            db_size_bytes = CACHE_DB_PATH.stat().st_size if CACHE_DB_PATH.exists() else 0
            oldest_hours = round(((now - totals[2]) / 3600), 1) if totals[2] else 0

            recently_peeked = get_recently_peeked_stocks(limit=50)

            return {
                "total_entries": totals[0] or 0,
                "total_hits": totals[1] or 0,
                "expired_entries": totals[3] or 0,
                "oldest_entry_hours_ago": oldest_hours,
                "recently_peeked_stocks_count": len(recently_peeked),
                "max_recently_peeked_capacity": DEFAULT_MAX_RECENTLY_PEEKED_STOCKS,
                "cache_db_size_kb": round(db_size_bytes / 1024, 1),
                "categories": [
                    {"category": row[0], "entries": row[1], "hits": row[2]}
                    for row in by_category
                ],
            }
    except Exception as exc:
        logger.warning("Cache stats failed - %s", exc)
        return {"error": str(exc)}


# --- LRU RECENTLY USED / PEEKED EVICTION ENGINE -------------------------------

def evict_least_recently_used_stocks(max_peeked: Optional[int] = None) -> int:
    """
    LRU Eviction Policy for Stock Cache:
        Ensures the cache ONLY stores recently used or peeked stocks.
        When the number of cached stock entries exceeds max_peeked (default 30),
        evicts cache entries for the least recently accessed stock symbols.
    """
    if max_peeked is None:
        max_peeked = DEFAULT_MAX_RECENTLY_PEEKED_STOCKS

    try:
        categories_clause = ",".join(f"'{cat}'" for cat in STOCK_CACHE_CATEGORIES)
        with _cache_db() as conn:
            # Find all stock cache keys ordered by most recent hit/access timestamp
            query = f"""
                SELECT cache_key
                FROM api_cache
                WHERE category IN ({categories_clause})
                ORDER BY COALESCE(last_hit_at, created_at) DESC
            """
            rows = conn.execute(query).fetchall()

            # If total stock entries exceed max_peeked capacity, delete excess LRU entries
            if len(rows) > max_peeked:
                keys_to_delete = [r[0] for r in rows[max_peeked:]]
                placeholders = ",".join("?" for _ in keys_to_delete)
                delete_query = f"DELETE FROM api_cache WHERE cache_key IN ({placeholders})"
                cursor = conn.execute(delete_query, keys_to_delete)
                conn.commit()
                evicted_count = cursor.rowcount
                if evicted_count > 0:
                    logger.info("LRU Eviction: Pruned %d old stock cache entries beyond top %d peeked stocks.", evicted_count, max_peeked)
                    return evicted_count
            return 0
    except Exception as exc:
        logger.warning("LRU stock eviction failed - %s", exc)
        return 0


def get_recently_peeked_stocks(limit: int = 30) -> list[dict[str, Any]]:
    """
    Return a list of recently used or peeked stock entries from the cache
    ordered by last hit/access timestamp.
    """
    try:
        categories_clause = ",".join(f"'{cat}'" for cat in STOCK_CACHE_CATEGORIES)
        query = f"""
            SELECT cache_key, category, identifier, hit_count, created_at, COALESCE(last_hit_at, created_at) AS last_accessed
            FROM api_cache
            WHERE category IN ({categories_clause})
            ORDER BY last_accessed DESC
            LIMIT ?
        """
        with _cache_db() as conn:
            rows = conn.execute(query, (limit,)).fetchall()
            return [
                {
                    "symbol": r[2] or "UNKNOWN",
                    "category": r[1],
                    "cache_key": r[0][:12] + "...",
                    "hit_count": r[3],
                    "created_at": datetime.fromtimestamp(r[4], tz=timezone.utc).isoformat(),
                    "last_accessed_at": datetime.fromtimestamp(r[5], tz=timezone.utc).isoformat(),
                }
                for r in rows
            ]
    except Exception as exc:
        logger.warning("Failed to retrieve recently peeked stocks: %s", exc)
        return []
