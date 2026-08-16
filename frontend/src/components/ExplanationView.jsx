/**
 * ExplanationView.jsx — Clean, unified market explanation with grounded citations
 */

import React, { useState } from 'react';
import {
  TrendingUp, Activity, Newspaper, AlertTriangle,
  ShieldCheck, ExternalLink, BookOpen, Zap,
} from 'lucide-react';

// ─── Citation Chip ─────────────────────────────────────────────────────────────

function CitationChip({ citation }) {
  const [open, setOpen] = useState(false);

  const relTime = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr), now = new Date();
    const h = Math.floor((now - d) / 3600000);
    if (h < 1) return 'just now';
    if (h < 24) return `${h}h ago`;
    const days = Math.floor(h / 24);
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
  };

  return (
    <span style={{ display: 'inline-block', margin: '3px 4px 3px 0', verticalAlign: 'middle' }}>
      <button
        onClick={() => setOpen(p => !p)}
        aria-expanded={open}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '5px',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid var(--glass-border)',
          borderRadius: '999px', padding: '3px 10px',
          fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem',
          color: 'var(--amber-gold)', cursor: 'pointer',
          transition: 'all 0.15s ease', whiteSpace: 'nowrap',
        }}
      >
        <span style={{ fontWeight: 600 }}>{citation.source}</span>
        {relTime(citation.date) && (
          <span style={{ opacity: 0.6 }}>· {relTime(citation.date)}</span>
        )}
      </button>

      {open && (
        <div style={{
          marginTop: '6px',
          padding: '10px 14px',
          background: 'rgba(0,0,0,0.4)',
          border: '1px solid var(--glass-border)',
          borderRadius: '8px',
          fontSize: '0.8rem',
          lineHeight: 1.55,
          color: 'var(--ink)',
          maxWidth: '420px',
        }}>
          <div style={{ marginBottom: '8px', fontWeight: 500 }}>{citation.title}</div>
          {citation.url && citation.url !== '#' ? (
            <a
              href={citation.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '4px',
                color: 'var(--amber-gold)', fontSize: '0.7rem',
                fontFamily: "'IBM Plex Mono', monospace", textDecoration: 'none',
              }}
            >
              Read source <ExternalLink size={10} />
            </a>
          ) : (
            <span style={{ color: 'var(--slate)', fontSize: '0.7rem', fontFamily: "'IBM Plex Mono', monospace" }}>
              No direct link
            </span>
          )}
        </div>
      )}
    </span>
  );
}

// ─── Section Block ──────────────────────────────────────────────────────────────

function Section({ icon: Icon, label, children }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: '8px',
      padding: '14px 16px',
      background: 'rgba(255,255,255,0.02)',
      border: '1px solid var(--glass-border)',
      borderRadius: '8px',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '7px',
        fontFamily: "'Space Grotesk', sans-serif",
        fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.07em',
        textTransform: 'uppercase', color: 'var(--amber-gold)', opacity: 0.9,
      }}>
        <Icon size={12} /> {label}
      </div>
      <div style={{
        fontFamily: "'Inter', sans-serif",
        fontSize: '0.875rem', lineHeight: 1.65,
        color: 'var(--ink)',
      }}>
        {children}
      </div>
    </div>
  );
}

// ─── Skeleton ───────────────────────────────────────────────────────────────────

function ExplanationSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '4px' }}>
      {[1, 2, 3, 4].map(i => (
        <div key={i} style={{
          height: '72px', borderRadius: '8px',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid var(--glass-border)',
          animation: 'pulse 1.5s ease-in-out infinite',
        }} />
      ))}
    </div>
  );
}

// ─── Grounding Badge ────────────────────────────────────────────────────────────

function GroundingBadge({ score, isGrounded, llmUsed }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '5px',
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid var(--glass-border)',
        borderRadius: '6px', padding: '3px 9px',
        fontSize: '0.7rem', fontFamily: "'IBM Plex Mono', monospace",
        color: isGrounded ? 'var(--rally)' : 'var(--selloff)',
      }}>
        {isGrounded ? <ShieldCheck size={11} /> : <AlertTriangle size={11} />}
        {score}% grounded
      </div>
      {llmUsed && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '4px',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid var(--glass-border)',
          borderRadius: '6px', padding: '3px 9px',
          fontSize: '0.7rem', fontFamily: "'IBM Plex Mono', monospace",
          color: 'var(--amber-gold)',
        }}>
          <Zap size={10} /> AI-enhanced
        </div>
      )}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────────

export default function ExplanationView({ explanation, loading }) {
  if (loading) return <ExplanationSkeleton />;
  if (!explanation) return null;

  const {
    sections = {},
    explanation: flatText = '',
    citations = [],
    grounding_score = 0,
    is_grounded = false,
    llm_used = false,
    disclaimer,
  } = explanation;

  const summaryText   = sections.summary    || flatText;
  const momentumText  = sections.momentum   || '';
  const newsText      = sections.news_context || '';
  const riskText      = sections.risk_note  || '';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <BookOpen size={16} color="var(--amber-gold)" />
          <span style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: '0.95rem', fontWeight: 700,
            color: 'var(--ink)',
          }}>Market Explanation</span>
        </div>
        <GroundingBadge score={grounding_score} isGrounded={is_grounded} llmUsed={llm_used} />
      </div>

      {/* Unified Sections */}
      {summaryText && (
        <Section icon={TrendingUp} label="Price Action Summary">
          {summaryText}
        </Section>
      )}

      {momentumText && (
        <Section icon={Activity} label="Momentum & Technicals">
          {momentumText}
        </Section>
      )}

      {(newsText || citations.length > 0) && (
        <Section icon={Newspaper} label="News Context">
          <div>{newsText}</div>

          {citations.length > 0 && (
            <div style={{ marginTop: '12px' }}>
              <div style={{
                fontSize: '0.68rem', fontFamily: "'Space Grotesk', sans-serif",
                textTransform: 'uppercase', letterSpacing: '0.07em',
                color: 'var(--slate)', marginBottom: '8px',
              }}>
                {citations.length} source{citations.length !== 1 ? 's' : ''} — click to expand
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap' }}>
                {citations.map(c => <CitationChip key={c.id} citation={c} />)}
              </div>
            </div>
          )}
        </Section>
      )}

      {riskText && (
        <Section icon={AlertTriangle} label="Risk Note">
          {riskText}
        </Section>
      )}

      {/* Disclaimer */}
      <div style={{
        fontSize: '0.68rem',
        fontFamily: "'IBM Plex Mono', monospace",
        color: 'var(--slate)',
        lineHeight: 1.5,
        paddingTop: '4px',
        borderTop: '1px solid var(--glass-border)',
      }}>
        {disclaimer || 'For education only. Not investment advice.'}
      </div>

    </div>
  );
}
