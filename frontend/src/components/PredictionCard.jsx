/**
 * PredictionCard.jsx — ML direction prediction with Confidence Pulse ring
 *
 * The Confidence Pulse is the signature element of this UI:
 * - The prediction verdict sits inside a thin SVG glass ring
 * - The ring pulses at a rate driven by the stock's ATR (realized volatility)
 * - animation-duration is set via the CSS custom property --pulse-duration:
 * Slow (3s) = sleepy blue-chip low ATR
 * Fast (0.7s) = volatile smallcap high ATR
 * - Under prefers-reduced-motion: static ring + volatility wave icon
 *
 * This is the ONE place in the UI where motion carries real financial
 * information rather than just decoration.
 *
 * Props:
 * - prediction {Object} The primary_prediction object from /api/predict
 * { direction, confidence, probabilities, feature_contributions }
 * - loading {boolean} Show skeleton when true
 * - priceData {Array} Price history — used to calculate ATR for pulse speed
 */

import React, { useMemo } from 'react';
import { TrendingUp, TrendingDown, Minus, Activity, Cpu, Layers, Shield } from 'lucide-react';
import { formatRegimeLabel } from '../utils/sebiFormatter';

// ─── Design tokens ────────────────────────────────────────────────────────────
const COLOR_RALLY = 'var(--rally)';
const COLOR_SELLOFF = 'var(--selloff)';
const COLOR_SLATE = 'var(--slate)';
const COLOR_INK = 'var(--ink)';

// ─── Helpers ──────────────────────────────────────────────────────────────────



/**
 * calculateATRNormalized — estimates normalized ATR from recent price data.
 * Returns a value in [0, 1] where 0 = very low volatility, 1 = extreme.
 * This drives the Confidence Pulse animation speed.
 *
 * @param {Array} priceData - Array of OHLCV rows
 * @returns {number} Normalized ATR between 0 and 1
 */
const calculateATRNormalized = (priceData) => {
 if (!priceData || priceData.length < 5) return 0.3; // Default to moderate volatility

 const recentRows = priceData.slice(-14); // Last 14 candles
 const trueRanges = recentRows.map(row => {
 const high = parseFloat(row.high || row.close);
 const low = parseFloat(row.low || row.close);
 const close = parseFloat(row.close);
 return (high - low) / Math.max(close, 1); // True range as % of close
 });

 const avgTrueRange = trueRanges.reduce((a, b) => a + b, 0) / trueRanges.length;

 // Normalize: 0–1% ATR → low (0); 3%+ ATR → high (1)
 return Math.min(Math.max((avgTrueRange - 0.005) / 0.025, 0), 1);
};

/**
 * getPulseDuration — converts normalized ATR to CSS animation-duration.
 * Slow blue-chip: 3s; Volatile smallcap: 0.7s.
 *
 * @param {number} atrNormalized - Value in [0, 1]
 * @returns {string} CSS duration string, e.g. "1.8s"
 */
const getPulseDuration = (atrNormalized) => {
 const durationSeconds = 3 - atrNormalized * 2.3; // Range: 3s → 0.7s
 return `${durationSeconds.toFixed(2)}s`;
};

// ─── Confidence Pulse Ring ────────────────────────────────────────────────────

/**
 * ConfidencePulseRing — SVG ring that pulses at a volatility-linked speed.
 *
 * The ring sits around the prediction verdict text. Its animation speed is
 * set via the CSS custom property --pulse-duration, which is calculated from
 * the stock's ATR. This is the one animation in the UI that carries real
 * financial information: a user can glance at the ring speed and immediately
 * get a sense of the stock's realized volatility.
 *
 * Under prefers-reduced-motion, the animation is disabled (handled by index.css)
 * and the ring becomes a static decorative element.
 */
const ConfidencePulseRing = ({ ringColor, pulseDuration, confidence, direction, regimeLabel, label }) => {
 const radius = 64; // Ring radius (SVG units)
 const strokeWidth = 2.5; // Ring thickness
 const circumference = 2 * Math.PI * radius;
 // The confidence arc: fills the ring proportional to confidence %
 const arcLength = circumference * (confidence || 0.5);

 return (
 <div
 style={{
 position: 'relative',
 width: '152px',
 height: '152px',
 display: 'flex',
 alignItems: 'center',
 justifyContent: 'center',
 flexShrink: 0,
 }}
 >
 {/* SVG ring — pulses via CSS animation */}
 <svg
 width="152"
 height="152"
 style={{
 position: 'absolute',
 top: 0,
 left: 0,
 // Set the CSS custom property that controls pulse speed
 '--pulse-duration': pulseDuration,
 }}
 className="confidence-ring"
 role="img"
 aria-label={`Confidence ring for ${direction} prediction — ${label} volatility`}
 >
 {/* Background track — always visible, dimmed */}
 <circle
 cx="76" cy="76" r={radius}
 fill="none"
 stroke="rgba(255,255,255,0.07)"
 strokeWidth={strokeWidth}
 />
 {/* Confidence arc — fills proportional to confidence level */}
 <circle
 cx="76" cy="76" r={radius}
 fill="none"
 stroke={ringColor}
 strokeWidth={strokeWidth}
 strokeDasharray={`${arcLength} ${circumference}`}
 strokeDashoffset={circumference / 4} /* Start from top */
 strokeLinecap="round"
 style={{ opacity: 0.85 }}
 />
 </svg>

 {/* Verdict text inside the ring */}
 <div style={{ textAlign: 'center', zIndex: 1 }}>
 <div style={{
 fontFamily: "'Space Grotesk', sans-serif",
 fontSize: '0.85rem',
 fontWeight: 700,
 color: ringColor,
 letterSpacing: '-0.01em',
 lineHeight: 1.1,
 }}>
 {regimeLabel}
 </div>
 <div style={{
 fontFamily: "'IBM Plex Mono', monospace",
 fontSize: '1rem',
 fontWeight: 600,
 color: ringColor,
 fontVariantNumeric: 'tabular-nums',
 marginTop: '2px',
 }}>
 <span
 title="Statistical model confidence — not a price target or investment recommendation"
 style={{ cursor: 'help', borderBottom: '1px dotted var(--slate)' }}
 >
 {Math.round((confidence || 0.5) * 100)}%
 </span>
 </div>
 <div style={{
 fontFamily: "'Space Grotesk', sans-serif",
 fontSize: '0.65rem',
 color: COLOR_SLATE,
 marginTop: '3px',
 textTransform: 'uppercase',
 letterSpacing: '0.05em',
 }}>
 Confidence
 </div>
 </div>
 </div>
 );
};

// ─── Skeleton Loader ──────────────────────────────────────────────────────────

const PredictionCardSkeleton = () => (
 <div className="glass-card skeleton-pulse" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
 <div style={{ height: '20px', width: '50%', background: 'rgba(255,255,255,0.06)', borderRadius: '6px' }} />
 <div style={{ height: '140px', background: 'rgba(255,255,255,0.04)', borderRadius: '12px' }} />
 <div style={{ height: '16px', width: '70%', background: 'rgba(255,255,255,0.04)', borderRadius: '6px' }} />
  <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', fontFamily: "'IBM Plex Mono', monospace", display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px' }}>
    <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#63DC9C', animation: 'pulse 1.2s ease-in-out infinite' }} />
    Training sequence model... (~15s first load)
  </div>
  <style>{`
    @keyframes pulse {
      0% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.5; transform: scale(0.85); }
      100% { opacity: 1; transform: scale(1); }
    }
  `}</style>
 </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PredictionCard({ prediction, loading, priceData }) {

 // Calculate ATR for Confidence Pulse animation speed
 const atrNormalized = useMemo(() => calculateATRNormalized(priceData), [priceData]);
 const pulseDuration = getPulseDuration(atrNormalized);

 // Derive volatility label for aria text
 const volatilityLabel = atrNormalized < 0.3 ? 'low' : atrNormalized < 0.7 ? 'moderate' : 'high';

 if (loading) return <PredictionCardSkeleton />;
 if (!prediction) return null;

 const { direction, confidence, probabilities, feature_contributions = [], model_name } = prediction;
 const { label: regimeLabel, color: ringColor } = formatRegimeLabel(direction);

 return (
 <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

 {/* ── Section Header ───────────────────────────────────────────────── */}
 <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
 <div>
 <h3 style={{
 fontFamily: "'Space Grotesk', sans-serif",
 fontSize: '0.95rem',
 fontWeight: 600,
 color: COLOR_INK,
 }}>
 ML Direction Prediction
 </h3>
 <p style={{ fontSize: '0.72rem', color: COLOR_SLATE, marginTop: '2px', fontFamily: "'IBM Plex Mono', monospace" }}>
 {model_name || 'RandomForest'} · Walk-Forward Validated
 </p>
 </div>
 {/* Volatility indicator — shows pulse speed context */}
 <div style={{
 display: 'flex',
 alignItems: 'center',
 gap: '5px',
 background: 'rgba(201,165,77,0.1)',
 border: '1px solid rgba(201,165,77,0.2)',
 borderRadius: '6px',
 padding: '4px 9px',
 fontSize: '0.7rem',
 color: '#C9A54D',
 fontFamily: "'IBM Plex Mono', monospace",
 }}>
 <Activity size={11} />
 {volatilityLabel} vol
 </div>
 </div>

 {/* ── Confidence Pulse Ring + Feature Attribution ───────────────────── */}
 <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>

 {/* The signature Confidence Pulse element */}
 <ConfidencePulseRing
 ringColor={ringColor}
 pulseDuration={pulseDuration}
 confidence={confidence}
 direction={direction}
 regimeLabel={regimeLabel}
 label={volatilityLabel}
 />

 {/* Right side: probability breakdown + feature attribution */}
 <div style={{ flex: 1, minWidth: '160px', display: 'flex', flexDirection: 'column', gap: '14px' }}>

 {/* Class probability bars — UP / FLAT / DOWN */}
 {probabilities && (
 <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
 {Object.entries(probabilities).map(([dirKey, probValue]) => {
 const { label: probLabel, glyph: probGlyph, color: probBaseColor } = formatRegimeLabel(dirKey);
 const barColor = probBaseColor;
 const probPct = Math.round(probValue * 100);
 const isActive = dirKey === direction;
 return (
 <div key={dirKey} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
 <span style={{ width: '90px', fontSize: '0.7rem', color: isActive ? barColor : COLOR_SLATE, fontFamily: "'IBM Plex Mono', monospace", fontWeight: isActive ? 700 : 400 }}>
 {probGlyph} {probLabel}
 </span>
 <div style={{ flex: 1, background: 'rgba(255,255,255,0.06)', borderRadius: '4px', height: '5px', overflow: 'hidden' }}>
 <div style={{ width: `${probPct}%`, height: '100%', background: barColor, borderRadius: '4px', opacity: isActive ? 1 : 0.4 }} />
 </div>
 <span style={{
 width: '32px',
 textAlign: 'right',
 fontSize: '0.76rem',
 fontFamily: "'IBM Plex Mono', monospace",
 fontVariantNumeric: 'tabular-nums',
 color: isActive ? barColor : COLOR_SLATE,
 fontWeight: isActive ? 700 : 400,
 }}>{probPct}%</span>
 </div>
 );
 })}
 </div>
 )}
 </div>
 </div>

 {/* ── SHAP Feature Attribution ──────────────────────────────────────── */}
 {/*
 Shows the top 3 features driving this prediction in plain English names.
 Bar widths are proportional to importance — never raw feature-column names
 (e.g. "rsi_14" is shown as "RSI (14)").
 */}
 {feature_contributions.length > 0 && (
 <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: '14px' }}>
 <div style={{ fontSize: '0.72rem', color: COLOR_SLATE, marginBottom: '10px', fontFamily: "'Space Grotesk', sans-serif", textTransform: 'uppercase', letterSpacing: '0.05em' }}>
 Top Factors
 </div>
 <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
 {feature_contributions.slice(0, 3).map((factor, index) => (
 <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
 <span style={{ width: '90px', fontSize: '0.76rem', color: COLOR_INK, fontFamily: "'Space Grotesk', sans-serif", flexShrink: 0 }}>
 {factor.feature}
 </span>
 <div style={{ flex: 1, background: 'rgba(255,255,255,0.06)', borderRadius: '3px', height: '5px', overflow: 'hidden' }}>
 <div style={{
 width: `${Math.min(factor.importance_pct * 3, 100)}%`,
 height: '100%',
 background: (factor.impact === 'BULLISH' || factor.impact === 'MOMENTUM UP' || factor.impact === 'UPWARD PATTERN' || factor.impact === 'UP') ? COLOR_RALLY : COLOR_SELLOFF,
 borderRadius: '3px',
 transition: 'width 0.4s ease',
 }} />
 </div>
 <span style={{
 width: '36px',
 textAlign: 'right',
 fontSize: '0.74rem',
 fontFamily: "'IBM Plex Mono', monospace",
 fontVariantNumeric: 'tabular-nums',
 color: (factor.impact === 'BULLISH' || factor.impact === 'MOMENTUM UP' || factor.impact === 'UPWARD PATTERN' || factor.impact === 'UP') ? COLOR_RALLY : COLOR_SELLOFF,
 fontWeight: 600,
 }}>{factor.importance_pct}%</span>
 </div>
 ))}
 </div>
 </div>
 )}

  {/* Parallel Ensemble Stats - Cerqueira et al. 2023 */}
  {prediction.parallel_timing && (
    <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: COLOR_SLATE, fontFamily: "'Space Grotesk', sans-serif", textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        <Cpu size={11} /> Parallel Fold Ensemble
      </div>
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <div style={{ background: 'rgba(99,220,156,0.08)', border: '1px solid rgba(99,220,156,0.2)', borderRadius: '6px', padding: '4px 10px', fontSize: '0.72rem', fontFamily: "'IBM Plex Mono', monospace", color: '#63DC9C' }}>
          {prediction.parallel_timing.speedup_ratio}x faster
        </div>
        <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', padding: '4px 10px', fontSize: '0.72rem', fontFamily: "'IBM Plex Mono', monospace", color: COLOR_INK }}>
          {prediction.parallel_timing.n_folds} folds
        </div>
      </div>
      {prediction.fold_weights && prediction.fold_weights.length > 0 && (
        <div>
          <div style={{ fontSize: '0.68rem', color: COLOR_SLATE, marginBottom: '5px', fontFamily: "'IBM Plex Mono', monospace" }}>fold weights (oldest to newest)</div>
          <div style={{ display: 'flex', gap: '3px', alignItems: 'flex-end', height: '22px' }}>
            {prediction.fold_weights.map((w, i) => (
              <div key={i} style={{ flex: 1, height: String(Math.max(Math.round(w * 100 * 1.8), 4)) + 'px', background: 'rgba(99,220,156,' + String(Math.min(0.3 + w * 2, 1)) + ')', borderRadius: '2px 2px 0 0' }} />
            ))}
          </div>
        </div>
      )}
    </div>
  )}

  {/* HMM Market Regime - Hamilton 1989 */}
  {prediction.regime_state !== undefined && (
    <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.72rem', color: COLOR_SLATE, fontFamily: "'Space Grotesk', sans-serif", flexShrink: 0 }}>
        <Shield size={11} /> Regime
      </div>
      <div style={{ background: prediction.regime_state === 1 ? 'rgba(255,95,87,0.12)' : 'rgba(99,220,156,0.1)', border: '1px solid ' + String(prediction.regime_state === 1 ? 'rgba(255,95,87,0.3)' : 'rgba(99,220,156,0.25)'), borderRadius: '6px', padding: '3px 10px', fontSize: '0.72rem', fontFamily: "'IBM Plex Mono', monospace", color: prediction.regime_state === 1 ? '#FF5F57' : '#63DC9C', fontWeight: 600 }}>
        {prediction.regime_state === 1 ? 'BEAR' : 'BULL'}
      </div>
      {prediction.regime_prob_bear !== undefined && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ flex: 1, background: 'rgba(255,255,255,0.06)', borderRadius: '3px', height: '4px', overflow: 'hidden' }}>
            <div style={{ width: String(Math.round(prediction.regime_prob_bear * 100)) + '%', height: '100%', background: '#FF5F57', borderRadius: '3px' }} />
          </div>
          <span style={{ fontSize: '0.68rem', color: COLOR_SLATE, fontFamily: "'IBM Plex Mono', monospace", flexShrink: 0 }}>{Math.round(prediction.regime_prob_bear * 100)}% bear</span>
        </div>
      )}
    </div>
  )}

  {/* SEBI Compliance Disclaimer */}
  <div style={{
    marginTop: '14px',
    paddingTop: '10px',
    borderTop: '1px solid rgba(255,255,255,0.05)',
    fontSize: '0.65rem',
    color: 'rgba(255,255,255,0.25)',
    fontFamily: "'Space Grotesk', sans-serif",
    letterSpacing: '0.02em',
    lineHeight: 1.5,
    textAlign: 'center',
  }}>
    Statistical regime classification · For education only · Not investment advice
  </div>
 </div>
 );
}
