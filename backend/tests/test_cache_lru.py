"""
test_cache_lru.py — Tests for LRU Recently Used / Peeked Stock Cache Eviction Policy
"""
from fastapi.testclient import TestClient
from app.main import app
from app.cache import set_cached, get_cached, evict_least_recently_used_stocks, get_recently_peeked_stocks, invalidate_category

client = TestClient(app)

def test_lru_eviction_only_stores_recently_peeked_stocks():
    invalidate_category('stock_signals')
    for i in range(1, 36):
        symbol = f'TEST_STOCK_{i:02d}.NS'
        set_cached('stock_signals', symbol, {'symbol': symbol, 'index': i})
        evict_least_recently_used_stocks(max_peeked=30)
    
    peeked = get_recently_peeked_stocks(limit=50)
    stock_signal_entries = [p for p in peeked if p['category'] == 'stock_signals']
    assert len(stock_signal_entries) <= 30
    
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
