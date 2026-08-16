/**
 * SettingsView.jsx — Simple, clean preferences panel
 */

import React, { useState, useEffect } from 'react';
import { Check, RefreshCw, Shield } from 'lucide-react';

// ── Persist helpers
const load = (key, def) => {
  try { const v = localStorage.getItem(`cw_${key}`); return v !== null ? JSON.parse(v) : def; } catch { return def; }
};
const save = (key, val) => {
  try { localStorage.setItem(`cw_${key}`, JSON.stringify(val)); } catch {}
};

// ── Toggle
function Toggle({ value, onChange }) {
  return (
    <button
      role="switch" aria-checked={value}
      onClick={() => onChange(!value)}
      style={{
        width: 40, height: 22, flexShrink: 0, borderRadius: 11,
        border: 'none', cursor: 'pointer',
        background: value ? '#F5A623' : 'rgba(255,255,255,0.1)',
        position: 'relative', transition: 'background 0.2s', outline: 'none',
      }}
    >
      <span style={{
        position: 'absolute', top: 2, left: value ? 20 : 2,
        width: 18, height: 18, borderRadius: '50%', background: '#fff',
        boxShadow: '0 1px 4px rgba(0,0,0,0.4)',
        transition: 'left 0.18s cubic-bezier(0.4,0,0.2,1)', display: 'block',
      }} />
    </button>
  );
}

// ── Select
function Select({ value, options, onChange }) {
  return (
    <select
      value={value} onChange={e => onChange(e.target.value)}
      style={{
        background: '#10131F', border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '6px', color: '#C8D4E0',
        fontSize: '0.78rem', fontFamily: "'IBM Plex Mono', monospace",
        padding: '6px 10px', cursor: 'pointer', outline: 'none', minWidth: '140px',
      }}
    >
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

// ── Row
function Row({ label, sub, children, last }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '14px 20px', gap: '20px',
      borderBottom: last ? 'none' : '1px solid rgba(255,255,255,0.04)',
    }}>
      <div>
        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.83rem', color: '#C8D4E0', fontWeight: 500 }}>{label}</div>
        {sub && <div style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.72rem', color: '#4A5A6A', marginTop: '2px' }}>{sub}</div>}
      </div>
      {children}
    </div>
  );
}

// ── Section
function Section({ title, children }) {
  return (
    <div style={{
      background: '#0C0E1A', border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: '10px', overflow: 'hidden', marginBottom: '14px',
    }}>
      <div style={{
        padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)',
        background: '#0A0C16',
        fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600,
        fontSize: '0.82rem', color: '#9BAAB8', letterSpacing: '-0.01em',
      }}>{title}</div>
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export default function SettingsView({ activeSymbol }) {
  const [defaultSymbol,  setDefaultSymbol]  = useState(() => load('defaultSymbol', 'RELIANCE.NS'));
  const [alertsEnabled,  setAlertsEnabled]  = useState(() => load('alertsEnabled', true));
  const [marketOpenNotif, setMarketOpenNotif] = useState(() => load('marketOpenNotif', false));
  const [savedFlash, setSavedFlash] = useState(false);

  const handleSave = () => {
    save('defaultSymbol', defaultSymbol);
    save('alertsEnabled', alertsEnabled);
    save('marketOpenNotif', marketOpenNotif);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 2000);
  };

  const handleReset = () => {
    if (!window.confirm('Reset all settings to defaults?')) return;
    Object.keys(localStorage).filter(k => k.startsWith('cw_')).forEach(k => localStorage.removeItem(k));
    window.location.reload();
  };

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto', padding: '28px 24px 60px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '28px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{
            fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem',
            color: '#F5A623', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '5px',
          }}>Configuration</div>
          <h1 style={{
            fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700,
            fontSize: '1.5rem', color: '#E8EDF4', letterSpacing: '-0.03em', margin: 0,
          }}>Settings</h1>
          <p style={{ color: '#4A5A6A', fontSize: '0.78rem', marginTop: '4px' }}>
            Preferences saved locally in your browser.
          </p>
        </div>
        <button
          onClick={handleSave}
          style={{
            display: 'flex', alignItems: 'center', gap: '7px',
            padding: '9px 18px', borderRadius: '7px',
            border: '1px solid rgba(245,166,35,0.3)',
            background: savedFlash ? 'rgba(34,197,94,0.1)' : 'rgba(245,166,35,0.08)',
            color: savedFlash ? '#22C55E' : '#F5A623',
            fontSize: '0.78rem', fontFamily: "'IBM Plex Mono', monospace",
            fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
          }}
        >
          {savedFlash ? <Check size={13} /> : <RefreshCw size={13} />}
          {savedFlash ? 'Saved!' : 'Save'}
        </button>
      </div>

      {/* Data */}
      <Section title="Data">
        <Row label="Default Symbol" sub="Stock loaded on app start">
          <Select
            value={defaultSymbol} onChange={setDefaultSymbol}
            options={[
              { value: 'RELIANCE.NS', label: 'RELIANCE' },
              { value: 'TCS.NS',      label: 'TCS' },
              { value: 'HDFCBANK.NS', label: 'HDFCBANK' },
              { value: 'INFY.NS',     label: 'INFY' },
              { value: 'ICICIBANK.NS',label: 'ICICIBANK' },
              { value: 'WIPRO.NS',    label: 'WIPRO' },
            ]}
          />
        </Row>
        <Row label="Currently Loaded" last>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.78rem', color: '#F5A623', fontWeight: 600 }}>
            {activeSymbol || '—'}
          </span>
        </Row>
      </Section>

      {/* Alerts */}
      <Section title="Alerts">
        <Row label="Behavioral Nudge Banners" sub="In-app risk warnings on volatile stocks">
          <Toggle value={alertsEnabled} onChange={setAlertsEnabled} />
        </Row>
        <Row label="Market Open Notification" sub="Browser alert at 09:15 IST on trading days" last>
          <Toggle
            value={marketOpenNotif}
            onChange={v => {
              if (v && 'Notification' in window) {
                Notification.requestPermission().then(p => setMarketOpenNotif(p === 'granted'));
              } else setMarketOpenNotif(false);
            }}
          />
        </Row>
      </Section>

      {/* About */}
      <Section title="About">
        <Row label="Platform Version">
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.72rem', color: '#F5A623' }}>
            v2.4.0 — Obsidian Command
          </span>
        </Row>
        <Row label="Stack">
          <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {['React 18', 'FastAPI', 'scikit-learn'].map(t => (
              <span key={t} style={{
                fontSize: '0.63rem', fontFamily: "'IBM Plex Mono', monospace",
                padding: '2px 6px', borderRadius: '3px',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.07)', color: '#4A5A6A',
              }}>{t}</span>
            ))}
          </div>
        </Row>

        {/* Disclaimer */}
        <div style={{ padding: '14px 20px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
          <div style={{
            display: 'flex', gap: '10px', alignItems: 'flex-start',
            padding: '12px 14px', borderRadius: '7px',
            background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.12)',
          }}>
            <Shield size={13} color="#EF4444" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ fontSize: '0.74rem', color: '#7C8FA6', lineHeight: 1.6 }}>
              <strong style={{ color: '#C8D4E0', display: 'block', marginBottom: '2px' }}>
                For education only. Not investment advice.
              </strong>
              Outputs are probabilistic. Never make financial decisions solely on algorithmic signals.
            </div>
          </div>
        </div>

        <Row label="Reset All Settings" sub="Restore defaults and reload" last>
          <button
            onClick={handleReset}
            style={{
              padding: '6px 14px', borderRadius: '6px',
              border: '1px solid rgba(239,68,68,0.2)',
              background: 'transparent', color: '#EF4444',
              fontSize: '0.72rem', fontFamily: "'IBM Plex Mono', monospace", cursor: 'pointer',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.06)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >Reset</button>
        </Row>
      </Section>
    </div>
  );
}
