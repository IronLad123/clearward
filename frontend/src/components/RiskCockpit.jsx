import React from 'react';
import { Activity, ArrowRight, Clock3, Gauge, ShieldCheck } from 'lucide-react';

function formatInr(value) {
 if (!Number.isFinite(value)) return '—';
 return `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

function getSnapshot(priceHistory = []) {
 const latest = priceHistory[priceHistory.length - 1];
 const fiveDaysAgo = priceHistory.length >= 6 ? priceHistory[priceHistory.length - 6] : null;
 const latestClose = Number(latest?.close);
 const previousClose = Number(fiveDaysAgo?.close);
 return { latestClose, fiveDayReturn: previousClose > 0 ? ((latestClose - previousClose) / previousClose) * 100 : null, hasPriceData: Number.isFinite(latestClose) && latestClose > 0 };
}

export default function RiskCockpit({ activeSymbol, priceHistory, marketContext, isLoading, hasApiError, onNavigate }) {
 const snapshot = getSnapshot(priceHistory);
 const isElevated = Boolean(marketContext?.elevated);
 const hasSurge = Number.isFinite(snapshot.fiveDayReturn) && snapshot.fiveDayReturn >= 15;
 const status = isElevated || hasSurge ? 'CAUTION' : 'OBSERVE';
 const dataLabel = isLoading ? 'Refreshing live inputs' : hasApiError ? 'Using partial data' : snapshot.hasPriceData ? 'Inputs available' : 'Waiting for market data';

 return (
 <section className="risk-cockpit" aria-labelledby="risk-cockpit-title">
 <div className="risk-cockpit-header">
 <div>
 <div className="eyebrow-label"><Gauge size={14} /> MARKET RISK COCKPIT</div>
 <h1 id="risk-cockpit-title">Live risk posture for {activeSymbol}</h1>
 <p>Observable price, volatility, and data quality signals for the current review.</p>
 </div>
 <div className={`cockpit-status cockpit-status-${status === 'CAUTION' ? 'caution' : 'observe'}`}>
 <span className="cockpit-status-dot" /><span>{status}</span><small>{activeSymbol}</small>
 </div>
 </div>
 <div className="cockpit-grid">
 <article className="cockpit-card cockpit-card-primary">
 <div className="cockpit-card-label"><ShieldCheck size={15} /> RISK POSTURE</div>
 <strong>{isElevated ? 'Market volatility is elevated' : hasSurge ? 'Short-term price action is stretched' : 'No immediate alert detected'}</strong>
 <p>{isElevated ? 'India VIX is above the platform caution threshold. Keep the context visible while reviewing individual signals.' : hasSurge ? `${activeSymbol} is up ${snapshot.fiveDayReturn.toFixed(1)}% across the latest five observations. Fast moves deserve a cooling-off check.` : 'This is a descriptive snapshot, not a directional call. Open the evidence cards for the underlying metrics.'}</p>
 <button className="cockpit-link" onClick={() => onNavigate?.('hypeguard')}>Open evidence <ArrowRight size={15} /></button>
 </article>
 <article className="cockpit-card">
 <div className="cockpit-card-label"><Activity size={15} /> PRICE CONTEXT</div>
 <div className="cockpit-value">{formatInr(snapshot.latestClose)}</div>
 <div className={`cockpit-metric ${snapshot.fiveDayReturn >= 0 ? 'metric-positive' : 'metric-negative'}`}>{Number.isFinite(snapshot.fiveDayReturn) ? `${snapshot.fiveDayReturn >= 0 ? '+' : ''}${snapshot.fiveDayReturn.toFixed(1)}%` : '—'} <span>latest 5 observations</span></div>
 <p className="cockpit-muted">Price movement is shown as context, not a prediction.</p>
 </article>
 <article className="cockpit-card">
 <div className="cockpit-card-label"><Clock3 size={15} /> DATA QUALITY</div>
 <div className="cockpit-value cockpit-value-small">{dataLabel}</div>
 <p className="cockpit-muted">{marketContext?.india_vix ? `India VIX: ${Number(marketContext.india_vix).toFixed(1)}` : 'India VIX: unavailable'}</p>
 <button className="cockpit-link" onClick={() => onNavigate?.('doctor')}>Review health & risk <ArrowRight size={15} /></button>
 </article>
 </div>
 <div className="cockpit-footer"><span><span className="cockpit-footer-dot" /> Pattern metrics only</span><span>For education only. Not investment advice.</span></div>
 </section>
 );
}
