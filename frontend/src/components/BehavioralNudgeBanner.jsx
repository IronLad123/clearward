/**
 * BehavioralNudgeBanner.jsx — Contextual behavioral risk nudges for retail self-defense
 *
 * Design Spec:
 * - Dismissible warning banners (never blocking modals)
 * - Educates on behavioral biases (FOMO, overmonitoring, volatility panic, illiquidity)
 * - Uses session-scoped state to track view frequency and dismissals
 * - Compliant: zero directional advice ("buy/sell"), strictly behavioral friction
 *
 * Nudge Triggers:
 * 1. FOMO_SURGE → Stock up >15% over trailing 5 trading days
 * 2. REPEAT_VIEW → Same ticker viewed 5+ times in one browser session
 * 3. HIGH_VIX → India VIX > 20.0 (market-wide elevated volatility)
 * 4. LOW_LIQUIDITY → Daily traded value (Close × Volume) < ₹2 Crore
 */

import React, { useState, useEffect } from 'react';
import { AlertTriangle, Eye, ShieldAlert, Activity, X } from 'lucide-react';

export default function BehavioralNudgeBanner({ activeSymbol, priceHistory, marketContext }) {
 // Track dismissed nudge IDs for the current session
 const [dismissedNudges, setDismissedNudges] = useState(new Set());
 const [viewCount, setViewCount] = useState(0);

 // ── Session View Counter ──────────────────────────────────────────────────
 useEffect(() => {
 if (!activeSymbol) return;

 try {
 const sessionKey = `view_count_${activeSymbol}`;
 const currentCount = parseInt(sessionStorage.getItem(sessionKey) || '0', 10) + 1;
 sessionStorage.setItem(sessionKey, currentCount.toString());
 setViewCount(currentCount);
 } catch (err) {
 console.warn('sessionStorage unavailable for repeat-view tracking:', err);
 }
 }, [activeSymbol]);

 // ── Compute Indicators for Nudges ─────────────────────────────────────────

 // 1. Trailing 5-Day Return
 let trailing5dReturn = 0;
 if (priceHistory && priceHistory.length >= 6) {
 const latestClose = priceHistory[priceHistory.length - 1]?.close || 0;
 const close5dAgo = priceHistory[priceHistory.length - 6]?.close || 0;
 if (close5dAgo > 0) {
 trailing5dReturn = ((latestClose - close5dAgo) / close5dAgo) * 100;
 }
 }

 // 2. Daily Traded Value (INR Crore)
 let dailyTradedValCr = 0;
 if (priceHistory && priceHistory.length > 0) {
 const latest = priceHistory[priceHistory.length - 1];
 if (latest && latest.close && latest.volume) {
 dailyTradedValCr = (latest.close * latest.volume) / 10000000;
 }
 }

 // 3. Active Nudge Conditions
 const nudges = [];

 // Nudge 1: FOMO Surge
 if (trailing5dReturn >= 15.0) {
 nudges.push({
 id: `fomo_${activeSymbol}`,
 type: 'FOMO_SURGE',
 icon: AlertTriangle,
 badge: 'FOMO Surge Warning',
 title: `${activeSymbol} is up +${trailing5dReturn.toFixed(1)}% in 5 trading days`,
 message:
 'Rapid short-term price spikes can make recent movement feel more reliable than it is. Treat the move as a review flag, not a signal by itself.',
 actionHint: 'Review note: compare price action with volume, liquidity, and position risk.',
 severity: 'high',
 });
 }

 // Nudge 2: Repeat View / Over-monitoring
 if (viewCount >= 5) {
 nudges.push({
 id: `repeat_${activeSymbol}`,
 type: 'REPEAT_VIEW',
 icon: Eye,
 badge: 'Behavioral Friction',
 title: `You have viewed ${activeSymbol} ${viewCount} times this session`,
 message:
 'Repeated checks can pull attention toward short-term noise. Use this as a prompt to separate observation from action.',
 actionHint: 'Review note: define the decision rule before opening an order ticket.',
 severity: 'medium',
 });
 }

 // Nudge 3: High Market Volatility (India VIX)
 if (marketContext && marketContext.elevated) {
 const vixVal = marketContext.india_vix || 20.0;
 nudges.push({
 id: 'high_vix',
 type: 'HIGH_VIX',
 icon: Activity,
 badge: 'Market-Wide Volatility',
 title: `India VIX is elevated at ${vixVal.toFixed(1)} (above 20.0 threshold)`,
 message:
 'High India VIX indicates wider intraday price swings across NSE/BSE. Interpret individual signals with the broader regime visible.',
 actionHint: 'Review note: check exposure, time horizon, and downside tolerance together.',
 severity: 'high',
 });
 }

 // Nudge 4: Low Liquidity
 if (dailyTradedValCr > 0 && dailyTradedValCr < 2.0) {
 nudges.push({
 id: `liquidity_${activeSymbol}`,
 type: 'LOW_LIQUIDITY',
 icon: ShieldAlert,
 badge: 'Liquidity Caution',
 title: `Low daily liquidity: ₹${dailyTradedValCr.toFixed(2)} Cr traded today`,
 message:
 'Daily trading value is below ₹2 Crore. Thin liquidity can widen spreads and make execution quality less predictable.',
 actionHint: 'Review note: check spread, traded value, and intended order size.',
 severity: 'medium',
 });
 }

 // Filter out dismissed nudges
 const activeNudges = nudges.filter((n) => !dismissedNudges.has(n.id));

 if (activeNudges.length === 0) return null;

 const handleDismiss = (id) => {
 setDismissedNudges((prev) => new Set(prev).add(id));
 };

 return (
 <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
 {activeNudges.map((nudge) => {
 const IconComponent = nudge.icon;
 const isHigh = nudge.severity === 'high';

 const borderColor = isHigh ? 'rgba(255, 92, 108, 0.4)' : 'rgba(201, 165, 77, 0.4)';
 const bgColor = isHigh ? 'rgba(255, 92, 108, 0.08)' : 'rgba(201, 165, 77, 0.08)';
 const textColor = isHigh ? 'var(--accent-bearish)' : 'var(--signal-gold)';

 return (
 <div
 key={nudge.id}
 className="glass-panel"
 style={{
 borderColor,
 background: bgColor,
 padding: '10px 14px',
 borderRadius: '8px',
 position: 'relative',
 }}
 >
 <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
 <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
 <div
 style={{
 background: borderColor,
 padding: '7px',
 borderRadius: '6px',
 display: 'flex',
 alignItems: 'center',
 justifyContent: 'center',
 marginTop: '2px',
 }}
 >
 <IconComponent size={16} style={{ color: textColor }} />
 </div>
 <div>
 <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px', flexWrap: 'wrap' }}>
 <span className="glass-pill" style={{ color: textColor, borderColor, fontSize: '0.66rem' }}>
 {nudge.badge}
 </span>
 <h4 style={{ fontSize: '0.86rem', fontWeight: 600, color: 'var(--ink)' }}>{nudge.title}</h4>
 </div>
 <p style={{ fontSize: '0.76rem', color: 'var(--slate-light)', lineHeight: 1.45, marginBottom: '5px' }}>
 {nudge.message}
 </p>
 <div
 className="font-mono"
 style={{
 fontSize: '0.72rem',
 color: textColor,
 fontWeight: 500,
 display: 'inline-flex',
 alignItems: 'center',
 gap: '4px',
 }}
 >
 {nudge.actionHint}
 </div>
 </div>
 </div>

 <button
 onClick={() => handleDismiss(nudge.id)}
 title="Dismiss warning"
 style={{
 background: 'transparent',
 border: 'none',
 color: 'var(--slate)',
 cursor: 'pointer',
 padding: '4px',
 borderRadius: '4px',
 lineHeight: 1,
 }}
 >
 <X size={16} />
 </button>
 </div>
 </div>
 );
 })}
 </div>
 );
}
