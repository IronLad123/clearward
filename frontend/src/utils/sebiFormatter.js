/**
 * sebiFormatter.js — SEBI-compliant label formatting for ML regime classifications.
 *
 * Replaces directional 'UP'/'DOWN' prediction language with statistical bias terminology
 * to comply with SEBI Research Analyst Regulations (non-advisory framing).
 *
 * For education only. Not investment advice.
 */

export const formatRegimeLabel = (prediction) => {
 switch (prediction?.toUpperCase()) {
 case 'UP':
 return {
 label: 'POSITIVE BIAS',
 glyph: '\u25b2',
 color: 'var(--rally)',
 bg: 'rgba(61,220,132,0.1)',
 };
 case 'DOWN':
 return {
 label: 'NEGATIVE BIAS',
 glyph: '\u25bc',
 color: 'var(--selloff)',
 bg: 'rgba(255,92,108,0.1)',
 };
 default:
 return {
 label: 'CONSOLIDATION',
 glyph: '\u2014',
 color: 'var(--text-muted, #6B7480)',
 bg: 'rgba(255,255,255,0.05)',
 };
 }
};

export const SEBI_REGIME_DISCLAIMER =
 'Statistical regime classifications derived from quantitative indicators (RSI, MACD, ARIMA). ' +
 'For education only. Not investment advice.';
