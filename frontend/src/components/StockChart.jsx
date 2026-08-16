/**
 * StockChart.jsx — Interactive OHLC candlestick chart with indicator overlays
 *
 * Design spec:
 * - Candlestick bars by default (OHLC data — open/high/low/close all matter)
 * - EMA 20 and EMA 50 as thin Slate-coloured line overlays
 * - Bollinger Bands as a very faint filled area (8% opacity)
 * - RSI and MACD in compact sub-panels below the main chart
 * - A slim floating glass toolbar for indicator toggles (not a legend)
 *
 * Props:
 * - symbol {string} Ticker symbol
 * - priceData {Array} OHLCV rows from price-history API
 * - history {Array} Alias for priceData (backwards-compat)
 * - prediction {Object} ML prediction — shown as an overlay badge
 * - loading {boolean} Shows spinner when true
 *
 * Candlestick rendering approach:
 * We use recharts ComposedChart with a custom Bar shape.
 * The Bar's dataKey is "high", so recharts positions the bar's top at the
 * high price. Inside the custom shape, we use:
 * scaleFactor = height / (high - domainMin)
 * to convert price distances into SVG pixel distances, then draw:
 * - A thin line from high to low (the wick)
 * - A rect from min(open,close) to max(open,close) (the body)
 * Bullish candles (close >= open) are filled --rally green.
 * Bearish candles (close < open) are hollow (fill transparent) with --selloff red outline.
 */

import React, { useState, useMemo } from 'react';
import {
 ComposedChart, Bar, Line, Area,
 XAxis, YAxis, Tooltip, CartesianGrid,
 ResponsiveContainer, ReferenceLine
} from 'recharts';
import { Activity, BarChart2 } from 'lucide-react';
import { formatRegimeLabel } from '../utils/sebiFormatter';

// ─── Design tokens (mirrored from index.css for use in JS) ────────────────────
const COLOR_RALLY = 'var(--rally)';
const COLOR_SELLOFF = 'var(--selloff)';
const COLOR_SLATE = 'var(--slate)';
const COLOR_GOLD = 'var(--signal-gold)';
const COLOR_INK = 'var(--ink)';

// ─── Custom Candlestick Shape ─────────────────────────────────────────────────

/**
 * CandleStickShape — Custom recharts Bar shape that renders OHLC candlesticks.
 *
 * Receives from recharts:
 * - x, y, width, height: SVG bounding box for this bar (dataKey="high")
 * - open, close, high, low: raw price values from the data row
 * - domainMin: the y-axis domain minimum (passed via the Bar data)
 *
 * The key formula:
 * scaleFactor = height / (high - domainMin)
 * This converts a price distance (in rupees/dollars) to SVG pixels,
 * because recharts sets `height` = (high - domainMin) * scale.
 */
const CandleStickShape = (props) => {
 const { x, y, width, height, open, close, high, low, domainMin } = props;

 // Guard against degenerate cases
 if (!height || height <= 0 || high === undefined || low === undefined) return null;

 const isBullish = close >= open;
 const bodyColor = isBullish ? COLOR_RALLY : COLOR_SELLOFF;

 // Scale factor: how many SVG pixels per one unit of price
 // Works because Bar height = (high - domainMin) * scaleFactor
 const scaleFactor = height / Math.max(high - domainMin, 0.001);

 // SVG y-coordinates for each price level
 // Note: y is the TOP of the bar = SVG position of `high`
 const yHigh = y;
 const yLow = y + (high - low) * scaleFactor;
 const yBodyTop = y + (high - Math.max(open, close)) * scaleFactor;
 const yBodyBot = y + (high - Math.min(open, close)) * scaleFactor;
 const bodyHeight = Math.max(yBodyBot - yBodyTop, 1.5);

 const centerX = x + width / 2;
 const bodyLeft = centerX - Math.max((width - 4) / 2, 1);
 const bodyWidth = Math.max(width - 4, 2);

 return (
 <g>
 {/* High-to-Low wick — thin vertical line */}
 <line
 x1={centerX} y1={yHigh}
 x2={centerX} y2={yLow}
 stroke={bodyColor}
 strokeWidth={1.2}
 strokeLinecap="round"
 />
 {/* Open-to-Close body */}
 <rect
 x={bodyLeft}
 y={yBodyTop}
 width={bodyWidth}
 height={bodyHeight}
 fill={isBullish ? bodyColor : 'transparent'}
 stroke={bodyColor}
 strokeWidth={1.2}
 rx={0.5}
 />
 </g>
 );
};

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

/**
 * CandleTooltip — Shows OHLCV data in a glass panel on hover.
 * Numbers displayed in IBM Plex Mono with tabular-nums.
 */
const CandleTooltip = ({ active, payload, label, currencySymbol }) => {
 if (!active || !payload || payload.length === 0) return null;

 const data = payload[0]?.payload;
 if (!data) return null;

 const rows = [
 { label: 'Open', value: data.open, color: COLOR_INK },
 { label: 'High', value: data.high, color: COLOR_RALLY },
 { label: 'Low', value: data.low, color: COLOR_SELLOFF },
 { label: 'Close', value: data.close, color: data.close >= data.open ? COLOR_RALLY : COLOR_SELLOFF },
 ];

 return (
 <div style={{
 background: 'var(--void)',
 border: '1px solid rgba(255,255,255,0.12)',
 borderRadius: '10px',
 padding: '10px 14px',
 fontSize: '0.8rem',
 fontFamily: "'IBM Plex Mono', monospace",
 minWidth: '150px',
 }}>
 <div style={{ color: COLOR_SLATE, marginBottom: '6px', fontFamily: "'Space Grotesk', sans-serif", fontSize: '0.75rem' }}>
 {label}
 </div>
 {rows.map(row => (
 <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', marginBottom: '3px' }}>
 <span style={{ color: COLOR_SLATE }}>{row.label}</span>
 <span style={{ color: row.color, fontWeight: 600 }}>
 {currencySymbol}{Number(row.value).toLocaleString('en-IN')}
 </span>
 </div>
 ))}
 </div>
 );
};

// ─── Indicator Toggle Button ──────────────────────────────────────────────────

const IndicatorToggle = ({ label, active, onClick }) => (
 <button
 onClick={onClick}
 style={{
 padding: '5px 12px',
 borderRadius: '6px',
 fontSize: '0.76rem',
 fontFamily: "'IBM Plex Mono', monospace",
 fontWeight: 500,
 background: active ? 'rgba(201,165,77,0.15)' : 'transparent',
 border: `1px solid ${active ? 'rgba(201,165,77,0.4)' : 'rgba(255,255,255,0.09)'}`,
 color: active ? COLOR_GOLD : COLOR_SLATE,
 cursor: 'pointer',
 transition: 'all 0.15s',
 }}
 >
 {label}
 </button>
);

// ─── Main Component ───────────────────────────────────────────────────────────

export default function StockChart({ symbol, priceData, history, prediction, loading }) {

 // ── Active indicator toggles ──────────────────────────────────────────────
 const [showEMA, setShowEMA] = useState(true);
 const [showBollinger, setShowBollinger] = useState(true);
 const [showRSIPanel, setShowRSIPanel] = useState(false);
 const [showMACDPanel, setShowMACDPanel] = useState(false);

 // Accept either prop name for backwards compatibility
 const rawData = priceData || history || [];

 // ── Precompute chart data and domain ─────────────────────────────────────
 //
 // We calculate the y-axis domain BEFORE rendering so the custom candle
 // shape has access to domainMin (needed for the scaleFactor formula).
 // We also add a formatted displayDate for the XAxis.
 //
 const { chartData, domainMin, domainMax } = useMemo(() => {
 if (!rawData || rawData.length === 0) {
 return { chartData: [], domainMin: 0, domainMax: 100 };
 }

 // Sample every Nth row to avoid overcrowding on small screens
 const sampleRate = rawData.length > 200 ? 2 : 1;
 const sampled = rawData.filter((_, index) => index % sampleRate === 0);

 const allLows = sampled.map(d => parseFloat(d.low || d.close)).filter(Boolean);
 const allHighs = sampled.map(d => parseFloat(d.high || d.close)).filter(Boolean);

 const minPrice = Math.min(...allLows);
 const maxPrice = Math.max(...allHighs);
 const pricePadding = (maxPrice - minPrice) * 0.04; // 4% padding

 const computedDomainMin = minPrice - pricePadding;
 const computedDomainMax = maxPrice + pricePadding;

 const processed = sampled.map(row => ({
 ...row,
 open: parseFloat(row.open || row.close),
 high: parseFloat(row.high || row.close),
 low: parseFloat(row.low || row.close),
 close: parseFloat(row.close),
 volume: parseFloat(row.volume || 0),
 ema_20: row.ema_20 != null ? parseFloat(row.ema_20) : null,
 ema_50: row.ema_50 != null ? parseFloat(row.ema_50) : null,
 bb_upper: row.bb_upper != null ? parseFloat(row.bb_upper) : null,
 bb_lower: row.bb_lower != null ? parseFloat(row.bb_lower) : null,
 rsi_14: row.rsi_14 != null ? parseFloat(row.rsi_14) : null,
 macd_line: row.macd_line != null ? parseFloat(row.macd_line) : null,
 macd_signal: row.macd_signal != null ? parseFloat(row.macd_signal) : null,
 macd_hist: row.macd_hist != null ? parseFloat(row.macd_hist) : null,
 // domainMin injected into each row so the custom candle shape can access it
 domainMin: computedDomainMin,
 // Format date for XAxis display — recharts needs string values, not Date objects
 displayDate: new Date(row.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
 }));

 // Calculate indicators client-side if missing
 const closes = processed.map(r => r.close);
 const calcEMA = (data, period) => {
 const k = 2 / (period + 1);
 let ema = data[0];
 const res = [ema];
 for (let i = 1; i < data.length; i++) {
 ema = data[i] * k + ema * (1 - k);
 res.push(ema);
 }
 return res;
 };

 const ema20Arr = calcEMA(closes, 20);
 const ema50Arr = calcEMA(closes, 50);

 const bbUpperArr = [];
 const bbLowerArr = [];
 for (let i = 0; i < closes.length; i++) {
 if (i < 19) {
 bbUpperArr.push(closes[i]);
 bbLowerArr.push(closes[i]);
 } else {
 const slice = closes.slice(i - 19, i + 1);
 const mean = slice.reduce((a, b) => a + b, 0) / 20;
 const variance = slice.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / 20;
 const std = Math.sqrt(variance);
 bbUpperArr.push(mean + 2 * std);
 bbLowerArr.push(mean - 2 * std);
 }
 }

 const rsiArr = [50];
 let gainSum = 0, lossSum = 0;
 for (let i = 1; i < closes.length; i++) {
 const diff = closes[i] - closes[i - 1];
 const gain = diff > 0 ? diff : 0;
 const loss = diff < 0 ? -diff : 0;
 if (i <= 14) {
 gainSum += gain;
 lossSum += loss;
 if (i === 14) {
 const avgGain = gainSum / 14;
 const avgLoss = lossSum / 14;
 const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
 rsiArr.push(100 - (100 / (1 + rs)));
 } else {
 rsiArr.push(50);
 }
 } else {
 const avgGain = (gainSum * 13 + gain) / 14;
 const avgLoss = (lossSum * 13 + loss) / 14;
 gainSum = avgGain;
 lossSum = avgLoss;
 const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
 rsiArr.push(100 - (100 / (1 + rs)));
 }
 }

 const ema12 = calcEMA(closes, 12);
 const ema26 = calcEMA(closes, 26);
 const macdLineArr = ema12.map((val, idx) => val - ema26[idx]);
 const macdSignalArr = calcEMA(macdLineArr, 9);
 const macdHistArr = macdLineArr.map((val, idx) => val - macdSignalArr[idx]);

 processed.forEach((r, i) => {
 if (r.ema_20 == null) r.ema_20 = roundVal(ema20Arr[i]);
 if (r.ema_50 == null) r.ema_50 = roundVal(ema50Arr[i]);
 if (r.bb_upper == null) r.bb_upper = roundVal(bbUpperArr[i]);
 if (r.bb_lower == null) r.bb_lower = roundVal(bbLowerArr[i]);
 if (r.rsi_14 == null) r.rsi_14 = roundVal(rsiArr[i]);
 if (r.macd_line == null) r.macd_line = roundVal(macdLineArr[i], 4);
 if (r.macd_signal == null) r.macd_signal = roundVal(macdSignalArr[i], 4);
 if (r.macd_hist == null) r.macd_hist = roundVal(macdHistArr[i], 4);
 });

 return { chartData: processed, domainMin: computedDomainMin, domainMax: computedDomainMax };
 }, [rawData]);

 function roundVal(num, decimals = 2) {
 if (num == null || isNaN(num)) return 0;
 return Number(num.toFixed(decimals));
 }

 // ── Loading / empty states ────────────────────────────────────────────────
 if (loading) {
 return (
 <div className="glass-card chart-skeleton" aria-label="Loading price history">
 <div className="chart-skeleton-header">
 <span />
 <span />
 </div>
 <div className="chart-skeleton-plot">
 <div className="chart-skeleton-line line-one" />
 <div className="chart-skeleton-line line-two" />
 <div className="chart-skeleton-bars" />
 </div>
 <div className="chart-skeleton-status">
 <Activity size={15} className="spin" />
 Loading market history...
 </div>
 </div>
 );
 }

 if (!rawData || rawData.length === 0 || chartData.length === 0) {
 return (
 <div className="glass-card" style={{ height: '440px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '12px' }}>
 <BarChart2 size={28} color={COLOR_SLATE} />
 <span style={{ color: COLOR_SLATE, fontSize: '0.85rem', fontFamily: "'IBM Plex Mono', monospace" }}>No price data available</span>
 </div>
 );
 }

 const currencySymbol = (symbol || '').includes('.NS') || (symbol || '').includes('.BO') ? '₹' : '$';

 // ── Derived metrics for the header ───────────────────────────────────────
 const latestCandle = chartData[chartData.length - 1] || {};
 const firstCandle = chartData[0] || {};
 const latestClose = latestCandle.close || 0;
 const openingClose = firstCandle.close || 1;
 const periodChangePct = (((latestClose - openingClose) / openingClose) * 100).toFixed(2);
 const isPriceUp = parseFloat(periodChangePct) >= 0;

 // ── Tick formatter — show only every Nth label to avoid crowding ──────────
 const tickInterval = Math.max(Math.floor(chartData.length / 8), 1);

 return (
 <div className="glass-card" style={{ position: 'relative', overflow: 'hidden' }}>

 {/* ── Chart Header ───────────────────────────────────────────────────── */}
 <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
 <div>
 {/* Ticker symbol in Space Grotesk display font */}
 <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
 <h2 style={{
 fontFamily: "'Space Grotesk', sans-serif",
 fontSize: '1.6rem',
 fontWeight: 700,
 color: COLOR_INK,
 letterSpacing: '-0.02em',
 }}>
 {symbol}
 </h2>
 <span
 className={`glass-pill ${isPriceUp ? 'badge-rally' : 'badge-selloff'}`}
 style={{ fontSize: '0.8rem', fontFamily: "'IBM Plex Mono', monospace", fontVariantNumeric: 'tabular-nums' }}
 >
 {isPriceUp ? '▲' : '▼'} {isPriceUp ? '+' : ''}{periodChangePct}%
 </span>
 </div>

 {/* Latest close price in IBM Plex Mono */}
 <div style={{
 fontFamily: "'IBM Plex Mono', monospace",
 fontSize: '1.9rem',
 fontWeight: 600,
 color: COLOR_INK,
 fontVariantNumeric: 'tabular-nums',
 letterSpacing: '-0.02em',
 marginTop: '2px',
 }}>
 {currencySymbol}{latestClose.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
 </div>
 </div>

 {/* ML prediction badge overlay */}
 {prediction && (() => {
 const { label: regimeLabel, glyph: regimeGlyph, color: regimeColor, bg: regimeBg } = formatRegimeLabel(prediction.direction);
 return (
 <div style={{
 background: regimeBg || 'rgba(107,116,128,0.15)',
 border: `1px solid ${regimeColor}44`,
 borderRadius: '10px',
 padding: '10px 14px',
 textAlign: 'right',
 }}>
 <div style={{ fontSize: '0.7rem', color: COLOR_SLATE, fontFamily: "'Space Grotesk', sans-serif", textTransform: 'uppercase', letterSpacing: '0.05em' }}>
 ML Direction Overlay
 </div>
 <div style={{
 fontFamily: "'Space Grotesk', sans-serif",
 fontWeight: 700,
 fontSize: '0.95rem',
 color: regimeColor,
 }}>
 {regimeGlyph} {regimeLabel} · {Math.round((prediction.confidence || 0.5) * 100)}%
 </div>
 </div>
 );
 })()}
 </div>

 {/* ── Indicator Toggle Toolbar — glass floating strip ────────────────── */}
 <div style={{
 display: 'flex',
 gap: '6px',
 marginBottom: '16px',
 padding: '8px 10px',
 background: 'rgba(255,255,255,0.03)',
 borderRadius: '8px',
 border: '1px solid rgba(255,255,255,0.07)',
 width: 'fit-content',
 flexWrap: 'wrap',
 }}>
 <IndicatorToggle label="EMA 20/50" active={showEMA} onClick={() => setShowEMA(v => !v)} />
 <IndicatorToggle label="Bollinger" active={showBollinger} onClick={() => setShowBollinger(v => !v)} />
 <IndicatorToggle label="RSI Panel" active={showRSIPanel} onClick={() => setShowRSIPanel(v => !v)} />
 <IndicatorToggle label="MACD Panel" active={showMACDPanel} onClick={() => setShowMACDPanel(v => !v)} />
 </div>

 {/* ── Main OHLC Candlestick Chart ─────────────────────────────────────── */}
 <div style={{ width: '100%', height: 268 }}>
 <ResponsiveContainer width="100%" height="100%">
 <ComposedChart data={chartData} margin={{ top: 8, right: 4, left: -10, bottom: 0 }}>
 <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />

 <XAxis
 dataKey="displayDate"
 tick={{ fill: COLOR_SLATE, fontSize: 10, fontFamily: "'IBM Plex Mono', monospace" }}
 tickLine={false}
 axisLine={false}
 interval={tickInterval}
 />

 <YAxis
 domain={[domainMin, domainMax]}
 tick={{ fill: COLOR_SLATE, fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", fontVariantNumeric: 'tabular-nums' }}
 tickLine={false}
 axisLine={false}
 tickFormatter={(value) => `${currencySymbol}${Number(value).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`}
 width={70}
 />

 <Tooltip content={<CandleTooltip currencySymbol={currencySymbol} />} />

 {/* Bollinger Band — faint purple filled area */}
 {showBollinger && (
 <Area
 dataKey="bb_upper"
 fill="rgba(139,92,246,0.08)"
 stroke="#8B5CF6"
 strokeWidth={1}
 strokeDasharray="3 3"
 dot={false}
 activeDot={false}
 legendType="none"
 />
 )}
 {showBollinger && (
 <Area
 dataKey="bb_lower"
 fill="rgba(139,92,246,0.0)"
 stroke="#8B5CF6"
 strokeWidth={1}
 strokeDasharray="3 3"
 dot={false}
 activeDot={false}
 legendType="none"
 />
 )}

 {/* EMA 20 — Gold line */}
 {showEMA && (
 <Line dataKey="ema_20" stroke={COLOR_GOLD} strokeWidth={1.5} dot={false} activeDot={false} legendType="none" />
 )}
 {/* EMA 50 — Cyan line */}
 {showEMA && (
 <Line dataKey="ema_50" stroke="#06B6D4" strokeWidth={1.5} dot={false} activeDot={false} legendType="none" strokeDasharray="4 2" />
 )}

 {/* Candlestick bars */}
 <Bar
 dataKey="high"
 shape={<CandleStickShape />}
 isAnimationActive={false}
 minPointSize={0}
 />
 </ComposedChart>
 </ResponsiveContainer>
 </div>

 {/* ── RSI Sub-Panel ─────────────────────────────────────────────────── */}
 {showRSIPanel && (
 <div style={{ marginTop: '14px', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
 <div style={{ fontSize: '0.72rem', color: COLOR_SLATE, fontFamily: "'IBM Plex Mono', monospace", marginBottom: '6px' }}>RSI (14)</div>
 <div style={{ width: '100%', height: 90 }}>
 <ResponsiveContainer width="100%" height="100%">
 <ComposedChart data={chartData} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
 <YAxis domain={[0, 100]} tick={{ fill: COLOR_SLATE, fontSize: 9, fontFamily: "'IBM Plex Mono', monospace" }} tickLine={false} axisLine={false} width={35} />
 <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
 <ReferenceLine y={70} stroke="rgba(255,92,108,0.4)" strokeDasharray="4 2" />
 <ReferenceLine y={30} stroke="rgba(61,220,132,0.4)" strokeDasharray="4 2" />
 <Line dataKey="rsi_14" stroke={COLOR_GOLD} strokeWidth={1.5} dot={false} activeDot={false} />
 </ComposedChart>
 </ResponsiveContainer>
 </div>
 </div>
 )}

 {/* ── MACD Sub-Panel ────────────────────────────────────────────────── */}
 {showMACDPanel && (
 <div style={{ marginTop: '14px', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
 <div style={{ fontSize: '0.72rem', color: COLOR_SLATE, fontFamily: "'IBM Plex Mono', monospace", marginBottom: '6px' }}>MACD (12, 26, 9)</div>
 <div style={{ width: '100%', height: 90 }}>
 <ResponsiveContainer width="100%" height="100%">
 <ComposedChart data={chartData} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
 <YAxis tick={{ fill: COLOR_SLATE, fontSize: 9, fontFamily: "'IBM Plex Mono', monospace", fontVariantNumeric: 'tabular-nums' }} tickLine={false} axisLine={false} width={40} />
 <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
 <ReferenceLine y={0} stroke="rgba(255,255,255,0.1)" />
 <Bar dataKey="macd_hist" fill={COLOR_SLATE} opacity={0.6} isAnimationActive={false} />
 <Line dataKey="macd_line" stroke="var(--rally)" strokeWidth={1.5} dot={false} activeDot={false} />
 <Line dataKey="macd_signal" stroke="var(--selloff)" strokeWidth={1.2} dot={false} activeDot={false} />
 </ComposedChart>
 </ResponsiveContainer>
 </div>
 </div>
 )}
 </div>
 );
}
