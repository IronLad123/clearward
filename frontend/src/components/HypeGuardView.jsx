/**
 * HypeGuardView.jsx — Hype Guard panel for Clearward
 *
 * Behavioral pattern detection: Volume anomaly, RSI overbought,
 * 5D/20D price surge scoring.
 *
 * Props:
 * - activeSymbol {string} The currently selected ticker symbol
 * - setActiveSymbol {function} State setter for active symbol
 * - priceHistory {Array} Historical price data for the active symbol
 * - marketContext {Object} Market context data (e.g. VIX)
 */

import React from 'react';
import HypeAndHealthCard from './HypeAndHealthCard';
import BehavioralNudgeBanner from './BehavioralNudgeBanner';

export default function HypeGuardView({ activeSymbol, setActiveSymbol, priceHistory, marketContext, setActiveTab }) {
 return (
 <div style={{ maxWidth: '900px', margin: '0 auto', padding: '0 0 40px' }}>
 {/* Header */}
 <div style={{ textAlign: 'center', marginBottom: '32px' }}>
 <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'var(--selloff-dim, rgba(255,92,108,0.1))', border: '1px solid var(--selloff-border, rgba(255,92,108,0.3))', borderRadius: '9999px', padding: '6px 16px', fontSize: '0.78rem', fontFamily: "'IBM Plex Mono', monospace", color: 'var(--accent-bearish)', marginBottom: '14px' }}>
 BEHAVIORAL GUARD
 </div>
 <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '2rem', fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.02em', marginBottom: '8px' }}>Hype &amp; Behavioral Guard</h1>
 <p style={{ fontFamily: "'Public Sans', sans-serif", fontSize: '0.98rem', color: 'var(--slate-light)', maxWidth: '600px', margin: '0 auto' }}>
 Detects unusual price-volume patterns and behavioral risk signals. Strictly factual — no buy/sell calls.
 </p>
 </div>

 {/* Behavioral Nudge Banners — shown for current active stock */}
 <BehavioralNudgeBanner
 activeSymbol={activeSymbol}
 priceHistory={priceHistory}
 marketContext={marketContext}
 />

 {/* Hype Score Card for active symbol */}
 <HypeAndHealthCard symbol={activeSymbol} />

 {/* Quick switch chips for popular stocks */}
 <div style={{ marginTop: '28px' }}>
 <div style={{ fontSize: '0.75rem', color: 'var(--slate)', fontFamily: "'IBM Plex Mono', monospace", marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Quick Scan</div>
 <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
 {['RELIANCE.NS','TCS.NS','HDFCBANK.NS','ICICIBANK.NS','INFY.NS','TATAMOTORS.NS','ADANIENT.NS','BAJFINANCE.NS'].map(sym => (
 <button
 key={sym}
 className="quick-scan-chip"
 onClick={() => setActiveSymbol && setActiveSymbol(sym)}
 style={{
 fontFamily: "'IBM Plex Mono', monospace",
 fontSize: '0.78rem',
 padding: '6px 12px',
 borderRadius: '6px',
 border: `1px solid ${activeSymbol === sym ? 'var(--accent-bearish)' : 'rgba(255,255,255,0.1)'}`,
 background: activeSymbol === sym ? 'var(--selloff-dim, rgba(255,92,108,0.12))' : 'rgba(255,255,255,0.04)',
 color: activeSymbol === sym ? 'var(--accent-bearish)' : 'var(--slate-light)',
 cursor: 'pointer',
 transition: 'all 0.2s ease',
 display: 'inline-flex',
 alignItems: 'center',
 gap: '6px'
 }}
 >
 <span style={{ fontSize: '0.6rem', color: activeSymbol === sym ? 'var(--accent-bearish)' : 'var(--signal-gold)' }}>●</span>
 {sym}
 </button>
 ))}
 </div>
 </div>

 <div className="pipeline-module-footer">
 <span className="pipeline-module-footer-label">GUARD → PROTECT</span>
 <div style={{ display: 'flex', gap: 8 }}>
 <button className="pipeline-cta" style={{ fontSize: '0.68rem' }}>+ Add to Watchlist →</button>
 <button className="pipeline-cta" style={{ fontSize: '0.68rem' }} onClick={() => setActiveTab && setActiveTab('portfolio')}>⊞ Portfolio Audit →</button>
 </div>
 </div>
 </div>
 );
}
