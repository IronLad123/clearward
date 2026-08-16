import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Star, X, ArrowUpRight, ArrowDownRight, Minus, RefreshCw,
  Plus, BarChart2, ShieldAlert, TrendingUp, Table, Grid, Search, Eye, Zap
} from 'lucide-react';

import { BASE_URL } from '../lib/apiClient';
import { formatRegimeLabel, SEBI_REGIME_DISCLAIMER } from '../utils/sebiFormatter';

const BASE = BASE_URL;

const POPULAR_PRESETS = [
  { label: 'RELIANCE', symbol: 'RELIANCE.NS' },
  { label: 'TCS', symbol: 'TCS.NS' },
  { label: 'HDFCBANK', symbol: 'HDFCBANK.NS' },
  { label: 'ICICIBANK', symbol: 'ICICIBANK.NS' },
  { label: 'INFY', symbol: 'INFY.NS' },
  { label: 'TATAMOTORS', symbol: 'TATAMOTORS.NS' },
  { label: 'BHARTIARTL', symbol: 'BHARTIARTL.NS' },
  { label: 'ITC', symbol: 'ITC.NS' },
];

const SORT_OPTIONS = [
  { id: 'default', label: 'Default Order' },
  { id: 'gain_desc', label: '5D Gain (High → Low)' },
  { id: 'gain_asc', label: '5D Loss (Low → High)' },
  { id: 'hype_desc', label: 'Hype Score (High → Low)' },
  { id: 'price_desc', label: 'Price (High → Low)' },
];

function SkeletonRow() {
  return (
    <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', gap: '16px' }}>
      {[140, 90, 70, 90, 110, 60].map((w, i) => (
        <div key={i} style={{ width: w, height: 16, background: 'rgba(255,255,255,0.05)', borderRadius: 4, animation: 'pulse 1.5s infinite' }} />
      ))}
    </div>
  );
}

export default function WatchlistView({
  watchlist = [],
  activeSymbol,
  onSelectSymbol,
  onRemoveSymbol,
  onAddSymbol,
  onNavigate,
}) {
  const [stockDataMap, setStockDataMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('default');
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'grid'
  const [newSymbolInput, setNewSymbolInput] = useState('');
  const [inputError, setInputError] = useState('');

  const fetchAll = useCallback(async () => {
    if (!watchlist.length) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${BASE}/api/stocks/bulk-signals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbols: watchlist }),
      });
      if (response.ok) {
        const data = await response.json();
        setStockDataMap(data.stocks || {});
      }
    } catch (err) {
      console.error('Bulk watchlist fetch failed:', err);
    } finally {
      setLoading(false);
    }
  }, [watchlist]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const isIndian = (sym) => sym.endsWith('.NS') || sym.endsWith('.BO');
  const currency = (sym) => (isIndian(sym) ? '₹' : '$');

  const handleAddSubmit = (e) => {
    e?.preventDefault();
    if (!newSymbolInput.trim()) return;
    let sym = newSymbolInput.trim().toUpperCase();

    if (!sym.includes('.') && !sym.endsWith('.NS') && !sym.endsWith('.BO')) {
      sym += '.NS';
    }

    if (watchlist.includes(sym)) {
      setInputError(`${sym} is already in your watchlist.`);
      setTimeout(() => setInputError(''), 3000);
      return;
    }

    onAddSymbol?.(sym);
    setNewSymbolInput('');
    setInputError('');
  };

  const enriched = useMemo(() => {
    return watchlist.map((sym) => {
      const d = stockDataMap[sym] || {};
      const sig = d.sigData || {};
      const hype = d.hypeData || {};
      const topSignal = sig.active_signals?.[0] || sig.signals?.[0] || null;
      const close = sig.close_price || sig.closePrice || d.close_price || 0;
      const fiveD = sig.five_day_return ?? sig.fiveDayReturn ?? d.five_day_return ?? null;
      const hypeScore = hype.hype_score ?? hype.score ?? null;
      const hypeVerdict = hype.verdict || hype.label || null;
      const name = sig.name || sig.company_name || d.name || sym;
      const prediction = sig.prediction || 'FLAT';
      const rsi = sig.rsi_14 ?? 50;

      return {
        sym,
        close,
        fiveD,
        hypeScore,
        hypeVerdict,
        topSignal,
        name,
        prediction,
        rsi,
        error: d.error,
      };
    });
  }, [watchlist, stockDataMap]);

  const sorted = useMemo(() => {
    const list = [...enriched];
    if (sortBy === 'hype_desc') return list.sort((a, b) => (b.hypeScore ?? -1) - (a.hypeScore ?? -1));
    if (sortBy === 'gain_desc') return list.sort((a, b) => (b.fiveD ?? -999) - (a.fiveD ?? -999));
    if (sortBy === 'gain_asc') return list.sort((a, b) => (a.fiveD ?? 999) - (b.fiveD ?? 999));
    if (sortBy === 'price_desc') return list.sort((a, b) => (b.close ?? 0) - (a.close ?? 0));
    return list;
  }, [enriched, sortBy]);

  // Analytics summary calculation
  const summaryStats = useMemo(() => {
    if (!enriched.length) return { avgFiveD: 0, hypeFlags: 0, posBiasCount: 0 };
    let validFiveD = 0;
    let sumFiveD = 0;
    let hypeFlags = 0;
    let posBiasCount = 0;

    enriched.forEach((item) => {
      if (item.fiveD != null) {
        sumFiveD += item.fiveD;
        validFiveD++;
      }
      if (item.hypeScore != null && item.hypeScore >= 60) {
        hypeFlags++;
      }
      if (item.prediction === 'UP' || item.prediction === 'POSITIVE') {
        posBiasCount++;
      }
    });

    return {
      avgFiveD: validFiveD > 0 ? (sumFiveD / validFiveD).toFixed(2) : '0.00',
      hypeFlags,
      posBiasCount,
    };
  }, [enriched]);

  const hypeColor = (verdict, score) => {
    if (score != null && score >= 65) return 'var(--selloff)';
    if (score != null && score >= 40) return 'var(--amber-gold)';
    if (!verdict) return 'var(--slate)';
    const v = verdict.toUpperCase();
    if (v.includes('RED') || v.includes('FLAG') || v.includes('HIGH')) return 'var(--selloff)';
    if (v.includes('CAUTION')) return 'var(--amber-gold)';
    return 'var(--rally)';
  };

  return (
    <div style={{ maxWidth: '1080px', margin: '0 auto', padding: '0 8px 32px' }}>
      {/* ── Header Title & Stats ─────────────────────────────────── */}
      <div
        style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid var(--glass-border)',
          borderRadius: '12px',
          padding: '20px 24px',
          marginBottom: '20px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
            marginBottom: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'rgba(201,165,77,0.12)',
                border: '1px solid rgba(201,165,77,0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Star size={20} color="var(--amber-gold)" />
            </div>
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: '1.15rem',
                  fontFamily: "'Space Grotesk', sans-serif",
                  color: 'var(--ink)',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                Tracked Watchlist
                <span
                  style={{
                    fontSize: '0.7rem',
                    fontFamily: "'IBM Plex Mono', monospace",
                    color: 'var(--amber-gold)',
                    background: 'rgba(201,165,77,0.12)',
                    border: '1px solid rgba(201,165,77,0.3)',
                    borderRadius: '12px',
                    padding: '2px 9px',
                  }}
                >
                  {watchlist.length} Tickers
                </span>
              </h2>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--slate)', fontFamily: "'IBM Plex Mono', monospace" }}>
                Real-time price monitoring, technical signals & hype anomaly detection
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {/* View Mode Toggle */}
            <div
              style={{
                display: 'flex',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '8px',
                padding: '3px',
              }}
            >
              <button
                onClick={() => setViewMode('table')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  background: viewMode === 'table' ? 'var(--amber-gold)' : 'transparent',
                  color: viewMode === 'table' ? '#070A10' : 'var(--slate)',
                  transition: 'all 0.2s ease',
                }}
              >
                <Table size={14} /> Quant Table
              </button>
              <button
                onClick={() => setViewMode('grid')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  background: viewMode === 'grid' ? 'var(--amber-gold)' : 'transparent',
                  color: viewMode === 'grid' ? '#070A10' : 'var(--slate)',
                  transition: 'all 0.2s ease',
                }}
              >
                <Grid size={14} /> Cards View
              </button>
            </div>

            {/* Refresh Button */}
            <button
              onClick={fetchAll}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid var(--glass-border)',
                borderRadius: '8px',
                color: 'var(--slate)',
                padding: '6px 12px',
                fontSize: '0.78rem',
                fontFamily: "'IBM Plex Mono', monospace",
                cursor: 'pointer',
              }}
              title="Refresh Watchlist Signals"
            >
              <RefreshCw size={13} className={loading ? 'spin' : ''} /> Refresh
            </button>
          </div>
        </div>

        {/* ── Summary KPI Cards Bar ─────────────────────────────── */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '12px',
            paddingTop: '16px',
            borderTop: '1px dashed rgba(255,255,255,0.08)',
          }}
        >
          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ fontSize: '0.68rem', fontFamily: "'IBM Plex Mono', monospace", color: 'var(--slate)' }}>Avg 5D Basket Return</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace", color: Number(summaryStats.avgFiveD) >= 0 ? 'var(--rally)' : 'var(--selloff)' }}>
              {Number(summaryStats.avgFiveD) >= 0 ? '+' : ''}{summaryStats.avgFiveD}%
            </div>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ fontSize: '0.68rem', fontFamily: "'IBM Plex Mono', monospace", color: 'var(--slate)' }}>Positive Bias Stocks</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace", color: 'var(--rally)' }}>
              {summaryStats.posBiasCount} / {watchlist.length}
            </div>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ fontSize: '0.68rem', fontFamily: "'IBM Plex Mono', monospace", color: 'var(--slate)' }}>Hype Alert Flags</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace", color: summaryStats.hypeFlags > 0 ? 'var(--selloff)' : 'var(--amber-gold)' }}>
              {summaryStats.hypeFlags} Flagged
            </div>
          </div>
        </div>
      </div>

      {/* ── Add Stock & Controls Toolbar ────────────────────────── */}
      <div
        style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid var(--glass-border)',
          borderRadius: '12px',
          padding: '16px 20px',
          marginBottom: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          {/* Add Symbol Input Form */}
          <form onSubmit={handleAddSubmit} style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '280px' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={14} color="var(--slate)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                placeholder="Add symbol e.g. INFY, TATAMOTORS..."
                value={newSymbolInput}
                onChange={(e) => setNewSymbolInput(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 34px',
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: '8px',
                  color: 'var(--ink)',
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: '0.82rem',
                }}
              />
            </div>
            <button
              type="submit"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                background: 'var(--amber-gold)',
                color: '#070A10',
                border: 'none',
                borderRadius: '8px',
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <Plus size={14} /> Add Stock
            </button>
          </form>

          {/* Sort Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.75rem', fontFamily: "'IBM Plex Mono', monospace", color: 'var(--slate)' }}>Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid var(--glass-border)',
                borderRadius: '8px',
                color: 'var(--slate)',
                padding: '7px 12px',
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: '0.78rem',
                cursor: 'pointer',
              }}
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {inputError && (
          <div style={{ fontSize: '0.75rem', color: 'var(--selloff)', fontFamily: "'IBM Plex Mono', monospace" }}>
            {inputError}
          </div>
        )}

        {/* Popular Presets Quick-Add Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', paddingTop: '4px' }}>
          <span style={{ fontSize: '0.68rem', fontFamily: "'IBM Plex Mono', monospace", color: 'var(--slate)' }}>Quick Add:</span>
          {POPULAR_PRESETS.map((p) => {
            const isTracked = watchlist.includes(p.symbol);
            return (
              <button
                key={p.symbol}
                disabled={isTracked}
                onClick={() => onAddSymbol?.(p.symbol)}
                style={{
                  fontSize: '0.68rem',
                  fontFamily: "'IBM Plex Mono', monospace",
                  padding: '3px 9px',
                  borderRadius: '12px',
                  border: '1px solid',
                  borderColor: isTracked ? 'rgba(255,255,255,0.06)' : 'rgba(201,165,77,0.3)',
                  background: isTracked ? 'rgba(255,255,255,0.02)' : 'rgba(201,165,77,0.08)',
                  color: isTracked ? 'var(--slate)' : 'var(--amber-gold)',
                  cursor: isTracked ? 'default' : 'pointer',
                  opacity: isTracked ? 0.5 : 1,
                  transition: 'all 0.15s ease',
                }}
              >
                {isTracked ? `✓ ${p.label}` : `+ ${p.label}`}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Table View ──────────────────────────────────────────── */}
      {viewMode === 'table' && (
        <div
          style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid var(--glass-border)',
            borderRadius: '12px',
            overflow: 'hidden',
            marginBottom: '20px',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1.2fr 100px 85px 100px 140px 110px 40px',
              gap: '8px',
              padding: '12px 20px',
              background: 'rgba(255,255,255,0.02)',
              borderBottom: '1px solid var(--glass-border)',
              fontSize: '0.68rem',
              fontFamily: "'IBM Plex Mono', monospace",
              color: 'var(--slate)',
              letterSpacing: '0.06em',
            }}
          >
            <div>SYMBOL</div>
            <div>LAST PRICE</div>
            <div>5D RETURN</div>
            <div>HYPE SCORE</div>
            <div>TECHNICAL SIGNAL</div>
            <div>ML REGIME</div>
            <div />
          </div>

          <div>
            {loading
              ? [1, 2, 3, 4, 5].map((k) => <SkeletonRow key={k} />)
              : sorted.map(({ sym, close, fiveD, hypeScore, hypeVerdict, topSignal, name, prediction, error }) => {
                  const isActive = sym === activeSymbol;
                  const fiveDPos = fiveD != null && fiveD > 0;
                  const fiveDNeg = fiveD != null && fiveD < 0;
                  const regime = formatRegimeLabel(prediction);

                  return (
                    <div
                      key={sym}
                      onClick={() => onSelectSymbol?.(sym)}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1.2fr 100px 85px 100px 140px 110px 40px',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '14px 20px',
                        borderBottom: '1px solid var(--glass-border)',
                        cursor: 'pointer',
                        background: isActive ? 'rgba(201,165,77,0.06)' : 'transparent',
                        borderLeft: isActive ? '3px solid var(--amber-gold)' : '3px solid transparent',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      {/* Symbol + Name */}
                      <div>
                        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '0.92rem', color: 'var(--ink)', fontWeight: 700 }}>
                          {sym.replace('.NS', '').replace('.BO', '')}
                          <span style={{ fontSize: '0.68rem', fontFamily: "'IBM Plex Mono', monospace", color: 'var(--slate)', marginLeft: '6px' }}>
                            {sym.includes('.') ? sym.split('.')[1] : 'NSE'}
                          </span>
                        </div>
                        {name && name !== sym && (
                          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.72rem', color: 'var(--slate)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {name}
                          </div>
                        )}
                      </div>

                      {/* Price */}
                      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.88rem', color: 'var(--ink)', fontWeight: 600 }}>
                        {error ? (
                          <span style={{ color: 'var(--slate)', fontSize: '0.72rem' }}>ERR</span>
                        ) : close ? (
                          `${currency(sym)}${close.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
                        ) : (
                          '—'
                        )}
                      </div>

                      {/* 5D % */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                        {fiveD != null ? (
                          <>
                            {fiveDPos ? (
                              <ArrowUpRight size={13} color="var(--rally)" />
                            ) : fiveDNeg ? (
                              <ArrowDownRight size={13} color="var(--selloff)" />
                            ) : (
                              <Minus size={13} color="var(--slate)" />
                            )}
                            <span
                              style={{
                                fontFamily: "'IBM Plex Mono', monospace",
                                fontSize: '0.8rem',
                                color: fiveDPos ? 'var(--rally)' : fiveDNeg ? 'var(--selloff)' : 'var(--slate)',
                                fontWeight: 600,
                              }}
                            >
                              {fiveD > 0 ? '+' : ''}
                              {fiveD.toFixed(2)}%
                            </span>
                          </>
                        ) : (
                          <span style={{ color: 'var(--slate)', fontSize: '0.72rem' }}>—</span>
                        )}
                      </div>

                      {/* Hype Score */}
                      <div>
                        {hypeScore != null ? (
                          <span
                            style={{
                              fontSize: '0.68rem',
                              fontFamily: "'IBM Plex Mono', monospace",
                              color: hypeColor(hypeVerdict, hypeScore),
                              background: `color-mix(in srgb, ${hypeColor(hypeVerdict, hypeScore)} 12%, transparent)`,
                              border: `1px solid color-mix(in srgb, ${hypeColor(hypeVerdict, hypeScore)} 30%, transparent)`,
                              borderRadius: '4px',
                              padding: '2px 8px',
                              fontWeight: 600,
                            }}
                          >
                            {hypeScore}/100
                          </span>
                        ) : (
                          <span style={{ color: 'var(--slate)', fontSize: '0.72rem' }}>0/100</span>
                        )}
                      </div>

                      {/* Signal */}
                      <div style={{ overflow: 'hidden' }}>
                        {topSignal ? (
                          <span
                            style={{
                              fontSize: '0.68rem',
                              fontFamily: "'IBM Plex Mono', monospace",
                              color: 'var(--amber-gold)',
                              background: 'rgba(201,165,77,0.1)',
                              border: '1px solid rgba(201,165,77,0.25)',
                              borderRadius: '4px',
                              padding: '2px 7px',
                              display: 'inline-block',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {topSignal.signal_type || topSignal.type || 'CONSOLIDATION'}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--slate)', fontSize: '0.72rem' }}>CONSOLIDATION</span>
                        )}
                      </div>

                      {/* SEBI Regime */}
                      <div>
                        <span
                          style={{
                            fontSize: '0.68rem',
                            fontFamily: "'IBM Plex Mono', monospace",
                            color: regime.color,
                            fontWeight: 600,
                          }}
                        >
                          {regime.glyph} {regime.label}
                        </span>
                      </div>

                      {/* Remove Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveSymbol?.(sym);
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: 'var(--slate)',
                          padding: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          borderRadius: '4px',
                        }}
                        title={`Remove ${sym}`}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  );
                })}
          </div>
        </div>
      )}

      {/* ── Cards View ──────────────────────────────────────────── */}
      {viewMode === 'grid' && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '16px',
            marginBottom: '20px',
          }}
        >
          {sorted.map(({ sym, close, fiveD, hypeScore, hypeVerdict, topSignal, name, prediction }) => {
            const isActive = sym === activeSymbol;
            const regime = formatRegimeLabel(prediction);
            const fiveDPos = fiveD != null && fiveD > 0;

            return (
              <div
                key={sym}
                onClick={() => onSelectSymbol?.(sym)}
                style={{
                  background: isActive ? 'rgba(201,165,77,0.06)' : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${isActive ? 'var(--amber-gold)' : 'var(--glass-border)'}`,
                  borderRadius: '12px',
                  padding: '18px',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                  transition: 'all 0.2s ease',
                }}
              >
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '1.1rem', fontWeight: 700, color: 'var(--ink)' }}>
                      {sym.replace('.NS', '').replace('.BO', '')}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--slate)', fontFamily: "'Inter', sans-serif" }}>
                      {name || sym}
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveSymbol?.(sym);
                    }}
                    style={{ background: 'none', border: 'none', color: 'var(--slate)', cursor: 'pointer' }}
                  >
                    <X size={14} />
                  </button>
                </div>

                {/* Price & 5D Return */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <div style={{ fontSize: '1.3rem', fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace", color: 'var(--ink)' }}>
                    {close ? `${currency(sym)}${close.toLocaleString('en-IN', { maximumFractionDigits: 2 })}` : '—'}
                  </div>
                  <div
                    style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      color: fiveDPos ? 'var(--rally)' : 'var(--selloff)',
                    }}
                  >
                    {fiveD != null ? `${fiveD > 0 ? '+' : ''}${fiveD.toFixed(2)}%` : '—'}
                  </div>
                </div>

                {/* SEBI Regime & Hype Badge */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', fontFamily: "'IBM Plex Mono', monospace" }}>
                  <span style={{ color: regime.color, fontWeight: 600 }}>
                    {regime.glyph} {regime.label}
                  </span>
                  <span
                    style={{
                      color: hypeColor(hypeVerdict, hypeScore),
                      background: `color-mix(in srgb, ${hypeColor(hypeVerdict, hypeScore)} 12%, transparent)`,
                      border: `1px solid color-mix(in srgb, ${hypeColor(hypeVerdict, hypeScore)} 30%, transparent)`,
                      borderRadius: '4px',
                      padding: '2px 8px',
                    }}
                  >
                    Hype: {hypeScore != null ? `${hypeScore}/100` : '0/100'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Footer CTAs ─────────────────────────────────────────── */}
      <div className="pipeline-module-footer">
        <span className="pipeline-module-footer-label">WATCHLIST → NEXT STEP</span>
        <div style={{ display: 'flex', gap: '8px' }}>
          {onNavigate && (
            <>
              <button className="pipeline-cta" onClick={() => onNavigate('hypeguard')}>
                <ShieldAlert size={13} /> Run Hype Guard Scan →
              </button>
              <button className="pipeline-cta" onClick={() => onNavigate('compare')}>
                <BarChart2 size={13} /> Compare in Matrix →
              </button>
            </>
          )}
        </div>
      </div>

      <div
        style={{
          marginTop: '16px',
          padding: '12px',
          fontSize: '0.7rem',
          color: 'var(--slate)',
          borderTop: '1px dashed rgba(255,255,255,0.08)',
          textAlign: 'center',
          fontFamily: "'IBM Plex Mono', monospace",
        }}
      >
        {SEBI_REGIME_DISCLAIMER}
      </div>
    </div>
  );
}
