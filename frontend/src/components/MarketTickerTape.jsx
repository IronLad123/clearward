import React, { useEffect, useState, useRef } from 'react';
import { RefreshCw } from 'lucide-react';

export default function MarketTickerTape() {
  const [marketData, setMarketData] = useState({
    market_status: 'CLOSED',
    is_market_open: false,
    sync_interval_seconds: 3600,
    last_synced_at: null,
    indices: []
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const timerRef = useRef(null);

  const fetchTickerTape = async () => {
    try {
      const res = await fetch('/api/market/summary');
      if (res.ok) {
        const data = await res.json();
        setMarketData(data);
        scheduleNextFetch(data.sync_interval_seconds || (data.is_market_open ? 300 : 3600));
      }
    } catch (e) {
      console.error('Failed to load market summary:', e);
      scheduleNextFetch(60);
    }
  };

  const scheduleNextFetch = (seconds) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const ms = Math.max(30, seconds) * 1000;
    timerRef.current = setTimeout(fetchTickerTape, ms);
  };

  useEffect(() => {
    fetchTickerTape();
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/sync/trigger', { method: 'POST' });
      if (res.ok) await fetchTickerTape();
    } catch (e) {
      console.error('Manual sync failed:', e);
    } finally {
      setIsSyncing(false);
    }
  };

  if (!marketData.indices || marketData.indices.length === 0) return null;

  const isLive = marketData.is_market_open || (marketData.market_status?.includes('OPEN'));

  const formattedLastSync = marketData.last_synced_at
    ? new Date(marketData.last_synced_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <div style={{
      background: '#080A14',
      borderBottom: '1px solid rgba(255,255,255,0.05)',
      padding: '5px 24px',
      display: 'flex',
      alignItems: 'center',
      gap: '0',
      overflowX: 'auto',
      whiteSpace: 'nowrap',
      fontFamily: "'IBM Plex Mono', monospace",
      fontSize: '0.72rem',
      flexShrink: 0,
    }}>

      {/* Market status badge — compact, no neon */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        color: isLive ? '#22C55E' : '#4A5A6A',
        paddingRight: '16px',
        marginRight: '16px',
        borderRight: '1px solid rgba(255,255,255,0.05)',
        flexShrink: 0,
        letterSpacing: '0.06em',
        fontSize: '0.65rem',
        fontWeight: 600,
      }}>
        <span style={{
          width: 5, height: 5, borderRadius: '50%',
          background: isLive ? '#22C55E' : '#2A3A4A',
          flexShrink: 0,
          boxShadow: isLive ? '0 0 5px rgba(34,197,94,0.6)' : 'none',
        }} />
        {isLive ? 'LIVE' : 'CLOSED'}
      </div>

      {/* Indices */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flex: 1 }}>
        {marketData.indices.map((item) => {
          const isPos = item.is_positive;
          return (
            <div key={item.symbol} style={{ display: 'flex', alignItems: 'center', gap: '7px', flexShrink: 0 }}>
              <span style={{ color: '#6A7E90', fontSize: '0.65rem', letterSpacing: '0.04em' }}>
                {item.name}
              </span>
              <span style={{ color: '#C8D4E0', fontWeight: 500, letterSpacing: '-0.01em' }}>
                {item.price ? `₹${item.price.toLocaleString('en-IN')}` : '—'}
              </span>
              <span style={{
                color: isPos ? '#22C55E' : '#EF4444',
                fontWeight: 600,
                fontSize: '0.65rem',
              }}>
                {isPos ? '+' : ''}{item.change_pct}%
              </span>
            </div>
          );
        })}
      </div>

      {/* Right: last synced + manual sync */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        paddingLeft: '16px',
        marginLeft: '16px',
        borderLeft: '1px solid rgba(255,255,255,0.05)',
        flexShrink: 0,
      }}>
        {formattedLastSync && (
          <span style={{ color: '#2A3A4A', fontSize: '0.63rem' }}>
            {formattedLastSync}
          </span>
        )}
        <button
          onClick={handleManualSync}
          disabled={isSyncing}
          title="Sync market data"
          style={{
            display: 'flex', alignItems: 'center', gap: '4px',
            background: 'none',
            border: 'none',
            color: isSyncing ? '#3A4A5A' : '#3A4A5A',
            padding: '2px 4px',
            fontSize: '0.63rem',
            cursor: isSyncing ? 'default' : 'pointer',
            fontFamily: 'inherit',
            letterSpacing: '0.04em',
            transition: 'color 0.15s',
          }}
          onMouseEnter={e => { if (!isSyncing) e.currentTarget.style.color = '#6A7E90'; }}
          onMouseLeave={e => { if (!isSyncing) e.currentTarget.style.color = '#3A4A5A'; }}
        >
          <RefreshCw size={10} className={isSyncing ? 'spin' : ''} />
          {isSyncing ? 'syncing' : 'sync'}
        </button>
      </div>
    </div>
  );
}
