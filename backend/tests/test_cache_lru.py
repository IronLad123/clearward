"""
test_cache_lru.py — Tests for LRU Recently Used / Peeked Stock Cache Eviction Policy
and get_or_compute double-checked lock pattern.
"""
import time
import concurrent.futures
from fastapi.testclient import TestClient
from app.main import app
from app.cache import (
    set_cached,
    get_cached,
    get_or_compute,
    evict_least_recently_used_stocks,
    get_recently_peeked_stocks,
    invalidate_category,
)

client = TestClient(app)


def test_lru_eviction_only_stores_recently_peeked_stocks():
    invalidate_category('stock_signals')
    # Store 35 stock items sequentially
    for i in range(1, 36):
        symbol = f'TEST_STOCK_{i:02d}.NS'
        set_cached('stock_signals', symbol, {'symbol': symbol, 'index': i})
        # Small delay ensures timestamps increment cleanly
        time.sleep(0.001)
        evict_least_recently_used_stocks(max_peeked=30)

    peeked = get_recently_peeked_stocks(limit=50)
    stock_signal_entries = [p for p in peeked if p['category'] == 'stock_signals']
    assert len(stock_signal_entries) <= 30

    # Oldest stock (TEST_STOCK_01.NS) MUST have been evicted
    oldest_cached = get_cached('stock_signals', 'TEST_STOCK_01.NS')
    assert oldest_cached is None, "Oldest stock entry TEST_STOCK_01.NS should have been evicted by LRU"

    # Most recent stock (TEST_STOCK_35.NS) MUST still be cached
    latest_cached = get_cached('stock_signals', 'TEST_STOCK_35.NS')
    assert latest_cached is not None
    assert latest_cached['symbol'] == 'TEST_STOCK_35.NS'

    invalidate_category('stock_signals')


def test_peeked_stocks_endpoint():
    set_cached('stock_ohlcv', 'PEEK_DEMO.NS', {'close': 100.0})
    res = client.get('/api/cache/peeked-stocks')
    assert res.status_code == 200
    data = res.json()
    assert 'count' in data
    assert 'recently_peeked_stocks' in data
    assert isinstance(data['recently_peeked_stocks'], list)
    invalidate_category('stock_ohlcv')


def test_get_or_compute_double_checked_lock():
    """
    Verify get_or_compute() executes compute_fn exactly once and
    concurrent threads accessing the same key reuse the cached result
    without redundant executions.
    """
    category = "test_lock_category"
    identifier = "LOCK_TEST_KEY"
    invalidate_category(category)

    invocation_count = 0

    def compute_heavy_data():
        nonlocal invocation_count
        invocation_count += 1
        time.sleep(0.05)
        return {"data": "computed_value", "run": invocation_count}

    # 1. First sequential call executes compute_fn
    val1 = get_or_compute(category, identifier, compute_heavy_data)
    assert val1["data"] == "computed_value"
    assert invocation_count == 1

    # 2. Second sequential call reuses cached value without executing compute_fn
    val2 = get_or_compute(category, identifier, compute_heavy_data)
    assert val2["data"] == "computed_value"
    assert invocation_count == 1

    # 3. Concurrent multi-threaded access on a new identifier
    new_identifier = "CONCURRENT_LOCK_KEY"
    concurrent_calls = 0

    def concurrent_compute():
        nonlocal concurrent_calls
        concurrent_calls += 1
        time.sleep(0.05)
        return {"thread_result": "ok"}

    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
        futures = [
            executor.submit(get_or_compute, category, new_identifier, concurrent_compute)
            for _ in range(5)
        ]
        results = [f.result() for f in futures]

    for res in results:
        assert res["thread_result"] == "ok"

    # With double-checked locking, compute function should be called exactly once
    assert concurrent_calls == 1

    invalidate_category(category)
