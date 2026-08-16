/**
 * SignalCard.jsx — Technical indicator snapshots and active rule scanner
 *
 * Design System implementation:
 * - Uses --rally / --selloff / --signal-gold tokens
 * - Displays indicators in clean IBM Plex Mono tabular format
 * - Renders a skeleton loader during data loading
 */

import React from 'react';
import { Zap, ArrowUpRight, ArrowDownRight } from 'lucide-react';

const COLOR_RALLY = 'var(--rally)';
const COLOR_SELLOFF = 'var(--selloff)';
const COLOR_SLATE = 'var(--slate)';
const COLOR_GOLD = 'var(--amber-gold)';
const COLOR_INK = 'var(--ink)';

function SignalCardSkeleton() {
 return (
 <div className="glass-card skeleton-pulse" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
 <div style={{ height: '20px', width: '50%', background: 'rgba(255,255,255,0.06)', borderRadius: '6px' }} />
 <div style={{ height: '16px', width: '20%', background: 'rgba(255,255,255,0.04)', borderRadius: '6px' }} />
 </div>
 <div style={{ height: '54px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px' }} />
 <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
 {[1, 2].map(n => (
 <div key={n} style={{ height: '44px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }} />
 ))}
 </div>
 </div>
 );
}

export default function SignalCard({ signalsData, loading }) {
 if (loading) return <SignalCardSkeleton />;
 if (!signalsData || !signalsData.signals) return null;

 const { indicators, signals } = signalsData;

 return (
 <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

 {/* ── Section Header ─────────────────────────────────────────────────── */}
 <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
 <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
 <Zap size={18} color={COLOR_GOLD} />
 <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '0.95rem', fontWeight: 600, color: COLOR_INK }}>
 Technical Signal Scanner
 </h3>
 </div>
 <span
 className="glass-pill"
 style={{
 fontSize: '0.72rem',
 color: COLOR_GOLD,
 borderColor: 'rgba(201, 165, 77, 0.25)',
 background: 'rgba(201, 165, 77, 0.08)',
 }}
 >
 {signals.length} Signal{signals.length === 1 ? '' : 's'} Active
 </span>
 </div>

 {/* ── Technical Indicators Grid ──────────────────────────────────────── */}
 {indicators && (
 <div style={{
 display: 'grid',
 gridTemplateColumns: 'repeat(3, 1fr)',
 gap: '8px',
 background: 'rgba(255,255,255,0.02)',
 border: '1px solid rgba(255,255,255,0.06)',
 padding: '10px',
 borderRadius: '10px',
 }}>
 <div style={{ textAlign: 'center' }}>
 <div style={{ fontSize: '0.68rem', color: COLOR_SLATE, fontFamily: "'Space Grotesk', sans-serif" }}>RSI (14)</div>
 <div style={{
 fontSize: '0.9rem',
 fontWeight: 600,
 fontFamily: "'IBM Plex Mono', monospace",
 fontVariantNumeric: 'tabular-nums',
 marginTop: '2px',
 color: indicators.rsi_14 > 70 ? COLOR_SELLOFF : indicators.rsi_14 < 30 ? COLOR_RALLY : COLOR_INK,
 }}>
 {indicators.rsi_14}
 </div>
 </div>
 <div style={{ textAlign: 'center' }}>
 <div style={{ fontSize: '0.68rem', color: COLOR_SLATE, fontFamily: "'Space Grotesk', sans-serif" }}>MACD Hist</div>
 <div style={{
 fontSize: '0.9rem',
 fontWeight: 600,
 fontFamily: "'IBM Plex Mono', monospace",
 fontVariantNumeric: 'tabular-nums',
 marginTop: '2px',
 color: indicators.macd_hist >= 0 ? COLOR_RALLY : COLOR_SELLOFF,
 }}>
 {indicators.macd_hist >= 0 ? '▲' : '▼'} {Math.abs(indicators.macd_hist).toFixed(2)}
 </div>
 </div>
 <div style={{ textAlign: 'center' }}>
 <div style={{ fontSize: '0.68rem', color: COLOR_SLATE, fontFamily: "'Space Grotesk', sans-serif" }}>Bollinger %B</div>
 <div style={{
 fontSize: '0.9rem',
 fontWeight: 600,
 fontFamily: "'IBM Plex Mono', monospace",
 fontVariantNumeric: 'tabular-nums',
 marginTop: '2px',
 color: COLOR_INK,
 }}>
 {Math.round(indicators.bb_pct_b * 100)}%
 </div>
 </div>
 </div>
 )}

 {/* ── Active Signal List ─────────────────────────────────────────────── */}
 <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
 {signals.length === 0 ? (
 <div style={{
 padding: '20px',
 textAlign: 'center',
 fontSize: '0.78rem',
 color: COLOR_SLATE,
 fontFamily: "'Space Grotesk', sans-serif",
 border: '1px dashed rgba(255,255,255,0.06)',
 borderRadius: '10px',
 }}>
 No high-confidence alerts triggered today. Consolidating sideways.
 </div>
 ) : (
 signals.map((sig, idx) => {
 const isBull = sig.direction === 'BULLISH';
 const signalColor = isBull ? COLOR_RALLY : COLOR_SELLOFF;
 const signalBg = isBull ? 'rgba(61,220,132,0.08)' : 'rgba(255,92,108,0.08)';
 const signalBorder = isBull ? 'rgba(61,220,132,0.25)' : 'rgba(255,92,108,0.25)';

 return (
 <div
 key={idx}
 style={{
 background: 'rgba(255, 255, 255, 0.02)',
 border: `1px solid ${signalBorder}`,
 borderRadius: '10px',
 padding: '12px',
 display: 'flex',
 alignItems: 'flex-start',
 gap: '12px',
 }}
 >
 <div style={{
 background: signalBg,
 padding: '6px',
 borderRadius: '8px',
 display: 'flex',
 alignItems: 'center',
 justifyContent: 'center',
 flexShrink: 0,
 }}>
 {isBull ? (
 <ArrowUpRight size={16} color={signalColor} />
 ) : (
 <ArrowDownRight size={16} color={signalColor} />
 )}
 </div>
 <div style={{ flex: 1 }}>
 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px', flexWrap: 'wrap', gap: '6px' }}>
 <span style={{ fontSize: '0.8rem', fontWeight: 600, color: COLOR_INK, fontFamily: "'Space Grotesk', sans-serif" }}>
 {sig.signal_type}
 </span>
 <span
 className={`glass-pill ${isBull ? 'badge-rally' : 'badge-selloff'}`}
 style={{
 fontSize: '0.68rem',
 padding: '2px 8px',
 fontFamily: "'IBM Plex Mono', monospace",
 }}
 >
 <span
 title="Statistical model confidence — not a price target or investment recommendation"
 style={{ cursor: 'help', borderBottom: '1px dotted var(--slate)' }}
 >
 {Math.round(sig.confidence * 100)}%
 </span> Conf
 </span>
 </div>
 <p style={{ fontSize: '0.76rem', color: COLOR_SLATE, lineHeight: '1.35', fontFamily: "'Space Grotesk', sans-serif" }}>
 {sig.description}
 </p>
 </div>
 </div>
 );
 })
 )}
 </div>
 </div>
 );
}
