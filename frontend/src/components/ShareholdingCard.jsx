/**
 * ShareholdingCard.jsx
 * 
 * Displays real promoter/FII/DII/Public shareholding breakdown.
 * Data from NSE SEBI quarterly filings (falls back to yfinance estimate).
 * 
 * For education only. Not investment advice.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { BASE_URL } from '../lib/apiClient';

// ── Colour palette (matches Clearward dark theme) ─────────────────────────
const COLORS = {
  promoter : '#63DC9C',   // green  — promoter holding
  fii      : '#5B8DEF',   // blue   — foreign institutional
  dii      : '#F7B731',   // amber  — domestic institutional
  public   : '#A29BFE',   // purple — public
  others   : '#FD9644',   // orange — others
  bg       : 'rgba(255,255,255,0.03)',
  border   : 'rgba(255,255,255,0.08)',
  text     : 'rgba(255,255,255,0.9)',
  muted    : 'rgba(255,255,255,0.45)',
  dim      : 'rgba(255,255,255,0.2)',
};

// ── Simple SVG donut chart ────────────────────────────────────────────────
function DonutChart({ segments, size = 160, thickness = 28 }) {
  const r = (size - thickness) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;

  let offset = 0;
  const arcs = segments
    .filter(s => s.value > 0)
    .map(s => {
      const arc = { ...s, offset, dash: (s.value / 100) * circumference };
      offset += arc.dash;
      return arc;
    });

  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      {/* Background ring */}
      <circle cx={cx} cy={cy} r={r} fill="none"
        stroke="rgba(255,255,255,0.06)" strokeWidth={thickness} />
      {arcs.map((arc, i) => (
        <circle key={i} cx={cx} cy={cy} r={r} fill="none"
          stroke={arc.color}
          strokeWidth={thickness}
          strokeDasharray={`${arc.dash} ${circumference - arc.dash}`}
          strokeDashoffset={-arc.offset}
          strokeLinecap="butt"
          style={{ transition: 'stroke-dasharray 0.6s ease' }}
        />
      ))}
    </svg>
  );
}

// ── Change badge ──────────────────────────────────────────────────────────
function ChangeBadge({ value }) {
  if (value === null || value === undefined) return null;
  const up  = value > 0;
  const zero = value === 0;
  return (
    <span style={{
      fontSize: '0.65rem',
      fontWeight: 700,
      padding: '1px 5px',
      borderRadius: '4px',
      marginLeft: '6px',
      color: zero ? COLORS.muted : up ? '#63DC9C' : '#FF5C6C',
      background: zero ? 'rgba(255,255,255,0.06)'
                       : up ? 'rgba(99,220,156,0.12)' : 'rgba(255,92,108,0.12)',
    }}>
      {up ? '▲' : zero ? '—' : '▼'} {Math.abs(value).toFixed(2)}%
    </span>
  );
}

// ── Main component ────────────────────────────────────────────────────────
export default function ShareholdingCard({ symbol }) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const fetchData = useCallback(async () => {
    if (!symbol) return;
    setLoading(true); setError(null);
    try {
      const resp = await fetch(`${BASE_URL}/api/stocks/${encodeURIComponent(symbol)}/shareholding`);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const json = await resp.json();
      setData(json);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [symbol]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Segments for donut ──────────────────────────────────────────────────
  const segments = data ? [
    { label: 'Promoters', value: data.promoters  || 0, color: COLORS.promoter },
    { label: 'FII',       value: data.fii        || 0, color: COLORS.fii      },
    { label: 'DII',       value: data.dii        || 0, color: COLORS.dii      },
    { label: 'Public',    value: data.public     || 0, color: COLORS.public   },
    { label: 'Others',    value: data.others     || 0, color: COLORS.others   },
  ].filter(s => s.value > 0) : [];

  const cardStyle = {
    background: COLORS.bg,
    border: `1px solid ${COLORS.border}`,
    borderRadius: '16px',
    padding: '24px',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    marginTop: '16px',
    fontFamily: "'Space Grotesk', sans-serif",
  };

  // ── Loading ─────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={cardStyle}>
      <div style={{ color: COLORS.muted, fontSize: '0.85rem' }}>
        <span style={{
          display: 'inline-block', width: '8px', height: '8px',
          borderRadius: '50%', background: '#63DC9C', marginRight: '8px',
          animation: 'pulse 1.2s ease-in-out infinite'
        }} />
        Loading shareholding data...
      </div>
    </div>
  );

  // ── Error ────────────────────────────────────────────────────────────────
  if (error || !data) return (
    <div style={{...cardStyle, padding:'16px'}}>
      <div style={{ color: '#FF5C6C', fontSize: '0.8rem' }}>
        Shareholding data unavailable
        <button onClick={fetchData} style={{
          marginLeft: '10px', background: 'rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,255,255,0.15)', color: COLORS.text,
          borderRadius: '6px', padding: '2px 10px', cursor: 'pointer', fontSize: '0.75rem'
        }}>Retry</button>
      </div>
    </div>
  );

  const rows = [
    { label: 'Promoters & Group', value: data.promoters, color: COLORS.promoter, change: data.promoter_change_qoq },
    { label: 'Foreign (FII/FPI)', value: data.fii,       color: COLORS.fii,      change: data.fii_change_qoq },
    { label: 'Domestic (DII/MF)',  value: data.dii,       color: COLORS.dii,      change: null },
    { label: 'Public / Retail',   value: data.public,    color: COLORS.public,   change: null },
    { label: 'Others',            value: data.others,    color: COLORS.others,   change: null },
  ].filter(r => r.value !== null && r.value !== undefined && r.value > 0);

  const pledged = data.promoter_pledged_pct;
  const isEst   = data.is_estimated;

  return (
    <div style={cardStyle}>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px' }}>
        <div>
          <div style={{ fontWeight:700, fontSize:'1rem', color: COLORS.text, letterSpacing:'-0.02em' }}>
            Shareholding Pattern
          </div>
          <div style={{ fontSize:'0.72rem', color: COLORS.muted, marginTop:'2px' }}>
            {data.quarter || data.as_of_date}
            {isEst && (
              <span style={{
                marginLeft:'8px', fontSize:'0.65rem',
                background:'rgba(247,183,49,0.15)', color:'#F7B731',
                border:'1px solid rgba(247,183,49,0.3)', borderRadius:'4px', padding:'1px 6px'
              }}>Estimated</span>
            )}
          </div>
        </div>
        <div style={{ fontSize:'0.65rem', color: COLORS.dim, textAlign:'right' }}>
          Source: {data.source}
        </div>
      </div>

      {/* Donut + Legend layout */}
      <div style={{ display:'flex', gap:'24px', alignItems:'center', flexWrap:'wrap' }}>
        {/* Donut chart */}
        <div style={{ position:'relative', flexShrink:0 }}>
          <DonutChart segments={segments} />
          {/* Centre label */}
          <div style={{
            position:'absolute', top:'50%', left:'50%',
            transform:'translate(-50%,-50%)',
            textAlign:'center', pointerEvents:'none'
          }}>
            <div style={{ fontSize:'1.35rem', fontWeight:800, color: COLORS.promoter }}>
              {data.promoters != null ? `${data.promoters}%` : 'N/A'}
            </div>
            <div style={{ fontSize:'0.6rem', color: COLORS.muted, marginTop:'2px' }}>Promoter</div>
          </div>
        </div>

        {/* Breakdown rows */}
        <div style={{ flex:1, minWidth:'180px' }}>
          {rows.map(row => (
            <div key={row.label} style={{
              display:'flex', justifyContent:'space-between', alignItems:'center',
              marginBottom:'10px'
            }}>
              <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                <span style={{
                  width:'10px', height:'10px', borderRadius:'3px',
                  background: row.color, flexShrink:0
                }} />
                <span style={{ fontSize:'0.82rem', color: COLORS.text }}>{row.label}</span>
              </div>
              <div style={{ display:'flex', alignItems:'center' }}>
                <span style={{ fontSize:'0.9rem', fontWeight:700, color: COLORS.text,
                  fontFamily:"'IBM Plex Mono', monospace" }}>
                  {row.value != null ? `${row.value}%` : 'N/A'}
                </span>
                <ChangeBadge value={row.change} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pledging alert — show only if data available and >0 */}
      {pledged != null && (
        <div style={{
          marginTop:'16px', padding:'10px 14px', borderRadius:'10px',
          background: pledged > 20
            ? 'rgba(255,92,108,0.08)' : pledged > 5
            ? 'rgba(247,183,49,0.08)' : 'rgba(99,220,156,0.06)',
          border: `1px solid ${
            pledged > 20 ? 'rgba(255,92,108,0.25)'
            : pledged > 5 ? 'rgba(247,183,49,0.25)'
            : 'rgba(99,220,156,0.2)'}`,
          display:'flex', justifyContent:'space-between', alignItems:'center'
        }}>
          <span style={{ fontSize:'0.8rem', color: COLORS.muted }}>Promoter Shares Pledged</span>
          <span style={{
            fontSize:'0.9rem', fontWeight:700,
            color: pledged > 20 ? '#FF5C6C' : pledged > 5 ? '#F7B731' : '#63DC9C',
            fontFamily:"'IBM Plex Mono', monospace"
          }}>
            {pledged}%
            {pledged > 20 && <span style={{marginLeft:'6px',fontSize:'0.7rem'}}>⚠ High</span>}
            {pledged > 5 && pledged <= 20 && <span style={{marginLeft:'6px',fontSize:'0.7rem'}}>Moderate</span>}
          </span>
        </div>
      )}

      {/* QoQ change summary */}
      {(data.promoter_change_qoq != null || data.fii_change_qoq != null) && (
        <div style={{
          marginTop:'12px', display:'flex', gap:'12px', flexWrap:'wrap'
        }}>
          {data.promoter_change_qoq != null && (
            <div style={{
              flex:1, minWidth:'120px', padding:'8px 12px', borderRadius:'8px',
              background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)'
            }}>
              <div style={{fontSize:'0.65rem', color: COLORS.dim}}>Promoter QoQ</div>
              <div style={{
                fontSize:'1rem', fontWeight:700, marginTop:'2px',
                color: data.promoter_change_qoq >= 0 ? '#63DC9C' : '#FF5C6C',
                fontFamily:"'IBM Plex Mono', monospace"
              }}>
                {data.promoter_change_qoq >= 0 ? '+':''}{data.promoter_change_qoq}%
              </div>
            </div>
          )}
          {data.fii_change_qoq != null && (
            <div style={{
              flex:1, minWidth:'120px', padding:'8px 12px', borderRadius:'8px',
              background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)'
            }}>
              <div style={{fontSize:'0.65rem', color: COLORS.dim}}>FII QoQ</div>
              <div style={{
                fontSize:'1rem', fontWeight:700, marginTop:'2px',
                color: data.fii_change_qoq >= 0 ? '#5B8DEF' : '#FF5C6C',
                fontFamily:"'IBM Plex Mono', monospace"
              }}>
                {data.fii_change_qoq >= 0 ? '+':''}{data.fii_change_qoq}%
              </div>
            </div>
          )}
        </div>
      )}

      {/* Float ratio */}
      {data.float_ratio != null && (
        <div style={{
          marginTop:'12px', fontSize:'0.75rem', color: COLORS.muted,
          borderTop:`1px solid ${COLORS.border}`, paddingTop:'10px'
        }}>
          Free Float: <strong style={{color: COLORS.text}}>{data.float_ratio}%</strong>
          <span style={{marginLeft:'8px', color: COLORS.dim}}>
            ({data.shares_outstanding ? (data.shares_outstanding / 1e7).toFixed(1) + ' Cr shares outstanding' : ''})
          </span>
        </div>
      )}

      {/* SEBI disclaimer */}
      <div style={{
        marginTop:'14px', paddingTop:'10px',
        borderTop:`1px solid rgba(255,255,255,0.05)`,
        fontSize:'0.62rem', color:'rgba(255,255,255,0.2)',
        textAlign:'center', letterSpacing:'0.02em'
      }}>
        Shareholding data from SEBI regulatory filings · For education only · Not investment advice
      </div>

      <style>{`@keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.4;transform:scale(0.85)} }`}</style>
    </div>
  );
}
