/**
 * SearchHeader.jsx — Redesigned premium command header
 *
 * Layout: [Logo + brand] | [Search palette trigger] | [Quick chips + live status + sync]
 * Design: Flat dark surface, one amber accent, data-dense right section.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, RefreshCw, X, TrendingUp, ChevronDown } from 'lucide-react';
import { BASE_URL } from '../lib/apiClient';

const QUICK_CHIPS = [
  { symbol: 'RELIANCE.NS',  label: 'RELIANCE'  },
  { symbol: 'TCS.NS',       label: 'TCS'        },
  { symbol: 'HDFCBANK.NS',  label: 'HDFCBANK'  },
  { symbol: 'ICICIBANK.NS', label: 'ICICI'      },
  { symbol: 'INFY.NS',      label: 'INFY'       },
  { symbol: 'TATAMOTORS.NS',label: 'TATAMOTORS' },
];

const getExchangeLabel = (symbol) => {
  if (symbol.endsWith('.NS')) return 'NSE';
  if (symbol.endsWith('.BO')) return 'BSE';
  return 'NSE';
};

// ─── Command Palette ──────────────────────────────────────────────────────────
function CommandPalette({ onClose, onSelectSymbol }) {
  const [searchQuery, setSearchQuery]     = useState('');
  const [suggestions, setSuggestions]     = useState([]);
  const [isSearching, setIsSearching]     = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentSearches, setRecentSearches] = useState(() => {
    try { return JSON.parse(localStorage.getItem('recent_stock_searches') || '[]'); }
    catch { return []; }
  });
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleSelect = (symbol) => {
    try {
      const updated = [symbol, ...recentSearches.filter(s => s !== symbol)].slice(0, 6);
      localStorage.setItem('recent_stock_searches', JSON.stringify(updated));
    } catch {}
    onSelectSymbol(symbol);
    onClose();
  };

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (!suggestions.length) return;
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex(i => Math.min(i + 1, suggestions.length - 1)); }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setSelectedIndex(i => Math.max(i - 1, 0)); }
      if (e.key === 'Enter')     { e.preventDefault(); if (suggestions[selectedIndex]) handleSelect(suggestions[selectedIndex].symbol); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [suggestions, selectedIndex]);

  useEffect(() => {
    if (searchQuery.trim().length === 0) {
      setSuggestions([]);
      setIsSearching(false);
      return;
    }
    const controller = new AbortController();
    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(
          `${BASE_URL}/api/stocks/search?q=${encodeURIComponent(searchQuery.trim())}`,
          { signal: controller.signal }
        );
        if (response.ok) {
          const results = await response.json();
          if (!controller.signal.aborted) {
            setSuggestions(results.results || results);
            setSelectedIndex(0);
          }
        }
      } catch (e) {
        if (e.name !== 'AbortError') console.error('Search error:', e);
      } finally {
        if (!controller.signal.aborted) setIsSearching(false);
      }
    }, 180);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [searchQuery]);

  const displayItems = searchQuery.length >= 1 ? suggestions
    : recentSearches.map(s => ({ symbol: s, name: s.replace('.NS','').replace('.BO',''), exchange: getExchangeLabel(s) }));

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 900,
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
        }}
      />

      {/* Palette panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Stock search"
        style={{
          position: 'fixed', top: '12%', left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 901,
          width: 'min(580px, 92vw)',
          background: '#10131F',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '12px',
          boxShadow: '0 32px 80px rgba(0,0,0,0.8), 0 0 0 1px rgba(245,166,35,0.08)',
          overflow: 'hidden',
          animation: 'panel-rise 160ms ease-out both',
        }}
      >
        {/* Search input row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          {isSearching
            ? <RefreshCw size={15} style={{ color: '#F5A623', flexShrink: 0 }} className="spin" />
            : <Search size={15} style={{ color: '#7C8FA6', flexShrink: 0 }} />
          }
          <input
            ref={inputRef}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value.toUpperCase())}
            placeholder="Search stocks — RELIANCE, TCS, INFY…"
            style={{
              flex: 1, background: 'none', border: 'none', outline: 'none',
              color: '#E8EDF4', fontSize: '0.95rem',
              fontFamily: "'IBM Plex Mono', monospace",
              letterSpacing: '0.02em',
            }}
            aria-label="Search stocks"
          />
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4A5A6A', padding: '2px', display: 'flex', borderRadius: '4px' }}>
            <X size={14} />
          </button>
        </div>

        {/* Section label */}
        {displayItems.length > 0 && (
          <div style={{ padding: '8px 16px 4px', fontSize: '0.62rem', fontFamily: "'IBM Plex Mono', monospace", color: '#4A5A6A', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            {searchQuery.length >= 1 ? 'Results' : 'Recent'}
          </div>
        )}

        {/* Results list */}
        <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
          {displayItems.length === 0 && searchQuery.length >= 1 && !isSearching && (
            <div style={{ padding: '28px 16px', textAlign: 'center', color: '#4A5A6A', fontSize: '0.84rem' }}>
              No results for "{searchQuery}"
            </div>
          )}
          {displayItems.map((item, i) => (
            <button
              key={item.symbol}
              onClick={() => handleSelect(item.symbol)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: '12px',
                padding: '10px 16px', background: i === selectedIndex ? 'rgba(245,166,35,0.07)' : 'transparent',
                border: 'none', borderLeft: `2px solid ${i === selectedIndex ? '#F5A623' : 'transparent'}`,
                cursor: 'pointer', transition: 'all 0.1s',
                textAlign: 'left',
              }}
              onMouseEnter={() => setSelectedIndex(i)}
            >
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.84rem', fontWeight: 600, color: i === selectedIndex ? '#F5A623' : '#E8EDF4', minWidth: '120px' }}>
                {item.symbol}
              </span>
              <span style={{ flex: 1, color: '#7C8FA6', fontSize: '0.8rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {item.name || item.symbol}
              </span>
              <span style={{ fontSize: '0.62rem', padding: '2px 6px', borderRadius: '3px', background: 'rgba(255,255,255,0.05)', color: '#4A5A6A', fontFamily: "'IBM Plex Mono', monospace", letterSpacing: '0.06em', flexShrink: 0 }}>
                {item.exchange || getExchangeLabel(item.symbol)}
              </span>
            </button>
          ))}
        </div>

        {/* Footer hint */}
        <div style={{ padding: '8px 16px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: '16px', alignItems: 'center' }}>
          {[['↑↓', 'Navigate'], ['↵', 'Select'], ['Esc', 'Close']].map(([key, label]) => (
            <span key={key} style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#4A5A6A', fontSize: '0.68rem', fontFamily: "'IBM Plex Mono', monospace" }}>
              <kbd style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '3px', padding: '1px 5px', fontSize: '0.65rem' }}>{key}</kbd>
              {label}
            </span>
          ))}
        </div>
      </div>
    </>
  );
}

// ─── Main Header ──────────────────────────────────────────────────────────────
export default function SearchHeader({ activeSymbol, onSelectSymbol, onTriggerIngest, isIngesting }) {
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [currentTime, setCurrentTime]     = useState('');
  const [isMarketOpen, setIsMarketOpen]   = useState(false);

  // Live clock (IST)
  useEffect(() => {
    const tick = () => {
      const now   = new Date();
      const ist   = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
      const hh    = ist.getHours().toString().padStart(2, '0');
      const mm    = ist.getMinutes().toString().padStart(2, '0');
      const day   = ist.getDay();
      const open  = ist.getHours() >= 9 && (ist.getHours() < 15 || (ist.getHours() === 15 && ist.getMinutes() < 31));
      setCurrentTime(`${hh}:${mm} IST`);
      setIsMarketOpen(day >= 1 && day <= 5 && open);
    };
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, []);

  // Keyboard shortcut ⌘K
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsPaletteOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <>
      {isPaletteOpen && (
        <CommandPalette
          onClose={() => setIsPaletteOpen(false)}
          onSelectSymbol={onSelectSymbol}
        />
      )}

      <header style={{
        background: '#0B0D18',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        padding: '0 24px',
        height: '56px',
        display: 'flex',
        alignItems: 'center',
        gap: '0',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        flexShrink: 0,
      }}>

        {/* ══ LOGO MARK ══════════════════════════════════════════════════════════ */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '11px',
          paddingRight: '24px',
          borderRight: '1px solid rgba(255,255,255,0.06)',
          marginRight: '20px',
          flexShrink: 0,
          cursor: 'default',
          userSelect: 'none',
        }}>
          {/* Custom SVG logo mark — geometric shield-C with upward signal */}
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Outer rounded square background */}
            <rect width="32" height="32" rx="8" fill="#0F1320"/>
            <rect width="32" height="32" rx="8" fill="url(#logoGrad)" fillOpacity="0.15"/>
            {/* Shield arc (C-shape) */}
            <path
              d="M22 10 C22 10 22 8 16 8 C10 8 9 12 9 16 C9 20 10 24 16 24 C22 24 22 22 22 22"
              stroke="url(#logoGrad)"
              strokeWidth="2"
              strokeLinecap="round"
              fill="none"
            />
            {/* Signal bars — rising, inside the C */}
            <rect x="13.5" y="19" width="1.5" height="3" rx="0.75" fill="#F5A623" opacity="0.5"/>
            <rect x="16"   y="17" width="1.5" height="5" rx="0.75" fill="#F5A623" opacity="0.75"/>
            <rect x="18.5" y="14.5" width="1.5" height="7.5" rx="0.75" fill="#F5A623"/>
            {/* Gradient def */}
            <defs>
              <linearGradient id="logoGrad" x1="9" y1="8" x2="22" y2="24" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#F5A623"/>
                <stop offset="100%" stopColor="#60A5FA"/>
              </linearGradient>
            </defs>
          </svg>

          {/* Brand wordmark */}
          <div>
            <div style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 700,
              fontSize: '1rem',
              color: '#E8EDF4',
              letterSpacing: '-0.03em',
              lineHeight: 1.1,
            }}>
              Clearward
            </div>
            <div style={{
              fontSize: '0.56rem',
              color: '#3A4A5A',
              fontFamily: "'IBM Plex Mono', monospace",
              letterSpacing: '0.1em',
              marginTop: '1px',
              textTransform: 'uppercase',
            }}>
              Risk Intelligence
            </div>
          </div>
        </div>

        {/* ══ SEARCH TRIGGER ═════════════════════════════════════════════════════ */}
        <button
          id="search-palette-trigger"
          onClick={() => setIsPaletteOpen(true)}
          aria-label="Open stock search (⌘K)"
          style={{
            display: 'flex', alignItems: 'center', gap: '9px',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: '7px',
            padding: '7px 14px',
            color: '#3A4A5A',
            cursor: 'pointer',
            fontSize: '0.78rem',
            fontFamily: "'IBM Plex Mono', monospace",
            transition: 'border-color 0.15s, color 0.15s',
            flex: '1 1 auto',
            maxWidth: '320px',
            minWidth: '160px',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.14)';
            e.currentTarget.style.color = '#8A9EAF';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)';
            e.currentTarget.style.color = '#3A4A5A';
          }}
        >
          <Search size={13} style={{ flexShrink: 0 }} />
          <span style={{ flex: 1, textAlign: 'left' }}>
            {activeSymbol
              ? <span style={{ color: '#F5A623', fontWeight: 600, letterSpacing: '0.02em' }}>
                  {activeSymbol.replace('.NS','').replace('.BO','')}
                  <span style={{ color: '#3A4A5A', fontWeight: 400, fontSize: '0.68rem', marginLeft: '6px' }}>
                    {activeSymbol.endsWith('.NS') ? 'NSE' : 'BSE'}
                  </span>
                </span>
              : <span style={{ color: '#3A4A5A' }}>Search stocks — RELIANCE, TCS…</span>
            }
          </span>
          <kbd style={{
            fontSize: '0.6rem',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: '3px',
            padding: '2px 6px',
            color: '#2A3A4A',
            fontFamily: "'IBM Plex Mono', monospace",
            flexShrink: 0,
            letterSpacing: '0',
          }}>⌘K</kbd>
        </button>

        {/* ══ QUICK CHIPS ════════════════════════════════════════════════════════ */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '3px',
          marginLeft: '10px',
          overflow: 'hidden',
        }}>
          {QUICK_CHIPS.slice(0, 5).map(chip => {
            const isActive = activeSymbol === chip.symbol;
            return (
              <button
                key={chip.symbol}
                onClick={() => onSelectSymbol(chip.symbol)}
                title={chip.symbol}
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: '0.68rem',
                  fontWeight: isActive ? 600 : 400,
                  padding: '4px 8px',
                  borderRadius: '4px',
                  border: 'none',
                  background: isActive ? 'rgba(245,166,35,0.12)' : 'transparent',
                  color: isActive ? '#F5A623' : '#3A4A5A',
                  cursor: 'pointer',
                  transition: 'all 0.12s',
                  letterSpacing: '0.02em',
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={e => {
                  if (!isActive) {
                    e.currentTarget.style.color = '#6A7E90';
                    e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                  }
                }}
                onMouseLeave={e => {
                  if (!isActive) {
                    e.currentTarget.style.color = '#3A4A5A';
                    e.currentTarget.style.background = 'transparent';
                  }
                }}
              >
                {chip.label}
              </button>
            );
          })}
        </div>

        {/* ══ SPACER ═════════════════════════════════════════════════════════════ */}
        <div style={{ flex: 1 }} />

        {/* ══ RIGHT STATUS SECTION ═══════════════════════════════════════════════ */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0',
          flexShrink: 0,
          borderLeft: '1px solid rgba(255,255,255,0.06)',
          paddingLeft: '20px',
          marginLeft: '12px',
        }}>

          {/* Market open/closed pill */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            marginRight: '16px',
          }}>
            <span style={{
              width: 5, height: 5, borderRadius: '50%', flexShrink: 0,
              background: isMarketOpen ? '#22C55E' : '#2A3A4A',
              boxShadow: isMarketOpen ? '0 0 6px rgba(34,197,94,0.7)' : 'none',
            }} />
            <span style={{
              fontSize: '0.67rem',
              fontFamily: "'IBM Plex Mono', monospace",
              color: isMarketOpen ? '#22C55E' : '#3A4A5A',
              letterSpacing: '0.06em',
            }}>
              {isMarketOpen ? 'OPEN' : 'CLOSED'}
            </span>
          </div>

          {/* Exchanges label */}
          <span style={{
            fontSize: '0.67rem',
            fontFamily: "'IBM Plex Mono', monospace",
            color: '#2A3A4A',
            letterSpacing: '0.04em',
            marginRight: '16px',
          }}>
            NSE · BSE
          </span>

          {/* Live time */}
          <span style={{
            fontSize: '0.67rem',
            fontFamily: "'IBM Plex Mono', monospace",
            color: '#3A4A5A',
            letterSpacing: '0.04em',
            marginRight: '20px',
            minWidth: '62px',
          }}>
            {currentTime}
          </span>

          {/* Sync button */}
          <button
            onClick={() => onTriggerIngest && onTriggerIngest(activeSymbol)}
            disabled={isIngesting}
            aria-label="Sync market data"
            style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              padding: '6px 12px',
              borderRadius: '6px',
              border: '1px solid rgba(245,166,35,0.2)',
              background: 'transparent',
              color: '#F5A623',
              fontSize: '0.68rem',
              fontFamily: "'IBM Plex Mono', monospace",
              fontWeight: 500,
              cursor: isIngesting ? 'not-allowed' : 'pointer',
              letterSpacing: '0.04em',
              transition: 'background 0.15s, border-color 0.15s',
              opacity: isIngesting ? 0.6 : 1,
            }}
            onMouseEnter={e => {
              if (!isIngesting) {
                e.currentTarget.style.background = 'rgba(245,166,35,0.08)';
                e.currentTarget.style.borderColor = 'rgba(245,166,35,0.35)';
              }
            }}
            onMouseLeave={e => {
              if (!isIngesting) {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.borderColor = 'rgba(245,166,35,0.2)';
              }
            }}
          >
            <RefreshCw size={11} className={isIngesting ? 'spin' : ''} />
            {isIngesting ? 'Syncing…' : 'Sync'}
          </button>
        </div>
      </header>
    </>
  );
}
