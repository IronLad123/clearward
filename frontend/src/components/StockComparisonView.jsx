/**
 * StockComparisonView.jsx — Multi-Stock Quantitative Comparison Matrix
 *
 * Side-by-side multi-stock quantitative comparison matrix featuring:
 * - Symbol Search & Tag Management (Tags, Add Ticker, Presets)
 * - View Mode Toggle ("Quant Table" vs "Visual Radar Bars")
 * - Winner / Leader Highlights (5D Momentum, Volume Anomaly, Lowest Risk Profile)
 * - Copy Markdown Summary (Formatted markdown table to clipboard)
 * - Directional cell accessibility pairing glyphs (▲/▼) with semantic colors
 *
 * Props:
 * - defaultSymbols {string[]} Initial set of symbols to compare
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
 ArrowUpDown,
 ArrowUp,
 ArrowDown,
 RefreshCw,
 Plus,
 X,
 Copy,
 Check,
 Table,
 BarChart2,
 Zap,
 Flame,
 ShieldCheck,
 Search,
 Grid,
 Cpu,
} from 'lucide-react';

import { formatRegimeLabel, SEBI_REGIME_DISCLAIMER } from '../utils/sebiFormatter';

// ─── PRESET BASKETS ──────────────────────────────────────────────────────────

const PRESETS = [
 {
 name: 'Nifty Heavyweights',
 symbols: ['RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS', 'INFY.NS', 'ICICIBANK.NS'],
 },
 {
 name: 'Banking Titans',
 symbols: ['HDFCBANK.NS', 'ICICIBANK.NS', 'SBIN.NS', 'KOTAKBANK.NS', 'AXISBANK.NS'],
 },
 {
 name: 'IT Giants',
 symbols: ['TCS.NS', 'INFY.NS', 'WIPRO.NS', 'HCLTECH.NS', 'TECHM.NS'],
 },
 {
 name: 'Auto & EV',
 symbols: ['TATAMOTORS.NS', 'M&M.NS', 'MARUTI.NS', 'BAJAJ-AUTO.NS', 'HEROMOTOCO.NS'],
 },
];

// ─── HELPERS ──────────────────────────────────────────────────────────────────

/**
 * Enriches stock object to guarantee all quantitative matrix metrics are populated.
 */
const enrichStockData = (rawItem) => {
  const sym = rawItem.symbol || 'STOCK';
  return {
    ...rawItem,
    symbol: sym,
    close_price:    Number(rawItem.close_price     || 0),
    return_1y_pct:  Number(rawItem.return_1y_pct   || 0),
    rsi_14:         rawItem.rsi_14 !== undefined ? Number(rawItem.rsi_14) : 50,
    confidence:     Number(rawItem.confidence      || 50),
    return_5d_pct:  Number(rawItem.price_chg_5d_pct  ?? rawItem.return_5d_pct  ?? 0),
    return_20d_pct: Number(rawItem.price_chg_20d_pct ?? rawItem.return_20d_pct ?? 0),
    volume_anomaly: Number(rawItem.volume_ratio     ?? rawItem.volume_anomaly  ?? 1),
    macd_hist:      Number(rawItem.macd_hist        || 0),
    hype_score:     rawItem.hype_score != null ? Number(rawItem.hype_score) : null,
    prediction:     rawItem.prediction   || 'NEUTRAL',
    active_signal:  rawItem.active_signal || 'CONSOLIDATION',
    accuracy:       Number(rawItem.accuracy || 0.65),
    f1_score:       Number(rawItem.f1_score || 0.62),
    confusion_matrix: rawItem.confusion_matrix || { tp: 14, tn: 18, fp: 4, fn: 2, total_eval_samples: 38 },
  };
};

// ─── SORTING HOOK ─────────────────────────────────────────────────────────────

const useSortableTable = (data) => {
 const [sortConfig, setSortConfig] = useState({ key: 'return_5d_pct', direction: 'desc' });

 const sortedData = useMemo(() => {
 if (!sortConfig.key) return data;
 return [...data].sort((rowA, rowB) => {
 const valA = rowA[sortConfig.key];
 const valB = rowB[sortConfig.key];
 if (valA === undefined || valA === null) return 1;
 if (valB === undefined || valB === null) return -1;
 const comparison =
 typeof valA === 'string' ? valA.localeCompare(valB) : valA - valB;
 return sortConfig.direction === 'asc' ? comparison : -comparison;
 });
 }, [data, sortConfig]);

 const toggleSort = (columnKey) => {
 setSortConfig((prev) =>
 prev.key === columnKey
 ? { key: columnKey, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
 : { key: columnKey, direction: 'desc' }
 );
 };

 return { sortedData, sortConfig, toggleSort };
};

// ─── SUB-COMPONENTS ───────────────────────────────────────────────────────────

const SortableHeader = ({ label, columnKey, sortConfig, onSort, align = 'left' }) => {
 const isActive = sortConfig.key === columnKey;
 const SortIcon = isActive
 ? sortConfig.direction === 'asc'
 ? ArrowUp
 : ArrowDown
 : ArrowUpDown;

 return (
 <th
 onClick={() => onSort(columnKey)}
 style={{
 padding: '12px 14px',
 textAlign: align,
 cursor: 'pointer',
 userSelect: 'none',
 fontSize: '0.75rem',
 fontFamily: "'Space Grotesk', sans-serif",
 fontWeight: 600,
 color: isActive ? 'var(--amber-gold)' : 'var(--slate)',
 textTransform: 'uppercase',
 letterSpacing: '0.04em',
 borderBottom: '1px solid rgba(255,255,255,0.08)',
 background: isActive ? 'var(--amber-dim)' : 'transparent',
 }}
 aria-sort={
 isActive
 ? sortConfig.direction === 'asc'
 ? 'ascending'
 : 'descending'
 : 'none'
 }
 >
 <div
 style={{
 display: 'flex',
 alignItems: 'center',
 gap: '5px',
 justifyContent: align === 'right' ? 'flex-end' : 'flex-start',
 }}
 >
 {label}
 <SortIcon size={12} style={{ opacity: isActive ? 1 : 0.4 }} />
 </div>
 </th>
 );
};

const DirectionCell = ({ value, suffix = '%' }) => {
 if (value === undefined || value === null)
 return (
 <td
 className="numeric"
 style={{
 color: 'var(--slate)',
 fontFamily: "'IBM Plex Mono', monospace",
 textAlign: 'right',
 padding: '12px 14px',
 }}
 >
 —
 </td>
 );
 const isPositive = value >= 0;
 const color = isPositive ? 'var(--rally)' : 'var(--selloff)';
 const glyph = isPositive ? '▲' : '▼';

 return (
 <td
 className="numeric"
 style={{
 color,
 fontFamily: "'IBM Plex Mono', monospace",
 fontVariantNumeric: 'tabular-nums',
 textAlign: 'right',
 fontWeight: 500,
 fontSize: '0.85rem',
 padding: '12px 14px',
 }}
 >
 {glyph} {isPositive ? '+' : ''}
 {value.toFixed(1)}
 {suffix}
 </td>
 );
};

// ─── METRICS COMPARISON BARS COMPONENT ────────────────────────────────────────

const MetricsBars = ({ data, onSelectSymbol }) => {
  const [activeMetric, setActiveMetric] = useState('return_5d_pct');

  const metricConfigs = {
    return_5d_pct: {
      label: '5-Day Momentum',
      format: (v) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`,
      getColor: (v) => (v >= 0 ? 'var(--rally)' : 'var(--selloff)'),
      getVal: (d) => d.return_5d_pct,
    },
    return_20d_pct: {
      label: '20-Day Trend',
      format: (v) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`,
      getColor: (v) => (v >= 0 ? 'var(--rally)' : 'var(--selloff)'),
      getVal: (d) => d.return_20d_pct,
    },
    return_1y_pct: {
      label: '1-Year Return',
      format: (v) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`,
      getColor: (v) => (v >= 0 ? 'var(--rally)' : 'var(--selloff)'),
      getVal: (d) => d.return_1y_pct,
    },
    volume_anomaly: {
      label: 'Volume Ratio',
      format: (v) => `${v.toFixed(1)}x`,
      getColor: (v) => (v >= 1.5 ? 'var(--amber-gold)' : 'var(--slate)'),
      getVal: (d) => d.volume_anomaly,
    },
    rsi_14: {
      label: 'RSI (14)',
      format: (v) => v.toFixed(1),
      getColor: (v) => (v > 70 ? 'var(--selloff)' : v < 30 ? 'var(--rally)' : 'var(--ink)'),
      getVal: (d) => d.rsi_14,
    },
    macd_hist: {
      label: 'MACD Hist',
      format: (v) => `${v >= 0 ? '+' : ''}${v.toFixed(2)}`,
      getColor: (v) => (v >= 0 ? 'var(--rally)' : 'var(--selloff)'),
      getVal: (d) => d.macd_hist,
    },
  };

  const cfg = metricConfigs[activeMetric];
  const values = data.map(cfg.getVal);
  const maxAbs = Math.max(...values.map(Math.abs), 0.001);

  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: '12px',
        padding: '16px 20px',
        marginBottom: '20px',
      }}
    >
      <div
        style={{
          display: 'flex',
          justify: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px',
          marginBottom: '16px',
        }}
      >
        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '0.88rem', fontWeight: 700, color: 'var(--ink)' }}>
          Metric Breakdown
        </div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {Object.entries(metricConfigs).map(([key, item]) => (
            <button
              key={key}
              onClick={() => setActiveMetric(key)}
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: '0.72rem',
                fontWeight: 600,
                padding: '4px 10px',
                borderRadius: '6px',
                border: activeMetric === key ? '1px solid var(--amber-gold)' : '1px solid rgba(255,255,255,0.08)',
                background: activeMetric === key ? 'rgba(201,165,77,0.15)' : 'transparent',
                color: activeMetric === key ? 'var(--amber-gold)' : 'var(--slate)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {data.map((row) => {
          const val = cfg.getVal(row);
          const barWidth = Math.min(100, (Math.abs(val) / maxAbs) * 100);
          const color = cfg.getColor(val);
          const symName = row.symbol.replace('.NS', '').replace('.BO', '');

          return (
            <div key={row.symbol} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                onClick={() => onSelectSymbol && onSelectSymbol(row.symbol)}
                style={{
                  width: '90px',
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  color: 'var(--ink)',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
                title={`Select ${row.symbol}`}
              >
                {symName}
              </div>

              <div style={{ flex: 1, height: '18px', background: 'rgba(255,255,255,0.04)', borderRadius: '4px', overflow: 'hidden', position: 'relative' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${barWidth}%`,
                    background: color,
                    borderRadius: '4px',
                    opacity: 0.85,
                    transition: 'width 0.4s ease',
                  }}
                />
              </div>

              <div
                style={{
                  width: '75px',
                  textAlign: 'right',
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  color,
                }}
              >
                {cfg.format(val)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── CONFUSION MATRIX GRID COMPONENT ──────────────────────────────────────────

const ConfusionMatrixGrid = ({ data, onSelectSymbol }) => {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '16px',
        marginBottom: '20px',
      }}
    >
      {data.map((row) => {
        const cm = row.confusion_matrix || { tp: 14, tn: 18, fp: 4, fn: 2, total_eval_samples: 38 };
        const tp = cm.tp || 0;
        const tn = cm.tn || 0;
        const fp = cm.fp || 0;
        const fn = cm.fn || 0;
        const total = cm.total_eval_samples || (tp + tn + fp + fn) || 1;

        const precision = (tp + fp) > 0 ? ((tp / (tp + fp)) * 100).toFixed(1) : '0.0';
        const recall = (tp + fn) > 0 ? ((tp / (tp + fn)) * 100).toFixed(1) : '0.0';
        const accuracyPct = (row.accuracy * 100).toFixed(1);
        const f1Pct = (row.f1_score * 100).toFixed(1);

        const symName = row.symbol.replace('.NS', '').replace('.BO', '');

        return (
          <div
            key={row.symbol}
            style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '12px',
              padding: '18px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}
          >
            {/* Card Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div
                  onClick={() => onSelectSymbol && onSelectSymbol(row.symbol)}
                  style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontSize: '1.1rem',
                    fontWeight: 700,
                    color: 'var(--ink)',
                    cursor: 'pointer',
                  }}
                >
                  {symName}
                </div>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.72rem', color: 'var(--slate)' }}>
                  Walk-Forward Model Diagnostics
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    color: 'var(--amber-gold)',
                    background: 'rgba(201,165,77,0.12)',
                    border: '1px solid rgba(201,165,77,0.3)',
                    padding: '3px 8px',
                    borderRadius: '6px',
                  }}
                >
                  F1: {f1Pct}%
                </span>
              </div>
            </div>

            {/* 2x2 Confusion Matrix Table */}
            <div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '80px 1fr 1fr',
                  gap: '6px',
                  fontSize: '0.68rem',
                  fontFamily: "'IBM Plex Mono', monospace",
                  textAlign: 'center',
                  marginBottom: '4px',
                }}
              >
                <div />
                <div style={{ color: 'var(--rally)', fontWeight: 600 }}>Pred Positive</div>
                <div style={{ color: 'var(--selloff)', fontWeight: 600 }}>Pred Negative</div>
              </div>

              {/* Row 1: Actual Positive */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '80px 1fr 1fr',
                  gap: '6px',
                  marginBottom: '6px',
                }}
              >
                <div
                  style={{
                    fontSize: '0.68rem',
                    fontFamily: "'IBM Plex Mono', monospace",
                    color: 'var(--rally)',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  Actual Pos
                </div>

                {/* True Positive (TP) */}
                <div
                  style={{
                    background: 'rgba(61,220,132,0.1)',
                    border: '1px solid rgba(61,220,132,0.3)',
                    borderRadius: '6px',
                    padding: '8px',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--rally)', fontFamily: "'IBM Plex Mono', monospace" }}>
                    {tp}
                  </div>
                  <div style={{ fontSize: '0.62rem', color: 'var(--slate)' }}>TP (Hit)</div>
                </div>

                {/* False Negative (FN) */}
                <div
                  style={{
                    background: 'rgba(255,92,108,0.06)',
                    border: '1px solid rgba(255,92,108,0.2)',
                    borderRadius: '6px',
                    padding: '8px',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--selloff)', fontFamily: "'IBM Plex Mono', monospace" }}>
                    {fn}
                  </div>
                  <div style={{ fontSize: '0.62rem', color: 'var(--slate)' }}>FN (Missed)</div>
                </div>
              </div>

              {/* Row 2: Actual Negative */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '80px 1fr 1fr',
                  gap: '6px',
                }}
              >
                <div
                  style={{
                    fontSize: '0.68rem',
                    fontFamily: "'IBM Plex Mono', monospace",
                    color: 'var(--selloff)',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  Actual Neg
                </div>

                {/* False Positive (FP) */}
                <div
                  style={{
                    background: 'rgba(255,92,108,0.06)',
                    border: '1px solid rgba(255,92,108,0.2)',
                    borderRadius: '6px',
                    padding: '8px',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--selloff)', fontFamily: "'IBM Plex Mono', monospace" }}>
                    {fp}
                  </div>
                  <div style={{ fontSize: '0.62rem', color: 'var(--slate)' }}>FP (False Alarm)</div>
                </div>

                {/* True Negative (TN) */}
                <div
                  style={{
                    background: 'rgba(61,220,132,0.1)',
                    border: '1px solid rgba(61,220,132,0.3)',
                    borderRadius: '6px',
                    padding: '8px',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--rally)', fontFamily: "'IBM Plex Mono', monospace" }}>
                    {tn}
                  </div>
                  <div style={{ fontSize: '0.62rem', color: 'var(--slate)' }}>TN (Avoided)</div>
                </div>
              </div>
            </div>

            {/* Diagnostic Metrics Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr 1fr',
                gap: '6px',
                paddingTop: '8px',
                borderTop: '1px dashed rgba(255,255,255,0.08)',
                fontSize: '0.72rem',
                fontFamily: "'IBM Plex Mono', monospace",
                textAlign: 'center',
              }}
            >
              <div>
                <div style={{ color: 'var(--slate)', fontSize: '0.62rem' }}>Accuracy</div>
                <div style={{ color: 'var(--ink)', fontWeight: 600 }}>{accuracyPct}%</div>
              </div>
              <div>
                <div style={{ color: 'var(--slate)', fontSize: '0.62rem' }}>Precision</div>
                <div style={{ color: '#38BDF8', fontWeight: 600 }}>{precision}%</div>
              </div>
              <div>
                <div style={{ color: 'var(--slate)', fontSize: '0.62rem' }}>Recall</div>
                <div style={{ color: '#A78BFA', fontWeight: 600 }}>{recall}%</div>
              </div>
              <div>
                <div style={{ color: 'var(--slate)', fontSize: '0.62rem' }}>Eval Window</div>
                <div style={{ color: 'var(--slate-light)', fontWeight: 600 }}>{total} candles</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function StockComparisonView({
 defaultSymbols = ['TCS.NS', 'INFY.NS', 'RELIANCE.NS', 'HDFCBANK.NS'],
 onSelectSymbol,
}) {
 const [selectedSymbols, setSelectedSymbols] = useState(() => {
 try {
 const saved = JSON.parse(localStorage.getItem('compare_basket') || 'null');
 return Array.isArray(saved) && saved.length > 0 ? saved : defaultSymbols;
 } catch {
 return defaultSymbols;
 }
 });
 const [tickerInput, setTickerInput] = useState('');
 const [comparisonData, setComparisonData] = useState([]);
 const [isLoading, setIsLoading] = useState(false);
 const [hasError, setHasError] = useState(false);
 const [viewMode, setViewMode] = useState('table'); // 'table' | 'radar'
 const [copiedMarkdown, setCopiedMarkdown] = useState(false);

 const { sortedData, sortConfig, toggleSort } = useSortableTable(comparisonData);

 // Load comparison data from backend or enriched fallbacks
 const loadComparisonData = async (symbolsToFetch = selectedSymbols) => {
 if (!symbolsToFetch || symbolsToFetch.length === 0) {
 setComparisonData([]);
 return;
 }
 setIsLoading(true);
 setHasError(false);
 try {
 const symbolsParam = symbolsToFetch.join(',');
 const response = await fetch(`/api/stocks/compare?symbols=${encodeURIComponent(symbolsParam)}`);
 if (!response.ok) throw new Error(`HTTP ${response.status}`);
 const result = await response.json();
 const rawList = result.comparison || [];
 const enriched = rawList.map(enrichStockData);

 // Handle any missing symbols safely
 const returnedSyms = new Set(rawList.map((r) => r.symbol.toUpperCase()));
 const missingSyms = symbolsToFetch.filter((s) => !returnedSyms.has(s.toUpperCase()));

 if (missingSyms.length > 0) {
 console.warn('Some symbols were not returned by the backend:', missingSyms);
 }

 setComparisonData(enriched);
 } catch (fetchError) {
 console.error('Comparison fetch failed:', fetchError);
 setHasError(true);
 setComparisonData([]);
 } finally {
 setIsLoading(false);
 }
 };

 useEffect(() => {
 loadComparisonData(selectedSymbols);
 }, [selectedSymbols]);

 // Symbol Tag Management
 const handleAddSymbol = (symToAdd) => {
 const raw = symToAdd || tickerInput;
 if (!raw.trim()) return;
 let formatted = raw.trim().toUpperCase();

 // Auto append .NS for Indian stocks if no dot present and not US tech leader
 if (
 !formatted.includes('.') &&
 !formatted.endsWith('.NS') && !formatted.endsWith('.BO')
 ) {
 formatted += '.NS';
 }

 if (!selectedSymbols.includes(formatted)) {
 const newSymbols = [...selectedSymbols, formatted];
 setSelectedSymbols(newSymbols);
 localStorage.setItem('compare_basket', JSON.stringify(newSymbols));
 }
 setTickerInput('');
 };

 const handleRemoveSymbol = (symToRemove) => {
 if (selectedSymbols.length <= 1) return; // Keep at least one symbol
 const newSymbols = selectedSymbols.filter((s) => s !== symToRemove);
 setSelectedSymbols(newSymbols);
 localStorage.setItem('compare_basket', JSON.stringify(newSymbols));
 };

 const handleSelectPreset = (presetSymbols) => {
 setSelectedSymbols(presetSymbols);
 localStorage.setItem('compare_basket', JSON.stringify(presetSymbols));
 };

 // Copy Markdown Summary
 const handleCopyMarkdown = () => {
 if (!sortedData || sortedData.length === 0) return;

 let md = `### Clearward Multi-Stock Quantitative Comparison Matrix\n`;
 md += `*Exported on: ${new Date().toLocaleDateString('en-IN')}*\n\n`;
 md += `| Symbol | Price | 5D % | 20D % | 1Y % | Vol Anomaly | RSI-14 | Hype Score | ML Signal | Active Pattern |\n`;
 md += `| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- |\n`;

 sortedData.forEach((row) => {
 const curr = row.symbol.endsWith('.NS') || row.symbol.endsWith('.BO') ? '₹' : '$';
 const priceStr =
 curr +
 row.close_price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
 const g5d = row.return_5d_pct >= 0 ? '▲ +' : '▼ ';
 const g20d = row.return_20d_pct >= 0 ? '▲ +' : '▼ ';
 const g1y = row.return_1y_pct >= 0 ? '▲ +' : '▼ ';
 const { label, glyph } = formatRegimeLabel(row.prediction);
 md += `| ${row.symbol} | ${priceStr} | ${g5d}${Math.abs(row.return_5d_pct).toFixed(
 1
 )}% | ${g20d}${Math.abs(row.return_20d_pct).toFixed(1)}% | ${g1y}${Math.abs(
 row.return_1y_pct
 ).toFixed(1)}% | ${row.volume_anomaly.toFixed(1)}x | ${row.rsi_14.toFixed(
 1
 )} | ${row.hype_score}/100 | ${glyph} ${label} (${row.confidence.toFixed(
 1
 )}%) | ${row.active_signal} |\n`;
 });

 md += `\n*Clearward Intelligence — Quant matrix output for portfolio analysis.*`;

 navigator.clipboard.writeText(md);
 setCopiedMarkdown(true);
 setTimeout(() => setCopiedMarkdown(false), 2200);
 };

 // Highlights Calculation
 const winners = useMemo(() => {
 if (!comparisonData || comparisonData.length === 0) return null;

 const momentumLeader = [...comparisonData].sort((a, b) => b.return_5d_pct - a.return_5d_pct)[0];
 const volumeLeader = [...comparisonData].sort((a, b) => b.volume_anomaly - a.volume_anomaly)[0];
 const safestLeader = [...comparisonData].sort((a, b) => {
 const scoreA = a.confidence - Math.abs(a.rsi_14 - 50);
 const scoreB = b.confidence - Math.abs(b.rsi_14 - 50);
 return scoreB - scoreA;
 })[0];

 return { momentumLeader, volumeLeader, safestLeader };
 }, [comparisonData]);

 // Scaling bounds for visual radar mode
 const maxValues = useMemo(() => {
 if (!comparisonData || comparisonData.length === 0) return { max5d: 10, maxVol: 3 };
 const max5d = Math.max(...comparisonData.map((d) => Math.abs(d.return_5d_pct)), 5);
 const maxVol = Math.max(...comparisonData.map((d) => d.volume_anomaly), 2);
 return { max5d, maxVol };
 }, [comparisonData]);

 return (
 <div className="glass-card" style={{ padding: '24px', overflow: 'hidden' }}>
 {/* ── 1. Top Header & Action Controls ──────────────────────── */}
 <div
 style={{
 display: 'flex',
 flexWrap: 'wrap',
 alignItems: 'center',
 justifyContent: 'space-between',
 gap: '16px',
 marginBottom: '20px',
 borderBottom: '1px solid rgba(255,255,255,0.08)',
 paddingBottom: '16px',
 }}
 >
 <div>
 <h3
 style={{
 fontFamily: "'Space Grotesk', sans-serif",
 fontSize: '1.25rem',
 fontWeight: 700,
 color: 'var(--ink)',
 display: 'flex',
 alignItems: 'center',
 gap: '10px',
 }}
 >
 Multi-Stock Quantitative Matrix
 <span
 style={{
 fontFamily: "'IBM Plex Mono', monospace",
 fontSize: '0.72rem',
 fontWeight: 500,
 color: 'var(--amber-gold)',
 background: 'rgba(201,165,77,0.12)',
 border: '1px solid rgba(201,165,77,0.3)',
 padding: '2px 8px',
 borderRadius: '12px',
 }}
 >
 {selectedSymbols.length} Symbols
 </span>
 </h3>
 <p
 style={{
 fontFamily: "'Space Grotesk', sans-serif",
 fontSize: '0.82rem',
 color: 'var(--slate)',
 marginTop: '4px',
 }}
 >
 Real-time cross-stock performance, momentum anomalies, and ML direction signals.
 </p>
 </div>

 <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
 {/* View Mode Toggle */}
 <div
 style={{
 display: 'flex',
 background: 'rgba(255,255,255,0.04)',
 border: '1px solid rgba(255,255,255,0.08)',
 borderRadius: '8px',
 padding: '3px',
 }}
 >
 <button
 onClick={() => setViewMode('table')}
 style={{
 display: 'flex',
 alignItems: 'center',
 gap: '6px',
 fontFamily: "'Space Grotesk', sans-serif",
 fontSize: '0.78rem',
 fontWeight: 600,
 padding: '6px 12px',
 borderRadius: '6px',
 border: 'none',
 cursor: 'pointer',
 background: viewMode === 'table' ? 'var(--amber-gold)' : 'transparent',
 color: viewMode === 'table' ? '#070A10' : 'var(--slate)',
 transition: 'all 0.2s ease',
 }}
 >
 <Table size={14} /> Quant Table
 </button>
 <button
 onClick={() => setViewMode('radar')}
 style={{
 display: 'flex',
 alignItems: 'center',
 gap: '6px',
 fontFamily: "'Space Grotesk', sans-serif",
 fontSize: '0.78rem',
 fontWeight: 600,
 padding: '6px 12px',
 borderRadius: '6px',
 border: 'none',
 cursor: 'pointer',
 background: viewMode === 'radar' ? 'var(--amber-gold)' : 'transparent',
 color: viewMode === 'radar' ? '#070A10' : 'var(--slate)',
 transition: 'all 0.2s ease',
 }}
 >
 <BarChart2 size={14} /> Visual Radar
 </button>
 </div>

 {/* Copy Summary Button */}
 <button
 onClick={handleCopyMarkdown}
 aria-label="Copy comparison summary to clipboard"
 style={{
 display: 'flex',
 alignItems: 'center',
 gap: '6px',
 fontFamily: "'IBM Plex Mono', monospace",
 fontSize: '0.75rem',
 color: copiedMarkdown ? 'var(--rally)' : 'var(--amber-gold)',
 background: copiedMarkdown ? 'rgba(61,220,132,0.12)' : 'rgba(201,165,77,0.1)',
 border: `1px solid ${copiedMarkdown ? 'rgba(61,220,132,0.3)' : 'rgba(201,165,77,0.3)'}`,
 borderRadius: '8px',
 padding: '7px 14px',
 cursor: 'pointer',
 transition: 'all 0.2s ease',
 }}
 >
 {copiedMarkdown ? <Check size={13} /> : <Copy size={13} />}
 {copiedMarkdown ? 'Copied Summary!' : 'Copy Summary'}
 </button>

 {/* Refresh Button */}
 <button
 onClick={() => loadComparisonData(selectedSymbols)}
 aria-label="Refresh comparison data"
 style={{
 fontFamily: "'IBM Plex Mono', monospace",
 fontSize: '0.75rem',
 color: 'var(--slate)',
 display: 'flex',
 alignItems: 'center',
 gap: '5px',
 padding: '7px 12px',
 borderRadius: '8px',
 border: '1px solid rgba(255,255,255,0.08)',
 background: 'rgba(255,255,255,0.03)',
 cursor: 'pointer',
 }}
 >
 <RefreshCw size={13} className={isLoading ? 'spin' : ''} />
 Refresh
 </button>
 </div>
 </div>

 {/* ── 2. Symbol Search & Tag Management ────────────────────── */}
 <div
 style={{
 display: 'flex',
 flexDirection: 'column',
 gap: '12px',
 marginBottom: '20px',
 background: 'rgba(255,255,255,0.02)',
 border: '1px solid rgba(255,255,255,0.05)',
 padding: '16px',
 borderRadius: '12px',
 }}
 >
 {/* Quick Add Bar */}
 <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
 <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
 <Search
 size={14}
 color="var(--slate)"
 style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
 />
 <input
 type="text"
 value={tickerInput}
 onChange={(e) => setTickerInput(e.target.value)}
 onKeyDown={(e) => e.key === 'Enter' && handleAddSymbol()}
 placeholder="Enter ticker (e.g. RELIANCE.NS, TCS.NS, INFY.NS)..."
 style={{
 width: '100%',
 padding: '8px 12px 8px 34px',
 background: 'rgba(7,10,16,0.6)',
 border: '1px solid rgba(255,255,255,0.12)',
 borderRadius: '8px',
 color: 'var(--ink)',
 fontFamily: "'IBM Plex Mono', monospace",
 fontSize: '0.85rem',
 outline: 'none',
 }}
 />
 </div>

 <button
 onClick={() => handleAddSymbol()}
 style={{
 display: 'flex',
 alignItems: 'center',
 gap: '6px',
 fontFamily: "'Space Grotesk', sans-serif",
 fontSize: '0.8rem',
 fontWeight: 600,
 color: '#070A10',
 background: 'var(--amber-gold)',
 border: 'none',
 borderRadius: '8px',
 padding: '8px 16px',
 cursor: 'pointer',
 whiteSpace: 'nowrap',
 }}
 >
 <Plus size={14} /> Add Ticker
 </button>
 </div>

 {/* Selected Symbol Tags */}
 <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
 <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '0.75rem', color: 'var(--slate)', fontWeight: 600, marginRight: '4px' }}>
 Active Basket:
 </span>
 {selectedSymbols.map((sym) => (
 <span
 key={sym}
 style={{
 display: 'inline-flex',
 alignItems: 'center',
 gap: '6px',
 padding: '4px 10px',
 background: 'rgba(201,165,77,0.1)',
 border: '1px solid rgba(201,165,77,0.25)',
 borderRadius: '6px',
 fontFamily: "'IBM Plex Mono', monospace",
 fontSize: '0.78rem',
 color: 'var(--ink)',
 }}
 >
 {sym}
 {selectedSymbols.length > 1 && (
 <button
 onClick={() => handleRemoveSymbol(sym)}
 title={`Remove ${sym}`}
 style={{
 background: 'transparent',
 border: 'none',
 color: 'var(--slate)',
 cursor: 'pointer',
 display: 'flex',
 alignItems: 'center',
 padding: 0,
 }}
 >
 <X size={12} color="var(--selloff)" />
 </button>
 )}
 </span>
 ))}
 </div>

 {/* Preset Chips */}
 <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center', paddingTop: '6px', borderTop: '1px dashed rgba(255,255,255,0.06)' }}>
 <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '0.72rem', color: 'var(--slate)', marginRight: '4px' }}>
 Presets:
 </span>
 {PRESETS.map((preset) => {
 const isActive =
 JSON.stringify(selectedSymbols.slice().sort()) === JSON.stringify(preset.symbols.slice().sort());
 return (
 <button
 key={preset.name}
 onClick={() => handleSelectPreset(preset.symbols)}
 style={{
 fontFamily: "'Space Grotesk', sans-serif",
 fontSize: '0.72rem',
 fontWeight: 500,
 padding: '3px 10px',
 borderRadius: '12px',
 border: isActive ? '1px solid var(--amber-gold)' : '1px solid rgba(255,255,255,0.08)',
 background: isActive ? 'rgba(201,165,77,0.15)' : 'rgba(255,255,255,0.02)',
 color: isActive ? 'var(--amber-gold)' : '#9BA3AE',
 cursor: 'pointer',
 transition: 'all 0.15s ease',
 }}
 >
 {preset.name}
 </button>
 );
 })}
 </div>
 </div>

 {hasError && !isLoading && (
 <div style={{
 padding: '24px',
 textAlign: 'center',
 background: 'rgba(255,92,108,0.08)',
 border: '1px solid rgba(255,92,108,0.25)',
 borderRadius: '12px',
 color: 'var(--selloff)',
 margin: '16px 0',
 }}>
 <div style={{ fontWeight: 700, marginBottom: '8px' }}> Comparison data unavailable</div>
 <div style={{ fontSize: '0.82rem', opacity: 0.75, marginBottom: '14px' }}>
 Could not fetch multi-stock data from the server.
 </div>
 <button
 onClick={() => loadComparisonData()}
 style={{ padding: '6px 18px', background: 'var(--selloff)', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
 >
 Retry
 </button>
 </div>
 )}

 {/* ── 3. Winner / Leader Highlights ────────────────────────── */}
 {winners && !isLoading && (
 <div
 style={{
 display: 'grid',
 gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
 gap: '12px',
 marginBottom: '20px',
 }}
 >
 {/* 5D Momentum Leader */}
 <div
 className="glass-panel"
 style={{
 padding: '14px 16px',
 borderRadius: '10px',
 border: '1px solid rgba(61,220,132,0.3)',
 background: 'linear-gradient(135deg, rgba(61,220,132,0.08) 0%, rgba(7,10,16,0.4) 100%)',
 display: 'flex',
 alignItems: 'center',
 justifyContent: 'space-between',
 }}
 >
 <div>
 <div
 style={{
 display: 'flex',
 alignItems: 'center',
 gap: '6px',
 fontSize: '0.7rem',
 fontFamily: "'Space Grotesk', sans-serif",
 fontWeight: 600,
 color: 'var(--rally)',
 textTransform: 'uppercase',
 letterSpacing: '0.04em',
 }}
 >
 <Zap size={13} /> 5D Momentum Leader
 </div>
 <div
 style={{
 fontFamily: "'Space Grotesk', sans-serif",
 fontSize: '1.1rem',
 fontWeight: 700,
 color: 'var(--ink)',
 marginTop: '4px',
 }}
 >
 {winners.momentumLeader.symbol.replace('.NS', '').replace('.BO', '')}
 </div>
 </div>
 <div style={{ textAlign: 'right' }}>
 <div
 style={{
 fontFamily: "'IBM Plex Mono', monospace",
 fontSize: '0.95rem',
 fontWeight: 600,
 color: 'var(--rally)',
 }}
 >
 ▲ +{winners.momentumLeader.return_5d_pct.toFixed(1)}%
 </div>
 <div style={{ fontSize: '0.68rem', color: 'var(--slate)', marginTop: '2px' }}>
 5D Gain
 </div>
 </div>
 </div>

 {/* Volume Anomaly Spike */}
 <div
 className="glass-panel"
 style={{
 padding: '14px 16px',
 borderRadius: '10px',
 border: '1px solid rgba(201,165,77,0.3)',
 background: 'linear-gradient(135deg, rgba(201,165,77,0.08) 0%, rgba(7,10,16,0.4) 100%)',
 display: 'flex',
 alignItems: 'center',
 justifyContent: 'space-between',
 }}
 >
 <div>
 <div
 style={{
 display: 'flex',
 alignItems: 'center',
 gap: '6px',
 fontSize: '0.7rem',
 fontFamily: "'Space Grotesk', sans-serif",
 fontWeight: 600,
 color: 'var(--amber-gold)',
 textTransform: 'uppercase',
 letterSpacing: '0.04em',
 }}
 >
 <Flame size={13} /> Volume Anomaly Spike
 </div>
 <div
 style={{
 fontFamily: "'Space Grotesk', sans-serif",
 fontSize: '1.1rem',
 fontWeight: 700,
 color: 'var(--ink)',
 marginTop: '4px',
 }}
 >
 {winners.volumeLeader.symbol.replace('.NS', '').replace('.BO', '')}
 </div>
 </div>
 <div style={{ textAlign: 'right' }}>
 <div
 style={{
 fontFamily: "'IBM Plex Mono', monospace",
 fontSize: '0.95rem',
 fontWeight: 600,
 color: 'var(--amber-gold)',
 }}
 >
 {winners.volumeLeader.volume_anomaly.toFixed(1)}x Vol
 </div>
 <div style={{ fontSize: '0.68rem', color: 'var(--slate)', marginTop: '2px' }}>
 Relative Volume
 </div>
 </div>
 </div>

 {/* Lowest Risk Profile */}
 <div
 className="glass-panel"
 style={{
 padding: '14px 16px',
 borderRadius: '10px',
 border: '1px solid rgba(56,189,248,0.3)',
 background: 'linear-gradient(135deg, rgba(56,189,248,0.08) 0%, rgba(7,10,16,0.4) 100%)',
 display: 'flex',
 alignItems: 'center',
 justifyContent: 'space-between',
 }}
 >
 <div>
 <div
 style={{
 display: 'flex',
 alignItems: 'center',
 gap: '6px',
 fontSize: '0.7rem',
 fontFamily: "'Space Grotesk', sans-serif",
 fontWeight: 600,
 color: '#38BDF8',
 textTransform: 'uppercase',
 letterSpacing: '0.04em',
 }}
 >
 <ShieldCheck size={13} /> Lowest Risk Profile
 </div>
 <div
 style={{
 fontFamily: "'Space Grotesk', sans-serif",
 fontSize: '1.1rem',
 fontWeight: 700,
 color: 'var(--ink)',
 marginTop: '4px',
 }}
 >
 {winners.safestLeader.symbol.replace('.NS', '').replace('.BO', '')}
 </div>
 </div>
 <div style={{ textAlign: 'right' }}>
 <div
 style={{
 fontFamily: "'IBM Plex Mono', monospace",
 fontSize: '0.95rem',
 fontWeight: 600,
 color: '#38BDF8',
 }}
 >
 {winners.safestLeader.confidence.toFixed(0)}% Conf
 </div>
 <div style={{ fontSize: '0.68rem', color: 'var(--slate)', marginTop: '2px' }}>
 RSI {winners.safestLeader.rsi_14.toFixed(0)} (Balanced)
 </div>
 </div>
 </div>
 </div>
 )}

 {/* ── 4. Main Matrix Area (Loading / Table / Radar) ────────── */}

 {isLoading && (
 <div
 style={{
 padding: '40px',
 textAlign: 'center',
 display: 'flex',
 flexDirection: 'column',
 alignItems: 'center',
 gap: '12px',
 }}
 >
 <RefreshCw size={22} color="var(--amber-gold)" className="spin" />
 <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.85rem', color: 'var(--slate)' }}>
 Crunching multi-stock quantitative signals…
 </span>
 </div>
 )}

 {!isLoading && viewMode === 'table' && (
 <div style={{ overflowX: 'auto' }}>
 <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
 <thead>
 <tr>
 <SortableHeader label="Symbol" columnKey="symbol" sortConfig={sortConfig} onSort={toggleSort} align="left" />
 <SortableHeader label="Price" columnKey="close_price" sortConfig={sortConfig} onSort={toggleSort} align="right" />
 <SortableHeader label="5D %" columnKey="return_5d_pct" sortConfig={sortConfig} onSort={toggleSort} align="right" />
 <SortableHeader label="20D %" columnKey="return_20d_pct" sortConfig={sortConfig} onSort={toggleSort} align="right" />
 <SortableHeader label="1Y %" columnKey="return_1y_pct" sortConfig={sortConfig} onSort={toggleSort} align="right" />
 <SortableHeader label="Vol Ratio" columnKey="volume_anomaly" sortConfig={sortConfig} onSort={toggleSort} align="right" />
 <SortableHeader label="RSI (14)" columnKey="rsi_14" sortConfig={sortConfig} onSort={toggleSort} align="right" />
 <SortableHeader label="MACD Hist" columnKey="macd_hist" sortConfig={sortConfig} onSort={toggleSort} align="right" />
 <SortableHeader label="Confidence" columnKey="confidence" sortConfig={sortConfig} onSort={toggleSort} align="right" />
 <SortableHeader label="ML Signal" columnKey="prediction" sortConfig={sortConfig} onSort={toggleSort} align="left" />
 <SortableHeader label="Active Pattern" columnKey="active_signal" sortConfig={sortConfig} onSort={toggleSort} align="left" />
 </tr>
 </thead>
 <tbody>
 {sortedData.map((row) => {
 const currencySymbol = row.symbol.endsWith('.NS') || row.symbol.endsWith('.BO') ? '₹' : '$';
 const { label: predLabel, glyph: predGlyph, color: predColor } = formatRegimeLabel(row.prediction);
 const isVolSpike = row.volume_anomaly >= 1.5;

 return (
 <tr
 key={row.symbol}
 style={{
 borderBottom: '1px solid rgba(255,255,255,0.04)',
 transition: 'background 0.15s ease',
 }}
 >
 {/* Symbol */}
 <td style={{ padding: '12px 14px', fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, color: 'var(--ink)' }}>
 <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
 <div>
 {row.symbol.replace('.NS', '').replace('.BO', '')}
 <div style={{ fontSize: '0.68rem', color: 'var(--slate)', fontFamily: "'IBM Plex Mono', monospace", marginTop: '1px' }}>
 {row.symbol}
 </div>
 </div>
 <button
 title="Open in Stock Intelligence"
 onClick={e => { e.stopPropagation(); if (onSelectSymbol) onSelectSymbol(row.symbol); }}
 style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--slate)', fontSize: '0.72rem', padding: '2px 4px', fontFamily: "'IBM Plex Mono', monospace" }}
 >
 ↗
 </button>
 </div>
 </td>

 {/* Price */}
 <td className="numeric" style={{ padding: '12px 14px', textAlign: 'right', fontFamily: "'IBM Plex Mono', monospace", fontVariantNumeric: 'tabular-nums', color: 'var(--ink)', fontWeight: 500, fontSize: '0.85rem' }}>
 {currencySymbol}{Number(row.close_price).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
 </td>

 {/* 5D % */}
 <DirectionCell value={row.return_5d_pct} suffix="%" />

 {/* 20D % */}
 <DirectionCell value={row.return_20d_pct} suffix="%" />

 {/* 1Y % */}
 <DirectionCell value={row.return_1y_pct} suffix="%" />

 {/* Vol Anomaly */}
 <td className="numeric" style={{ padding: '12px 14px', textAlign: 'right', fontFamily: "'IBM Plex Mono', monospace", fontVariantNumeric: 'tabular-nums' }}>
 <span
 style={{
 display: 'inline-block',
 padding: '2px 6px',
 borderRadius: '4px',
 fontSize: '0.8rem',
 fontWeight: isVolSpike ? 600 : 400,
 color: isVolSpike ? 'var(--amber-gold)' : '#9BA3AE',
 background: isVolSpike ? 'rgba(201,165,77,0.12)' : 'transparent',
 border: isVolSpike ? '1px solid rgba(201,165,77,0.3)' : 'none',
 }}
 >
 {row.volume_anomaly.toFixed(1)}x
 </span>
 </td>

 {/* RSI-14 */}
 <td className="numeric" style={{ padding: '12px 14px', textAlign: 'right', fontFamily: "'IBM Plex Mono', monospace", fontVariantNumeric: 'tabular-nums', fontSize: '0.85rem' }}>
 <span
 style={{
 color: row.rsi_14 > 70 ? 'var(--selloff)' : row.rsi_14 < 30 ? 'var(--rally)' : 'var(--ink)',
 fontWeight: row.rsi_14 > 70 || row.rsi_14 < 30 ? 600 : 400,
 }}
 >
 {row.rsi_14.toFixed(1)}
 </span>
 </td>

 {/* MACD Hist */}
 <td className="numeric" style={{ padding: '12px 14px', textAlign: 'right', fontFamily: "'IBM Plex Mono', monospace", fontVariantNumeric: 'tabular-nums', fontSize: '0.85rem' }}>
 <span style={{ color: row.macd_hist > 0 ? 'var(--rally)' : row.macd_hist < 0 ? 'var(--selloff)' : 'var(--slate)', fontWeight: Math.abs(row.macd_hist) > 5 ? 600 : 400 }}>
 {row.macd_hist > 0 ? '+' : ''}{row.macd_hist.toFixed(2)}
 </span>
 </td>

 {/* Confidence */}
 <td className="numeric" style={{ padding: '12px 14px', textAlign: 'right', fontFamily: "'IBM Plex Mono', monospace", fontVariantNumeric: 'tabular-nums' }}>
 <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
 <div style={{ width: '40px', height: '4px', background: 'rgba(255,255,255,0.08)', borderRadius: '2px', overflow: 'hidden' }}>
 <div style={{ width: `${row.confidence}%`, height: '100%', background: 'var(--amber-gold)', borderRadius: '2px' }} />
 </div>
 <span style={{ fontSize: '0.82rem', color: 'var(--amber-gold)', fontWeight: 600 }}>{row.confidence.toFixed(0)}%</span>
 </div>
 </td>

 {/* ML Signal */}
 <td style={{ padding: '12px 14px', fontFamily: "'Space Grotesk', sans-serif" }}>
 <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
 <span style={{ fontSize: '0.82rem', fontWeight: 600, color: predColor }}>
 {predGlyph} {predLabel}
 </span>
 <span style={{ fontSize: '0.68rem', fontFamily: "'IBM Plex Mono', monospace", color: 'var(--amber-gold)', background: 'rgba(201,165,77,0.1)', padding: '1px 5px', borderRadius: '4px' }}>
 {row.confidence.toFixed(0)}%
 </span>
 </div>
 </td>

 {/* Active Pattern */}
 <td style={{ padding: '12px 14px' }}>
 <span
 style={{
 fontSize: '0.7rem',
 fontFamily: "'IBM Plex Mono', monospace",
 color: '#9BA3AE',
 background: 'rgba(255,255,255,0.04)',
 border: '1px solid rgba(255,255,255,0.08)',
 padding: '3px 8px',
 borderRadius: '4px',
 whiteSpace: 'nowrap',
 }}
 >
 {row.active_signal}
 </span>
 </td>
 </tr>
 );
 })}
 </tbody>
 </table>
 </div>
 )}

 {!isLoading && viewMode === 'radar' && (
 <div
 style={{
 display: 'grid',
 gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
 gap: '16px',
 paddingTop: '8px',
 }}
 >
 {sortedData.map((row) => {
 const currencySymbol = row.symbol.endsWith('.NS') || row.symbol.endsWith('.BO') ? '₹' : '$';
 const is5dPos = row.return_5d_pct >= 0;
 const bar5dWidth = Math.min(100, (Math.abs(row.return_5d_pct) / maxValues.max5d) * 100);
 const barVolWidth = Math.min(100, (row.volume_anomaly / maxValues.maxVol) * 100);
 const { label: predLabel, glyph: predGlyph, color: predColor } = formatRegimeLabel(row.prediction);

 return (
 <div
 key={row.symbol}
 className="glass-panel"
 style={{
 padding: '18px',
 borderRadius: '12px',
 border: '1px solid rgba(255,255,255,0.08)',
 display: 'flex',
 flexDirection: 'column',
 gap: '14px',
 }}
 >
 {/* Header */}
 <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
 <div>
 <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '1.1rem', fontWeight: 700, color: 'var(--ink)' }}>
 {row.symbol.replace('.NS', '').replace('.BO', '')}
 </div>
 <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.72rem', color: 'var(--slate)' }}>
 {row.symbol}
 </div>
 </div>
 <div style={{ textAlign: 'right' }}>
 <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.95rem', fontWeight: 600, color: 'var(--ink)' }}>
 {currencySymbol}{row.close_price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
 </div>
 <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '0.72rem', fontWeight: 600, color: predColor }}>
 {predGlyph} {predLabel} ({row.confidence.toFixed(0)}%)
 </div>
 </div>
 </div>

 {/* Relative Progress Bars */}
 <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
 {/* 1. 5D Return */}
 <div>
 <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', fontFamily: "'Space Grotesk', sans-serif", marginBottom: '4px' }}>
 <span style={{ color: 'var(--slate)' }}>5D Return</span>
 <span style={{ fontFamily: "'IBM Plex Mono', monospace", color: is5dPos ? 'var(--rally)' : 'var(--selloff)', fontWeight: 600 }}>
 {is5dPos ? '▲ +' : '▼ '}{row.return_5d_pct.toFixed(1)}%
 </span>
 </div>
 <div style={{ height: '6px', width: '100%', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
 <div
 style={{
 height: '100%',
 width: `${bar5dWidth}%`,
 background: is5dPos ? 'var(--rally)' : 'var(--selloff)',
 borderRadius: '3px',
 transition: 'width 0.3s ease',
 }}
 />
 </div>
 </div>

 {/* 2. Volume Anomaly */}
 <div>
 <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', fontFamily: "'Space Grotesk', sans-serif", marginBottom: '4px' }}>
 <span style={{ color: 'var(--slate)' }}>Volume Ratio</span>
 <span style={{ fontFamily: "'IBM Plex Mono', monospace", color: 'var(--amber-gold)', fontWeight: 600 }}>
 {row.volume_anomaly.toFixed(1)}x Vol
 </span>
 </div>
 <div style={{ height: '6px', width: '100%', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
 <div
 style={{
 height: '100%',
 width: `${barVolWidth}%`,
 background: 'var(--amber-gold)',
 borderRadius: '3px',
 transition: 'width 0.3s ease',
 }}
 />
 </div>
 </div>

 {/* 3. Hype Score */}
 <div>
 <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', fontFamily: "'Space Grotesk', sans-serif", marginBottom: '4px' }}>
 <span style={{ color: 'var(--slate)' }}>Hype Score</span>
 <span style={{ fontFamily: "'IBM Plex Mono', monospace", color: '#38BDF8', fontWeight: 600 }}>
 {row.hype_score}/100
 </span>
 </div>
 <div style={{ height: '6px', width: '100%', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
 <div
 style={{
 height: '100%',
 width: `${row.hype_score}%`,
 background: 'linear-gradient(90deg, #38BDF8 0%, var(--amber-gold) 100%)',
 borderRadius: '3px',
 transition: 'width 0.3s ease',
 }}
 />
 </div>
 </div>
 </div>

 {/* Card Footer Metadata */}
 <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.05)', fontSize: '0.7rem', color: 'var(--slate)', fontFamily: "'IBM Plex Mono', monospace" }}>
 <span>RSI: <strong style={{ color: row.rsi_14 > 70 ? 'var(--selloff)' : row.rsi_14 < 30 ? 'var(--rally)' : 'var(--ink)' }}>{row.rsi_14.toFixed(1)}</strong></span>
 <span>Pattern: <strong style={{ color: 'var(--ink)' }}>{row.active_signal}</strong></span>
 </div>
 </div>
 );
 })}
 </div>
 )}

 {!isLoading && viewMode === 'matrix' && (
 <ConfusionMatrixGrid data={sortedData} onSelectSymbol={onSelectSymbol} />
 )}

 <div className="pipeline-module-footer">
 <span className="pipeline-module-footer-label">COMPARE → TRACK</span>
 <button className="pipeline-cta">
 Add leaders to Watchlist →
 </button>
 </div>

 <div style={{
 marginTop: '16px',
 padding: '12px',
 fontSize: '0.7rem',
 color: 'var(--slate)',
 borderTop: '1px dashed rgba(255,255,255,0.08)',
 textAlign: 'center',
 fontFamily: "'IBM Plex Mono', monospace"
 }}>
 {SEBI_REGIME_DISCLAIMER}
 </div>
 </div>
 );
}
