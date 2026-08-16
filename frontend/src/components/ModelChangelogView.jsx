/**
 * ModelChangelogView.jsx — Model Promotion Audit Log
 *
 * A cinematic, terminal-style feed showing every model evaluation:
 * - Live champion banner with key metrics
 * - Timeline of evaluations with pass/fail bars
 * - Readable rationale in plain English
 * - Stats dashboard at top
 */

import React, { useState, useEffect } from 'react';
import {
  RefreshCw, Trophy, CheckCircle2, XCircle,
  TrendingUp, Activity, Cpu, AlertCircle,
  ChevronDown, ChevronUp, Zap,
} from 'lucide-react';
import { apiFetch } from '../lib/apiClient';

// ─── Helpers ───────────────────────────────────────────────────────────────────

const fmt = {
  date: (iso) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
      + '  ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
  },
  pct: (v) => v != null ? (v * 100).toFixed(1) + '%' : '—',
  num: (v, d = 2) => v != null ? Number(v).toFixed(d) : '—',
  ticker: (name) => name?.replace(/^RF_/, '').replace(/\.NS$/, '').replace(/\.BO$/, '') || name,
};

// Turn the raw reason string into a human-readable sentence
function humanReason(reason, decision) {
  if (!reason) return decision === 'PROMOTED' ? 'Promoted as champion model.' : 'Did not meet promotion threshold.';
  if (reason.includes('Initial Champion')) return 'Registered as the first champion for this symbol — no prior baseline to compare against.';
  const m = reason.match(/F1 diff ([-\d.]+) below \+([\d.]+)/);
  if (m) {
    const diff = parseFloat(m[1]);
    const threshold = parseFloat(m[2]);
    const gap = (threshold - diff).toFixed(3);
    return `F1 score improved by ${diff > 0 ? '+' : ''}${(diff * 100).toFixed(2)}% but the gate requires +${(threshold * 100).toFixed(0)}% minimum gain. ${Math.abs(diff * 100).toFixed(2)}% short of the bar.`;
  }
  return reason.replace('Rejected: ', '').replace('Promoted: ', '');
}

// ─── Stat Pill ─────────────────────────────────────────────────────────────────

function Stat({ label, value, color = 'var(--ink)' }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: '3px',
      padding: '12px 18px',
      background: 'rgba(255,255,255,0.02)',
      border: '1px solid var(--glass-border)',
      borderRadius: '8px', minWidth: '110px',
    }}>
      <div style={{
        fontSize: '0.6rem', fontFamily: "'IBM Plex Mono', monospace",
        color: 'var(--slate)', letterSpacing: '0.1em', textTransform: 'uppercase',
      }}>{label}</div>
      <div style={{
        fontSize: '1.05rem', fontFamily: "'IBM Plex Mono', monospace",
        color, fontWeight: 700,
      }}>{value}</div>
    </div>
  );
}

// ─── Mini bar chart for F1 score ───────────────────────────────────────────────

function F1Bar({ score, isChampion }) {
  const pct = Math.min(100, Math.max(0, (score || 0) * 100));
  const color = isChampion ? '#22C55E' : score > 0.28 ? 'var(--amber-gold)' : 'rgba(255,255,255,0.15)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '100px' }}>
      <div style={{
        flex: 1, height: '4px', background: 'rgba(255,255,255,0.06)',
        borderRadius: '999px', overflow: 'hidden',
      }}>
        <div style={{
          width: `${pct}%`, height: '100%',
          background: color, borderRadius: '999px',
          transition: 'width 0.6s ease',
        }} />
      </div>
      <span style={{
        fontSize: '0.72rem', fontFamily: "'IBM Plex Mono', monospace",
        color, fontWeight: 600, minWidth: '34px',
      }}>{fmt.pct(score)}</span>
    </div>
  );
}

// ─── Champion Banner ────────────────────────────────────────────────────────────

function ChampionBanner({ champion }) {
  if (!champion) return null;
  return (
    <div style={{
      position: 'relative', overflow: 'hidden',
      background: 'rgba(34,197,94,0.05)',
      border: '1px solid rgba(34,197,94,0.2)',
      borderRadius: '12px', padding: '20px 24px',
      marginBottom: '24px',
      display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap',
    }}>
      {/* Glow */}
      <div style={{
        position: 'absolute', top: -40, right: -40,
        width: 160, height: 160,
        background: 'radial-gradient(circle, rgba(34,197,94,0.08) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{
        width: 44, height: 44, borderRadius: '10px', flexShrink: 0,
        background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Trophy size={20} color="#22C55E" />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: '0.6rem', fontFamily: "'IBM Plex Mono', monospace",
          color: '#22C55E', letterSpacing: '0.12em', marginBottom: '4px',
        }}>ACTIVE CHAMPION</div>
        <div style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: '1.1rem', fontWeight: 700, color: 'var(--ink)',
        }}>
          {fmt.ticker(champion.model_name)}
          <span style={{ fontSize: '0.8rem', color: 'var(--slate)', fontWeight: 400, marginLeft: '8px' }}>
            {champion.version}
          </span>
        </div>
        <div style={{ fontSize: '0.72rem', color: 'var(--slate)', marginTop: '3px', fontFamily: "'IBM Plex Mono', monospace" }}>
          Promoted {fmt.date(champion.created_at)}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
        {[
          { label: 'F1 Score', value: fmt.pct(champion.f1_score), color: '#22C55E' },
          { label: 'Accuracy', value: fmt.pct(champion.accuracy), color: 'var(--amber-gold)' },
          { label: 'Sharpe', value: fmt.num(champion.sharpe_ratio), color: 'var(--slate)' },
        ].map(m => (
          <div key={m.label} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.6rem', color: 'var(--slate)', fontFamily: "'IBM Plex Mono', monospace", letterSpacing: '0.08em' }}>
              {m.label}
            </div>
            <div style={{ fontSize: '1rem', color: m.color, fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace" }}>
              {m.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Entry Row ─────────────────────────────────────────────────────────────────

function EntryRow({ entry, isExpanded, onToggle }) {
  const promoted = entry.decision === 'PROMOTED' || entry.is_champion;
  const ticker = fmt.ticker(entry.model_name);
  const reason = humanReason(entry.reason, entry.decision);

  return (
    <div style={{
      borderBottom: '1px solid var(--glass-border)',
      background: entry.is_champion ? 'rgba(34,197,94,0.03)' : 'transparent',
      transition: 'background 0.15s',
    }}>
      {/* Main row */}
      <div
        onClick={onToggle}
        style={{
          display: 'grid',
          gridTemplateColumns: '32px 1fr 120px 140px auto',
          alignItems: 'center',
          gap: '16px',
          padding: '12px 20px',
          cursor: 'pointer',
        }}
      >
        {/* Status icon */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          {promoted
            ? <CheckCircle2 size={16} color="#22C55E" />
            : <XCircle size={16} color="rgba(255,255,255,0.2)" />
          }
        </div>

        {/* Model name + version */}
        <div>
          <div style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: '0.88rem', fontWeight: 600,
            color: promoted ? 'var(--ink)' : 'var(--slate)',
            display: 'flex', alignItems: 'center', gap: '8px',
          }}>
            {ticker}
            {entry.is_champion && (
              <span style={{
                fontSize: '0.55rem', background: '#22C55E', color: '#000',
                borderRadius: '3px', padding: '1px 5px',
                fontFamily: "'IBM Plex Mono', monospace", letterSpacing: '0.08em',
              }}>CHAMPION</span>
            )}
          </div>
          <div style={{ fontSize: '0.68rem', color: 'var(--slate)', fontFamily: "'IBM Plex Mono', monospace" }}>
            {entry.version} · {entry.model_name?.replace(/^RF_/, '')}
          </div>
        </div>

        {/* F1 bar */}
        <F1Bar score={entry.f1_score} isChampion={entry.is_champion} />

        {/* Date */}
        <div style={{ fontSize: '0.68rem', color: 'var(--slate)', fontFamily: "'IBM Plex Mono', monospace", whiteSpace: 'nowrap' }}>
          {fmt.date(entry.created_at).split('  ')[0]}
          <br />
          <span style={{ opacity: 0.6 }}>{fmt.date(entry.created_at).split('  ')[1]}</span>
        </div>

        {/* Expand chevron */}
        <div style={{ color: 'var(--slate)', opacity: 0.5 }}>
          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
      </div>

      {/* Expanded detail */}
      {isExpanded && (
        <div style={{
          padding: '0 20px 16px 68px',
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px',
        }}>
          {/* Human reason */}
          <div style={{
            gridColumn: '1 / -1',
            padding: '10px 14px',
            background: promoted ? 'rgba(34,197,94,0.04)' : 'rgba(255,255,255,0.02)',
            border: `1px solid ${promoted ? 'rgba(34,197,94,0.15)' : 'var(--glass-border)'}`,
            borderRadius: '8px',
            fontSize: '0.82rem', lineHeight: 1.65,
            fontFamily: "'Inter', sans-serif",
            color: 'var(--ink)',
          }}>
            <span style={{ fontSize: '0.65rem', color: 'var(--slate)', fontFamily: "'IBM Plex Mono', monospace", display: 'block', marginBottom: '4px' }}>
              WHY {promoted ? 'PROMOTED' : 'REJECTED'}
            </span>
            {reason}
          </div>

          {/* Metrics */}
          {[
            { label: 'Accuracy', value: fmt.pct(entry.accuracy) },
            { label: 'F1 Score', value: fmt.pct(entry.f1_score) },
            { label: 'Sharpe Ratio', value: fmt.num(entry.sharpe_ratio) },
            { label: 'Model ID', value: `#${entry.id}` },
          ].map(m => (
            <div key={m.label} style={{
              display: 'flex', justifyContent: 'space-between',
              fontSize: '0.72rem', fontFamily: "'IBM Plex Mono', monospace',",
              color: 'var(--slate)', padding: '4px 0',
              borderBottom: '1px solid rgba(255,255,255,0.04)',
            }}>
              <span>{m.label}</span>
              <span style={{ color: 'var(--ink)' }}>{m.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Empty State ───────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div style={{
      textAlign: 'center', padding: '60px 20px',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px',
    }}>
      <Cpu size={32} color="rgba(255,255,255,0.1)" />
      <div style={{ fontFamily: "'Space Grotesk', sans-serif", color: 'var(--slate)', fontSize: '0.9rem' }}>
        No model evaluations yet
      </div>
      <div style={{ fontFamily: "'IBM Plex Mono', monospace", color: 'rgba(255,255,255,0.2)', fontSize: '0.72rem' }}>
        Models are evaluated automatically every 24 hours.
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function ModelChangelogView() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [filter, setFilter] = useState('ALL'); // ALL | PROMOTED | REJECTED

  const fetchHistory = async () => {
    setLoading(true); setError(null);
    try {
      const data = await apiFetch('/api/retrain/history');
      setHistory(Array.isArray(data) ? data : (data.history || []));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchHistory(); }, []);

  const champion = history.find(h => h.is_champion);
  const promoted = history.filter(h => h.decision === 'PROMOTED' || h.is_champion).length;
  const rejected = history.length - promoted;

  const visible = history.filter(h => {
    if (filter === 'PROMOTED') return h.decision === 'PROMOTED' || h.is_champion;
    if (filter === 'REJECTED') return !h.is_champion && h.decision !== 'PROMOTED';
    return true;
  });

  const tabs = [
    { id: 'ALL', label: `All (${history.length})` },
    { id: 'PROMOTED', label: `Promoted (${promoted})` },
    { id: 'REJECTED', label: `Rejected (${rejected})` },
  ];

  return (
    <div style={{ padding: '28px 32px', maxWidth: '1000px', margin: '0 auto' }}>

      {/* ── Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{
            fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.62rem',
            color: 'var(--amber-gold)', letterSpacing: '0.12em',
            textTransform: 'uppercase', marginBottom: '6px',
          }}>System · ML Pipeline</div>
          <h2 style={{
            margin: 0, fontFamily: "'Space Grotesk', sans-serif",
            fontSize: '1.3rem', fontWeight: 700, color: 'var(--ink)',
          }}>Model Evaluation Log</h2>
          <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: 'var(--slate)', fontFamily: "'IBM Plex Mono', monospace" }}>
            Every model trained is gated — only those beating the champion by +2% F1 get promoted
          </p>
        </div>
        <button
          onClick={fetchHistory} disabled={loading}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '8px 14px',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid var(--glass-border)',
            borderRadius: '7px', color: 'var(--slate)',
            cursor: 'pointer', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.72rem',
          }}
        >
          <RefreshCw size={12} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          Refresh
        </button>
      </div>

      {/* ── Stats */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '20px' }}>
        <Stat label="Total Evaluated" value={history.length} />
        <Stat label="Promoted" value={promoted} color="#22C55E" />
        <Stat label="Rejected" value={rejected} color="rgba(255,255,255,0.3)" />
        <Stat label="Gate Threshold" value="+2% F1" color="var(--amber-gold)" />
        <Stat label="Promotion Rate" value={history.length ? `${((promoted / history.length) * 100).toFixed(0)}%` : '—'} color="var(--amber-gold)" />
      </div>

      {/* ── Champion Banner */}
      <ChampionBanner champion={champion} />

      {/* ── How the gate works */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', gap: '10px',
        padding: '12px 16px',
        background: 'rgba(245,166,35,0.04)',
        border: '1px solid rgba(245,166,35,0.12)',
        borderRadius: '8px', marginBottom: '20px',
      }}>
        <Zap size={13} color="var(--amber-gold)" style={{ marginTop: '2px', flexShrink: 0 }} />
        <div style={{ fontSize: '0.78rem', lineHeight: 1.6, color: 'var(--slate)', fontFamily: "'Inter', sans-serif" }}>
          <strong style={{ color: 'var(--ink)' }}>How promotion works:</strong> Every 24 hours, a new challenger model is trained.
          It only replaces the champion if its F1 score is at least <strong style={{ color: 'var(--amber-gold)' }}>+2% higher</strong> using walk-forward validation.
          This prevents overfitting and ensures every live model has genuinely improved.
        </div>
      </div>

      {/* ── Error */}
      {error && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          color: '#EF4444', fontFamily: "'IBM Plex Mono', monospace",
          fontSize: '0.78rem', padding: '12px', marginBottom: '16px',
          background: 'rgba(239,68,68,0.06)', borderRadius: '8px',
          border: '1px solid rgba(239,68,68,0.15)',
        }}>
          <AlertCircle size={14} /> {error}
        </div>
      )}

      {/* ── Table */}
      {!loading && history.length > 0 && (
        <div style={{
          background: 'rgba(255,255,255,0.01)',
          border: '1px solid var(--glass-border)',
          borderRadius: '10px', overflow: 'hidden',
        }}>
          {/* Filter tabs */}
          <div style={{
            display: 'flex', alignItems: 'center',
            borderBottom: '1px solid var(--glass-border)',
            padding: '0 20px',
            background: 'rgba(0,0,0,0.2)',
          }}>
            {tabs.map(t => (
              <button
                key={t.id}
                onClick={() => setFilter(t.id)}
                style={{
                  padding: '12px 16px',
                  background: 'none', border: 'none',
                  borderBottom: `2px solid ${filter === t.id ? 'var(--amber-gold)' : 'transparent'}`,
                  color: filter === t.id ? 'var(--amber-gold)' : 'var(--slate)',
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: '0.72rem', cursor: 'pointer',
                  transition: 'all 0.15s',
                  marginBottom: '-1px',
                }}
              >{t.label}</button>
            ))}

            {/* Column headers */}
            <div style={{
              marginLeft: 'auto',
              display: 'grid', gridTemplateColumns: '32px 1fr 120px 140px auto',
              gap: '16px', padding: '0', alignItems: 'center',
              fontSize: '0.6rem', fontFamily: "'IBM Plex Mono', monospace",
              color: 'rgba(255,255,255,0.25)', letterSpacing: '0.08em',
              paddingRight: '0', width: '100%', maxWidth: '70%',
            }}>
              <span />
              <span>MODEL</span>
              <span>F1 SCORE</span>
              <span>DATE</span>
              <span />
            </div>
          </div>

          {visible.length === 0 ? (
            <EmptyState />
          ) : (
            visible.map(entry => (
              <EntryRow
                key={entry.id}
                entry={entry}
                isExpanded={expandedId === entry.id}
                onToggle={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
              />
            ))
          )}
        </div>
      )}

      {!loading && history.length === 0 && !error && <EmptyState />}

      {loading && (
        <div style={{
          display: 'flex', flexDirection: 'column', gap: '8px',
        }}>
          {[1,2,3,4,5].map(i => (
            <div key={i} style={{
              height: '56px', borderRadius: '8px',
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid var(--glass-border)',
              animation: 'pulse 1.5s ease-in-out infinite',
            }} />
          ))}
        </div>
      )}
    </div>
  );
}
