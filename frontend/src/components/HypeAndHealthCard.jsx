/**
 * HypeAndHealthCard.jsx — Hype vs Health Scanner UI Component
 *
 * Features:
 * - Displays composite Hype Score (0-100) and verdict label: SAFE / CAUTION / RED FLAG
 * - Interactive score visual meter bar
 * - Structured factor breakdown table showing metrics and descriptive explanations
 * - Handles promoter pledging stub field gracefully
 * - Compliant: Zero directional signals ('buy/sell', 'bullish/bearish'). Strictly pattern metrics.
 */

import React, { useState, useEffect } from 'react';
import { ShieldAlert, AlertTriangle, CheckCircle, Info, RefreshCw } from 'lucide-react';

const API_BASE_URL = '';

export default function HypeAndHealthCard({ symbol }) {
 const [data, setData] = useState(null);
 const [isLoading, setIsLoading] = useState(true);
 const [error, setError] = useState(null);

 useEffect(() => {
 if (!symbol) return;

 const controller = new AbortController();
 setIsLoading(true);
 setError(null);

 fetch(`${API_BASE_URL}/api/hype-score/${encodeURIComponent(symbol)}`, {
 signal: controller.signal,
 })
 .then((res) => {
 if (!res.ok) {
 throw new Error(`Server returned HTTP ${res.status}`);
 }
 return res.json();
 })
 .then((json) => {
 setData(json);
 setIsLoading(false);
 })
 .catch((err) => {
 if (err.name !== 'AbortError') {
 console.error('Failed to fetch hype score:', err);
 setError('Unable to load hype & pattern metrics. Please try again.');
 setIsLoading(false);
 }
 });

 return () => controller.abort();
 }, [symbol]);

 if (isLoading) {
 return (
 <div className="glass-panel panel-appear skeleton-pulse" style={{ padding: '24px' }}>
 <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
 <RefreshCw className="spin" size={18} style={{ color: 'var(--signal-gold)' }} />
 <span style={{ fontSize: '0.9rem', color: 'var(--slate)' }}>Scanning price-volume patterns for {symbol}...</span>
 </div>
 <div style={{ height: '40px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', marginBottom: '12px' }} />
 <div style={{ height: '120px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }} />
 </div>
 );
 }

 if (error || !data) {
 return (
 <div className="glass-panel panel-appear" style={{ padding: '20px', borderColor: 'rgba(255,92,108,0.3)' }}>
 <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-bearish)' }}>
 <AlertTriangle size={18} />
 <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Hype Score Scanner</span>
 </div>
 <p style={{ fontSize: '0.84rem', color: 'var(--slate-light)', marginTop: '8px' }}>
 {error || 'Data currently unavailable for this ticker.'}
 </p>
 </div>
 );
 }

 const { hype_score, verdict_label, verdict_description, factors, metrics, disclaimer, as_of } = data;

 // Colors based on verdict
 let badgeClass = 'badge-rally';
 let badgeColor = 'var(--rally)';
 let verdictIcon = CheckCircle;

 if (verdict_label === 'RED FLAG') {
 badgeClass = 'badge-selloff';
 badgeColor = 'var(--selloff)';
 verdictIcon = ShieldAlert;
 } else if (verdict_label === 'CAUTION') {
 badgeClass = 'badge-gold';
 badgeColor = 'var(--signal-gold)';
 verdictIcon = AlertTriangle;
 }

 const VerdictIconComponent = verdictIcon;

 return (
 <div className="glass-panel panel-appear" style={{ padding: '24px', marginBottom: '20px' }}>
 {/* Header */}
 <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
 <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
 <ShieldAlert size={20} style={{ color: badgeColor }} />
 <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--ink)' }}>Hype vs. Health Scanner</h3>
 </div>
 <span className="font-mono" style={{ fontSize: '0.75rem', color: 'var(--slate)' }}>
 {as_of ? new Date(as_of).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'Live'}
 </span>
 </div>

 {data.as_of && (
 <div style={{ fontSize: '0.70rem', color: 'var(--slate)', fontFamily: "'IBM Plex Mono', monospace", marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
 <span style={{ opacity: 0.6 }}>DATA AS OF</span>
 <span>{new Date(data.as_of).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true })}</span>
 <span style={{ opacity: 0.4 }}>· cached 6h</span>
 </div>
 )}

 {/* Composite Score Card */}
 <div
 style={{
 background: 'rgba(255, 255, 255, 0.03)',
 border: '1px solid var(--glass-border)',
 borderRadius: '14px',
 padding: '16px 20px',
 marginBottom: '20px',
 }}
 >
 <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
 <div>
 <div style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--slate)' }}>
 Composite Pattern Risk
 </div>
 <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
 <span className={`glass-pill ${badgeClass}`} style={{ fontSize: '0.85rem', padding: '4px 12px' }}>
 <VerdictIconComponent size={14} style={{ display: 'inline', marginRight: '5px', verticalAlign: '-2px' }} />
 {verdict_label}
 </span>
 <span className="font-mono" style={{ fontSize: '1.4rem', fontWeight: 700, color: badgeColor }}>
 {hype_score} <span style={{ fontSize: '0.85rem', color: 'var(--slate)' }}>/ 100</span>
 </span>
 </div>
 </div>

 <div style={{ textAlign: 'right', maxWidth: '300px' }}>
 <p style={{ fontSize: '0.82rem', color: 'var(--slate-light)', lineHeight: 1.4 }}>{verdict_description}</p>
 </div>
 </div>

 {/* Meter Visual Bar */}
 <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', overflow: 'hidden' }}>
 <div
 style={{
 width: `${Math.min(Math.max(hype_score, 5), 100)}%`,
 height: '100%',
 background: badgeColor,
 borderRadius: '4px',
 transition: 'width 0.5s ease-out',
 }}
 />
 </div>
 <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.70rem', color: 'var(--slate)', marginTop: '4px' }}>
 <span>0 (Safe)</span>
 <span>30</span>
 <span>60</span>
 <span>100 (Red Flag)</span>
 </div>
 </div>

 {/* Factor Breakdown Table */}
 <div style={{ marginBottom: '16px' }}>
 <div className="section-label" style={{ marginBottom: '10px' }}>
 Pattern Factor Breakdown
 </div>
 <div style={{ overflowX: 'auto' }}>
 <table className="data-table">
 <thead>
 <tr>
 <th>Factor</th>
 <th>Metric Value</th>
 <th>Risk Points</th>
 <th>Factual Pattern Description</th>
 </tr>
 </thead>
 <tbody>
 {factors &&
 factors.map((factor, idx) => {
 const isStub = factor.status === 'NOT_AVAILABLE_IN_V1';
 const riskPts = factor.risk_points ?? factor.points ?? 0;
 let borderLeft = '3px solid transparent';
 let background = undefined;

 if (riskPts > 15) {
 borderLeft = '3px solid var(--accent-bearish)';
 background = 'color-mix(in srgb, var(--accent-bearish) 5%, transparent)';
 } else if (riskPts > 5) {
 borderLeft = '3px solid var(--signal-gold)';
 background = 'color-mix(in srgb, var(--signal-gold) 5%, transparent)';
 }

 return (
 <tr
 key={idx}
 style={{
 opacity: isStub ? 0.5 : 1,
 borderLeft,
 background,
 }}
 >
 <td style={{ fontWeight: 600, color: 'var(--ink)' }}>{factor.factor_name}</td>
 <td className="font-mono">{factor.value !== null ? factor.value : 'N/A (v1 Stub)'}</td>
 <td className="font-mono" style={{ color: (factor.points ?? factor.risk_points ?? 0) > 0 ? badgeColor : 'var(--slate)' }}>
 +{factor.points ?? factor.risk_points ?? 0} pts
 </td>
 <td style={{ fontSize: '0.82rem', color: 'var(--slate-light)' }}>
 {factor.description}
 {isStub && <span style={{ fontSize: '0.75rem', fontStyle: 'italic', display: 'block', color: 'var(--slate)' }}>Stub field for v2 promoter pledging data pipeline</span>}
 </td>
 </tr>
 );
 })}
 </tbody>
 </table>
 </div>
 </div>
 </div>
 );
}
