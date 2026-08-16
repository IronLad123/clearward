/**
 * RiskManagementCard.jsx — ATR-adjusted position risk parameters
 *
 * Design: Four numbers only. Large IBM Plex Mono. One-word Slate label below each.
 * A user should be able to screenshot just this widget and have it make sense.
 * Pairs ▲/▼ glyphs with color for colorblind safety — never color alone.
 *
 * Props:
 * - symbol {string} Ticker symbol (used for currency detection)
 * - priceData {Array} Price history (used to read latest close + ATR)
 * - prediction {Object} ML prediction (direction drives long/short setup)
 * - signalsData {Object} Technical signals and indicators snapshot
 */

import React from 'react';

export default function RiskManagementCard({ symbol, priceData, prediction, signalsData }) {
 if (!priceData || priceData.length < 5) return null;

 // ── Extract latest price data ─────────────────────────────────────────────
 const latestRow = priceData[priceData.length - 1];
 const currentClose = parseFloat(latestRow.close) || 0;

 // Use ATR from signalsData if available, otherwise from historical price series
 const atr = signalsData?.indicators?.atr_14 || parseFloat(latestRow.atr_14) || (currentClose * 0.018);

 // Read active signal if available
 const activeSignal = signalsData?.signals?.[0];
 const direction = prediction?.direction || (activeSignal?.direction === 'BULLISH' ? 'UP' : activeSignal?.direction === 'BEARISH' ? 'DOWN' : 'UP');
 const isLong = direction !== 'DOWN';
 const currencySymbol = (symbol || '').includes('.NS') || (symbol || '').includes('.BO') ? '₹' : '$';

 // ── Risk/Reward Calculations ──────────────────────────────────────────────
 // All distances are ATR-multiples — quantitative, not arbitrary
 const stopLossDistance = atr * 1.2;
 const target1Distance = atr * 1.8;
 const target2Distance = atr * 3.2;

 const entryPrice = Math.round(currentClose * 100) / 100;
 const stopLoss = Math.round((isLong ? currentClose - stopLossDistance : currentClose + stopLossDistance) * 100) / 100;
 const target1 = Math.round((isLong ? currentClose + target1Distance : currentClose - target1Distance) * 100) / 100;
 const target2 = Math.round((isLong ? currentClose + target2Distance : currentClose - target2Distance) * 100) / 100;

 const rrRatio = (target1Distance / stopLossDistance).toFixed(1);

 // ── Format a price for display ────────────────────────────────────────────
 const formatPrice = (price) => {
 return `${currencySymbol}${Number(price).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
 };

 // ── Format percentage change ──────────────────────────────────────────────
 const formatChangePct = (targetPrice) => {
 const changePct = ((targetPrice - currentClose) / currentClose * 100);
 const sign = changePct >= 0 ? '+' : '';
 return `${sign}${changePct.toFixed(1)}%`;
 };

 // ── Each of the 4 risk numbers ────────────────────────────────────────────
 const riskNumbers = [
 {
 key: 'entry',
 label: 'CURRENT CLOSE',
 value: formatPrice(entryPrice),
 subtext: 'Current close',
 color: 'var(--ink)',
 glyph: '●',
 glyphColor: 'var(--slate)',
 },
 {
 key: 'tp1',
 label: 'RESIST. BAND 1',
 value: formatPrice(target1),
 subtext: formatChangePct(target1),
 color: 'var(--rally)',
 glyph: isLong ? '▲' : '▼',
 glyphColor: 'var(--rally)',
 },
 {
 key: 'tp2',
 label: 'RESIST. BAND 2',
 value: formatPrice(target2),
 subtext: formatChangePct(target2),
 color: 'var(--amber-gold)',
 glyph: isLong ? '▲▲' : '▼▼',
 glyphColor: 'var(--amber-gold)',
 },
 {
 key: 'sl',
 label: 'VOLATILITY FLOOR',
 value: formatPrice(stopLoss),
 subtext: formatChangePct(stopLoss),
 color: 'var(--selloff)',
 glyph: isLong ? '▼' : '▲',
 glyphColor: 'var(--selloff)',
 },
 ];

 return (
 <div className="glass-card" style={{ marginTop: '20px' }}>

 {/* ── Header ─────────────────────────────────────────────────────── */}
 <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
 <div>
 <h3 style={{
 fontFamily: "'Space Grotesk', sans-serif",
 fontSize: '0.95rem',
 fontWeight: 600,
 color: 'var(--ink)',
 }}>
 Risk Parameters
 </h3>
 <div style={{ fontSize: '0.65rem', color: 'var(--slate)', fontFamily: "'IBM Plex Mono', monospace", opacity: 0.7, marginTop: '3px' }}>
 ATR-Based Statistical Range — Not investment advice
 </div>
 </div>
 <div style={{
 fontFamily: "'IBM Plex Mono', monospace",
 fontSize: '0.78rem',
 fontVariantNumeric: 'tabular-nums',
 background: 'rgba(201,165,77,0.1)',
 border: '1px solid rgba(201,165,77,0.25)',
 borderRadius: '6px',
 padding: '3px 9px',
 color: 'var(--amber-gold)',
 }}>
 R:R RATIO 1 : {rrRatio}
 </div>
 </div>

 {/* ── Four-number grid ─────────────────────────────────────────────── */}
 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
 {riskNumbers.map((item) => (
 <div
 key={item.key}
 style={{
 background: 'rgba(255,255,255,0.03)',
 border: '1px solid rgba(255,255,255,0.08)',
 borderRadius: '10px',
 padding: '14px 12px',
 display: 'flex',
 flexDirection: 'column',
 gap: '4px',
 }}
 >
 {/* Direction glyph — colorblind-safe signal */}
 <div style={{ fontSize: '0.75rem', color: item.glyphColor, fontFamily: "'IBM Plex Mono', monospace", marginBottom: '2px' }}>
 {item.glyph}
 </div>
 {/* Large mono price number */}
 <div style={{
 fontFamily: "'IBM Plex Mono', monospace",
 fontSize: '1.05rem',
 fontWeight: 600,
 color: item.color,
 fontVariantNumeric: 'tabular-nums',
 letterSpacing: '-0.02em',
 lineHeight: 1.1,
 }}>
 {item.value}
 </div>
 {/* Percentage change */}
 <div style={{
 fontFamily: "'IBM Plex Mono', monospace",
 fontSize: '0.72rem',
 color: 'var(--slate)',
 fontVariantNumeric: 'tabular-nums',
 }}>
 {item.subtext}
 </div>
 {/* One-word label */}
 <div style={{
 fontFamily: "'Space Grotesk', sans-serif",
 fontSize: '0.7rem',
 fontWeight: 600,
 color: 'var(--slate)',
 textTransform: 'uppercase',
 letterSpacing: '0.05em',
 marginTop: '2px',
 }}>
 {item.label}
 </div>
 </div>
 ))}
 </div>

 {/* ── Active Technical Signal Reference ──────────────────────────────── */}
 {activeSignal && (
 <div style={{
 marginTop: '16px',
 padding: '10px 14px',
 background: 'rgba(255,255,255,0.02)',
 border: '1px solid rgba(255,255,255,0.06)',
 borderRadius: '8px',
 fontSize: '0.76rem',
 color: 'var(--slate-light)',
 fontFamily: "'Space Grotesk', sans-serif",
 lineHeight: 1.4,
 }}>
 Based on Active Signal: <strong style={{ color: activeSignal.direction === 'BULLISH' ? 'var(--rally)' : 'var(--selloff)', fontFamily: "'Space Grotesk', sans-serif" }}>
 {activeSignal.signal_type}
 </strong> ({Math.round(activeSignal.confidence * 100)}% confidence) — {activeSignal.description}
 </div>
 )}
 </div>
 );
}
