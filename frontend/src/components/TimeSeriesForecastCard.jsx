/**
 * TimeSeriesForecastCard.jsx — ClearWard
 * ==========================================
 * Displays an ARIMA/ARMA/AR statistical forecast for a stock ticker.
 *
 * Layout (top to bottom):
 * 1. Header — selected model badge, stationarity badge
 * 2. Forecast Chart — last 30 days history + 5-day confidence cone
 * 3. Forecast Values Table — day-by-day mean & CI range
 * 4. Model Comparison Table — AR(1), AR(2), ARMA(1,1), ARIMA(p,d,q) by AIC
 * 5. Disclaimer Card — mandatory SEBI-compliant warning
 *
 * All output is framed as a "Statistical Confidence Range", NOT a price
 * prediction or investment recommendation.
 */

import React, { useState, useEffect, useCallback } from "react";
import {
 ComposedChart,
 Area,
 Line,
 XAxis,
 YAxis,
 CartesianGrid,
 Tooltip,
 ResponsiveContainer,
 ReferenceLine,
 Legend,
} from "recharts";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

import { BASE_URL } from '../lib/apiClient';
const API_BASE = BASE_URL;

// ─── SUB-COMPONENTS ───────────────────────────────────────────────────────────

/** Coloured pill badge for the selected model name */
function ModelBadge({ label }) {
 return (
 <span
 style={{
 display: "inline-flex",
 alignItems: "center",
 gap: "6px",
 background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
 color: "#fff",
 fontSize: "12px",
 fontWeight: 700,
 padding: "4px 12px",
 borderRadius: "20px",
 letterSpacing: "0.5px",
 }}
 >
 {label}
 </span>
 );
}

/** Stationarity diagnostic badge */
function StationarityBadge({ isStationary, d, pValue }) {
 const colour = isStationary ? "#10b981" : "#f59e0b";
 const label = isStationary
 ? "Series is Stationary (d=0)"
 : `Non-Stationary — Differenced (d=${d})`;

 return (
 <span
 style={{
 display: "inline-flex",
 alignItems: "center",
 gap: "6px",
 background: `${colour}22`,
 border: `1px solid ${colour}55`,
 color: colour,
 fontSize: "11px",
 fontWeight: 600,
 padding: "3px 10px",
 borderRadius: "12px",
 }}
 >
 {label} &nbsp;<span style={{ opacity: 0.7 }}>(ADF p={pValue})</span>
 </span>
 );
}

/** Custom tooltip shown on chart hover */
function ChartTooltip({ active, payload, label }) {
 if (!active || !payload?.length) return null;

 const isHistory = payload.some((p) => p.dataKey === "close");
 const isForecast = payload.some((p) => p.dataKey === "mean");

 return (
 <div
 style={{
 background: "rgba(15,15,25,0.95)",
 border: "1px solid #ffffff22",
 borderRadius: "10px",
 padding: "12px 16px",
 fontSize: "12px",
 color: "#e2e8f0",
 minWidth: "180px",
 backdropFilter: "blur(12px)",
 }}
 >
 <p style={{ fontWeight: 700, marginBottom: "8px", color: "#94a3b8" }}>{label}</p>

 {payload.map((entry) => {
 if (entry.dataKey === "ci_band_95") {
 return (
 <p key="ci95" style={{ color: "#6366f155", margin: "2px 0" }}>
 95% CI: ₹{entry.value?.[0]?.toFixed(2)} – ₹{entry.value?.[1]?.toFixed(2)}
 </p>
 );
 }
 if (entry.dataKey === "ci_band_80") {
 return (
 <p key="ci80" style={{ color: "#818cf8", margin: "2px 0" }}>
 80% CI: ₹{entry.value?.[0]?.toFixed(2)} – ₹{entry.value?.[1]?.toFixed(2)}
 </p>
 );
 }
 if (entry.dataKey === "close") {
 return (
 <p key="close" style={{ color: "#38bdf8", margin: "2px 0" }}>
 Close: ₹{entry.value?.toFixed(2)}
 </p>
 );
 }
 if (entry.dataKey === "mean") {
 return (
 <p key="mean" style={{ color: "#a78bfa", margin: "2px 0", fontWeight: 600 }}>
 Forecast: ₹{entry.value?.toFixed(2)}
 </p>
 );
 }
 return null;
 })}

 {isForecast && (
 <p style={{ color: "#64748b", marginTop: "6px", fontSize: "10px" }}>
 Statistical estimate — not a prediction
 </p>
 )}
 </div>
 );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function TimeSeriesForecastCard({ symbol }) {
 const [data, setData] = useState(null);
 const [loading, setLoading] = useState(false);
 const [error, setError] = useState(null);
 const [forecastDays, setForecastDays] = useState(5);

 const fetchForecast = useCallback(
 async (days, signal) => {
 if (!symbol) return;
 setLoading(true);
 setError(null);

 try {
 const response = await fetch(
 `${API_BASE}/api/stocks/${encodeURIComponent(symbol)}/time-series-forecast?days=${days}`,
 { signal }
 );
 if (!response.ok) {
 const err = await response.json().catch(() => ({}));
 throw new Error(err.detail || `HTTP ${response.status}`);
 }
 const json = await response.json();
 if (!signal.aborted) {
 setData(json);
 }
 } catch (err) {
 if (err.name !== 'AbortError') {
 setError(err.message || "Could not load forecast data.");
 }
 } finally {
 if (!signal.aborted) {
 setLoading(false);
 }
 }
 },
 [symbol]
 );

 useEffect(() => {
 const controller = new AbortController();
 fetchForecast(forecastDays, controller.signal);
 return () => controller.abort();
 }, [symbol, forecastDays, fetchForecast]);

 // ── Build combined chart dataset (history + forecast) ──────────────────────
 const chartData = React.useMemo(() => {
 if (!data) return [];

 const historyPoints = (data.recent_history || []).map((h) => ({
 date: h.date,
 close: h.close,
 mean: null,
 ci_band_80: null,
 ci_band_95: null,
 isHistory: true,
 }));

 // Separator point — connects history to forecast with the last close
 const separator = {
 date: data.recent_history?.at(-1)?.date || "",
 close: data.last_close,
 mean: data.last_close,
 ci_band_80: [data.last_close, data.last_close],
 ci_band_95: [data.last_close, data.last_close],
 isSeparator: true,
 };

 const forecastPoints = (data.forecast || []).map((f) => ({
 date: f.date,
 close: null,
 mean: f.mean,
 ci_band_80: [f.ci_80_lower, f.ci_80_upper],
 ci_band_95: [f.ci_95_lower, f.ci_95_upper],
 isForecast: true,
 }));

 return [...historyPoints, separator, ...forecastPoints];
 }, [data]);

 // ─── Styles ──────────────────────────────────────────────────────────────────

 const cardStyle = {
 background: "rgba(15, 15, 25, 0.8)",
 border: "1px solid rgba(255,255,255,0.08)",
 borderRadius: "20px",
 padding: "28px",
 backdropFilter: "blur(20px)",
 marginTop: "24px",
 };

 const sectionHeadingStyle = {
 fontSize: "13px",
 fontWeight: 700,
 color: "#64748b",
 textTransform: "uppercase",
 letterSpacing: "1.2px",
 marginBottom: "16px",
 marginTop: "24px",
 };

 const tableStyle = {
 width: "100%",
 borderCollapse: "collapse",
 fontSize: "13px",
 };

 const thStyle = {
 padding: "10px 14px",
 background: "rgba(255,255,255,0.04)",
 color: "#64748b",
 fontWeight: 600,
 fontSize: "11px",
 textTransform: "uppercase",
 letterSpacing: "0.8px",
 textAlign: "left",
 borderBottom: "1px solid rgba(255,255,255,0.06)",
 };

 const tdStyle = {
 padding: "10px 14px",
 color: "#e2e8f0",
 borderBottom: "1px solid rgba(255,255,255,0.04)",
 };

 // ─── Render ──────────────────────────────────────────────────────────────────

 return (
 <div style={cardStyle}>
 {/* ── Header ─────────────────────────────────────────────────────────── */}
 <div
 style={{
 display: "flex",
 alignItems: "flex-start",
 justifyContent: "space-between",
 flexWrap: "wrap",
 gap: "12px",
 marginBottom: "20px",
 }}
 >
 <div>
 <h3
 style={{
 margin: "0 0 8px 0",
 fontSize: "18px",
 fontWeight: 700,
 color: "#f1f5f9",
 letterSpacing: "-0.3px",
 }}
 >
 Time Series Statistical Forecast
 </h3>
 <p style={{ margin: 0, fontSize: "13px", color: "#64748b" }}>
 AR · ARMA · ARIMA models — 80% &amp; 95% confidence intervals
 </p>
 </div>

 {/* Forecast horizon selector */}
 <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
 <span style={{ fontSize: "12px", color: "#64748b" }}>Horizon:</span>
 {[3, 5, 7, 10].map((d) => (
 <button
 key={d}
 id={`forecast-days-${d}`}
 onClick={() => setForecastDays(d)}
 style={{
 padding: "5px 12px",
 borderRadius: "10px",
 border: "1px solid",
 borderColor: forecastDays === d ? "#6366f1" : "rgba(255,255,255,0.1)",
 background: forecastDays === d ? "#6366f122" : "transparent",
 color: forecastDays === d ? "#818cf8" : "#94a3b8",
 fontSize: "12px",
 fontWeight: 600,
 cursor: "pointer",
 transition: "all 0.2s",
 }}
 >
 {d}d
 </button>
 ))}
 </div>
 </div>

 {/* ── Loading ─────────────────────────────────────────────────────────── */}
 {loading && (
 <div
 style={{
 textAlign: "center",
 padding: "60px 20px",
 color: "#64748b",
 }}
 >
 <div
 style={{
 width: "36px",
 height: "36px",
 border: "3px solid #1e293b",
 borderTop: "3px solid #6366f1",
 borderRadius: "50%",
 animation: "spin 0.9s linear infinite",
 margin: "0 auto 16px",
 }}
 />
 <p style={{ margin: 0, fontSize: "14px" }}>
 Running ADF stationarity test &amp; ARIMA grid search…
 </p>
 <p style={{ margin: "6px 0 0", fontSize: "12px", color: "#475569" }}>
 Fitting up to 9 candidate models on 1-year price history
 </p>
 <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
 </div>
 )}

 {/* ── Error ───────────────────────────────────────────────────────────── */}
 {error && !loading && (
 <div
 style={{
 background: "#ef444418",
 border: "1px solid #ef444440",
 borderRadius: "12px",
 padding: "16px 20px",
 color: "#f87171",
 fontSize: "14px",
 }}
 >
 {error}
 </div>
 )}

 {/* ── Main Content ─────────────────────────────────────────────────────── */}
 {data && !loading && (
 <>
 {/* Model & Stationarity Badges */}
 <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "24px" }}>
 <ModelBadge label={data.selected_model?.label} />
 <StationarityBadge
 isStationary={data.stationarity?.is_stationary}
 d={data.stationarity?.integration_order_d}
 pValue={data.stationarity?.adf_p_value}
 />
 <span
 style={{
 display: "inline-flex",
 alignItems: "center",
 gap: "6px",
 background: "#0f172a",
 border: "1px solid rgba(255,255,255,0.08)",
 color: "#94a3b8",
 fontSize: "11px",
 padding: "3px 10px",
 borderRadius: "12px",
 }}
 >
 Trained on {data.training_days} trading days &nbsp;·&nbsp; AIC:{" "}
 {data.selected_model?.aic}
 </span>
 </div>

 {/* ── Forecast Chart ────────────────────────────────────────────────── */}
 <p style={sectionHeadingStyle}>Price History + Forecast Confidence Cone</p>

 <div style={{ height: "320px", marginBottom: "8px" }}>
 <ResponsiveContainer width="100%" height="100%">
 <ComposedChart data={chartData} margin={{ top: 8, right: 24, bottom: 8, left: 8 }}>
 <defs>
 <linearGradient id="grad95" x1="0" y1="0" x2="0" y2="1">
 <stop offset="0%" stopColor="#6366f1" stopOpacity={0.12} />
 <stop offset="100%" stopColor="#6366f1" stopOpacity={0.02} />
 </linearGradient>
 <linearGradient id="grad80" x1="0" y1="0" x2="0" y2="1">
 <stop offset="0%" stopColor="#818cf8" stopOpacity={0.25} />
 <stop offset="100%" stopColor="#818cf8" stopOpacity={0.06} />
 </linearGradient>
 </defs>

 <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />

 <XAxis
 dataKey="date"
 tick={{ fill: "#475569", fontSize: 10 }}
 tickLine={false}
 axisLine={{ stroke: "rgba(255,255,255,0.06)" }}
 tickFormatter={(v) => v?.slice(5)} // Show "MM-DD" only
 interval="preserveStartEnd"
 />

 <YAxis
 tick={{ fill: "#475569", fontSize: 10 }}
 tickLine={false}
 axisLine={false}
 tickFormatter={(v) => `₹${v?.toLocaleString("en-IN")}`}
 width={75}
 />

 <Tooltip content={<ChartTooltip />} />

 {/* Vertical separator at "today" */}
 <ReferenceLine
 x={data.recent_history?.at(-1)?.date}
 stroke="#475569"
 strokeDasharray="6 3"
 label={{
 value: "Today",
 fill: "#64748b",
 fontSize: 10,
 position: "insideTopRight",
 }}
 />

 {/* 95% Confidence Band (outer, lighter) */}
 <Area
 type="monotone"
 dataKey="ci_band_95"
 fill="url(#grad95)"
 stroke="none"
 name="95% Confidence Band"
 legendType="none"
 activeDot={false}
 />

 {/* 80% Confidence Band (inner, more visible) */}
 <Area
 type="monotone"
 dataKey="ci_band_80"
 fill="url(#grad80)"
 stroke="#818cf822"
 strokeWidth={1}
 name="80% Confidence Band"
 legendType="none"
 activeDot={false}
 />

 {/* Historical price line */}
 <Line
 type="monotone"
 dataKey="close"
 stroke="#38bdf8"
 strokeWidth={2}
 dot={false}
 name="Historical Close"
 connectNulls={false}
 />

 {/* Forecast mean line (dashed) */}
 <Line
 type="monotone"
 dataKey="mean"
 stroke="#a78bfa"
 strokeWidth={2}
 strokeDasharray="6 4"
 dot={{ fill: "#a78bfa", r: 3, strokeWidth: 0 }}
 name="Forecast Mean"
 connectNulls={false}
 />

 <Legend
 wrapperStyle={{ fontSize: "11px", color: "#64748b", paddingTop: "12px" }}
 />
 </ComposedChart>
 </ResponsiveContainer>
 </div>

 <p
 style={{
 margin: "0 0 24px",
 fontSize: "11px",
 color: "#475569",
 textAlign: "center",
 }}
 >
 Shaded areas = confidence bands (inner = 80%, outer = 95%).
 Bands widen with horizon — the model is being honest about uncertainty.
 </p>

 {/* ── Forecast Values Table ─────────────────────────────────────────── */}
 <p style={sectionHeadingStyle}>Day-by-Day Statistical Range</p>

 <div
 style={{
 borderRadius: "12px",
 overflow: "hidden",
 border: "1px solid rgba(255,255,255,0.06)",
 marginBottom: "24px",
 }}
 >
 <table style={tableStyle}>
 <thead>
 <tr>
 <th style={thStyle}>Day</th>
 <th style={thStyle}>Date</th>
 <th style={thStyle}>Forecast Mean</th>
 <th style={thStyle}>80% CI Range</th>
 <th style={thStyle}>95% CI Range</th>
 </tr>
 </thead>
 <tbody>
 {data.forecast.map((f) => (
 <tr
 key={f.day}
 style={{ transition: "background 0.15s" }}
 onMouseEnter={(e) =>
 (e.currentTarget.style.background = "rgba(99,102,241,0.06)")
 }
 onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
 >
 <td style={{ ...tdStyle, color: "#6366f1", fontWeight: 700 }}>
 Day {f.day}
 </td>
 <td style={{ ...tdStyle, color: "#94a3b8" }}>{f.date}</td>
 <td style={{ ...tdStyle, color: "#a78bfa", fontWeight: 600 }}>
 ₹{f.mean.toLocaleString("en-IN")}
 </td>
 <td style={{ ...tdStyle, color: "#818cf8" }}>
 ₹{f.ci_80_lower.toLocaleString("en-IN")} –{" "}
 ₹{f.ci_80_upper.toLocaleString("en-IN")}
 </td>
 <td style={{ ...tdStyle, color: "#64748b" }}>
 ₹{f.ci_95_lower.toLocaleString("en-IN")} –{" "}
 ₹{f.ci_95_upper.toLocaleString("en-IN")}
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>

 {/* ── Model Comparison Table ────────────────────────────────────────── */}
 <p style={sectionHeadingStyle}>Model Comparison (Lower AIC = Better Fit)</p>

 <div
 style={{
 borderRadius: "12px",
 overflow: "hidden",
 border: "1px solid rgba(255,255,255,0.06)",
 marginBottom: "24px",
 }}
 >
 <table style={tableStyle}>
 <thead>
 <tr>
 <th style={thStyle}>Model</th>
 <th style={thStyle}>p</th>
 <th style={thStyle}>d</th>
 <th style={thStyle}>q</th>
 <th style={thStyle}>AIC Score</th>
 <th style={thStyle}>Status</th>
 </tr>
 </thead>
 <tbody>
 {data.model_comparison.map((m, i) => (
 <tr
 key={i}
 style={{
 background: m.is_selected ? "rgba(99,102,241,0.08)" : "transparent",
 }}
 >
 <td
 style={{
 ...tdStyle,
 fontWeight: m.is_selected ? 700 : 400,
 color: m.is_selected ? "#818cf8" : "#94a3b8",
 }}
 >
 {m.model}
 </td>
 <td style={{ ...tdStyle, color: "#64748b" }}>{m.order?.p}</td>
 <td style={{ ...tdStyle, color: "#64748b" }}>{m.order?.d}</td>
 <td style={{ ...tdStyle, color: "#64748b" }}>{m.order?.q}</td>
 <td
 style={{
 ...tdStyle,
 color: m.is_selected ? "#10b981" : "#e2e8f0",
 fontWeight: m.is_selected ? 700 : 400,
 }}
 >
 {m.aic?.toLocaleString("en-IN")}
 </td>
 <td style={tdStyle}>
 {m.is_selected ? (
 <span
 style={{
 background: "#10b98122",
 color: "#10b981",
 border: "1px solid #10b98140",
 padding: "2px 8px",
 borderRadius: "8px",
 fontSize: "10px",
 fontWeight: 700,
 }}
 >
 SELECTED
 </span>
 ) : (
 <span style={{ color: "#475569", fontSize: "11px" }}>—</span>
 )}
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </>
 )}
 </div>
 );
}
