"""
test_market_sync.py — Unit and Integration tests for Market Data Synchronization Engine
"""
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient
from app.main import app
from app.sync.market_sync import is_market_open, get_sync_interval_minutes, get_sync_interval_seconds, get_sync_status
client = TestClient(app)

def test_market_open_detection_trading_hours():
    ist_tz = timezone(timedelta(hours=5, minutes=30))
    t_open_start = datetime(2026, 8, 3, 9, 15, tzinfo=ist_tz)
    assert is_market_open(t_open_start) is True
    t_open_mid = datetime(2026, 8, 3, 14, 30, tzinfo=ist_tz)
    assert is_market_open(t_open_mid) is True
    t_open_end = datetime(2026, 8, 3, 15, 29, tzinfo=ist_tz)
    assert is_market_open(t_open_end) is True
    t_closed_pre = datetime(2026, 8, 3, 9, 14, tzinfo=ist_tz)
    assert is_market_open(t_closed_pre) is False
    t_closed_post = datetime(2026, 8, 3, 15, 30, tzinfo=ist_tz)
    assert is_market_open(t_closed_post) is False
    t_weekend = datetime(2026, 8, 8, 11, 0, tzinfo=ist_tz)
    assert is_market_open(t_weekend) is False

def test_dynamic_sync_intervals():
    ist_tz = timezone(timedelta(hours=5, minutes=30))
    t_open = datetime(2026, 8, 3, 10, 0, tzinfo=ist_tz)
    assert get_sync_interval_minutes(t_open) == 5
    assert get_sync_interval_seconds(t_open) == 300
    t_closed = datetime(2026, 8, 3, 18, 0, tzinfo=ist_tz)
    assert get_sync_interval_minutes(t_closed) == 60
    assert get_sync_interval_seconds(t_closed) == 3600

def test_sync_status_endpoint():
    res = client.get('/api/sync/status')
    assert res.status_code == 200
    data = res.json()
    assert 'market_status' in data
    assert 'is_market_open' in data
    assert 'sync_interval_minutes' in data
    assert 'sync_interval_seconds' in data
    assert 'schedule_rule' in data
    assert data['sync_interval_minutes'] in [5, 60]
    assert data['sync_interval_seconds'] in [300, 3600]

def test_manual_sync_trigger_endpoint():
    res = client.post('/api/sync/trigger')
    assert res.status_code == 200
    data = res.json()
    assert data['status'] in ['SUCCESS', 'SKIPPED']
    assert 'sync_interval_minutes' in data or 'last_synced_at' in data

def test_market_summary_includes_sync_metadata():
    res = client.get('/api/market/summary')
    assert res.status_code == 200
    data = res.json()
    assert 'market_status' in data
    assert 'is_market_open' in data
    assert 'sync_interval_minutes' in data
    assert 'sync_interval_seconds' in data
    assert data['sync_interval_minutes'] in [5, 60]
