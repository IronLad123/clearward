/**
 * PortfolioDoctorView.jsx — Portfolio Health Doctor Component for ClearWard
 *
 * Evaluates total holdings (Stocks + Mutual Funds in ₹ INR) and generates:
 * - Objective Portfolio Health Score (0 - 100) & Status Badge
 * - Top 3 Factual Self-Defense Diagnostics
 * - Asset Allocation & Sector Concentration Breakdown
 * - Mutual Fund Overlap Matrix (%)
 * - Annual Distributor Fee Drag (Regular vs Direct plan leakage in ₹/year)
 * - Macro Stress Test Drawdown Matrix (2020 COVID Crash, 2008 Crisis, Rate Spikes)
 */

import React, { useState, useEffect } from 'react';
import { ShieldCheck, ShieldAlert, Activity, AlertTriangle, Plus, Trash2, RefreshCw, Layers, DollarSign, Zap, SlidersHorizontal } from 'lucide-react';

const API_BASE_URL = '';

// Default starter portfolio preset (User Real Portfolio ₹23,625)
const SAMPLE_HOLDINGS = [
 { id: '1', name: 'HDFC Flexi Cap Direct Plan Growth', holding_type: 'mutual_fund', amount_inr: 11909, category: 'Flexi Cap', is_regular_plan: false },
 { id: '2', name: 'Bandhan Small Cap Fund Direct Growth', holding_type: 'mutual_fund', amount_inr: 6028, category: 'Small Cap', is_regular_plan: false },
 { id: '3', name: 'HDFC Mid Cap Fund Direct Growth', holding_type: 'mutual_fund', amount_inr: 5688, category: 'Mid Cap', is_regular_plan: false },
];

export default function PortfolioDoctorView({ onNavigate }) {
 const [holdings, setHoldings] = useState(SAMPLE_HOLDINGS);
 const [auditResult, setAuditResult] = useState(null);
 const [isAuditing, setIsAuditing] = useState(false);
 const [errorMsg, setErrorMsg] = useState(null);
 const [stressScenarioIndex, setStressScenarioIndex] = useState(0);
 const [stressIntensity, setStressIntensity] = useState(100);

 // --- Interactive Fee Drag Calculator state ---
 // W_drag(N) = P0 * [ FVA(r - cD, N) - FVA(r - cR, N) ]
 // where FVA(g, N) = ((1+g)^N - 1) / g  (Future Value of Annuity per unit P0)
 // Research basis: Chhabra & Patel (2023) SSRN 4512301 — made interactive here.
 const [fdSip, setFdSip] = useState(10000);          // Monthly SIP ₹
 const [fdReturn, setFdReturn] = useState(12);        // Expected annual return %
 const [fdDirectTer, setFdDirectTer] = useState(0.5);// Direct plan TER %
 const [fdRegularTer, setFdRegularTer] = useState(1.5); // Regular plan TER %
 const [fdHorizon, setFdHorizon] = useState(15);     // Investment horizon years

 // New item form state
 const [newName, setNewName] = useState('');
 const [newType, setNewType] = useState('mutual_fund');
 const [newAmount, setNewAmount] = useState('50000');
 const [newCategory, setNewCategory] = useState('Flexi Cap');
 const [newIsRegular, setNewIsRegular] = useState(false);

 // Suggestions state
 const [mfSuggestions, setMfSuggestions] = useState([]);

 // Fetch MF suggestions as user types
 useEffect(() => {
 if (newType === 'mutual_fund' && newName.trim().length >= 2) {
 const timer = setTimeout(async () => {
 try {
 const res = await fetch(`/api/mf/search?q=${encodeURIComponent(newName.trim())}`);
 if (res.ok) {
 const data = await res.json();
 setMfSuggestions(data.results || data || []);
 }
 } catch (e) {
 // ignore search error
 }
 }, 200);
 return () => clearTimeout(timer);
 }
 }, [newName, newType]);

 const POPULAR_MF_PRESETS = [
 { name: 'HDFC Flexi Cap Fund', category: 'Flexi Cap' },
 { name: 'Parag Parikh Flexi Cap Fund', category: 'Flexi Cap' },
 { name: 'HDFC Top 100 Fund', category: 'Large Cap' },
 { name: 'SBI Small Cap Fund', category: 'Small Cap' },
 { name: 'ICICI Prudential Bluechip Fund', category: 'Large Cap' },
 { name: 'Quant Small Cap Fund', category: 'Small Cap' },
 { name: 'Motilal Oswal Midcap Fund', category: 'Mid Cap' },
 { name: 'Mirae Asset Large Cap Fund', category: 'Large Cap' },
 { name: 'UTI Nifty 50 Index Fund', category: 'Index Fund' },
 { name: 'Nippon India Small Cap Fund', category: 'Small Cap' },
 { name: 'Axis Small Cap Fund', category: 'Small Cap' },
 { name: 'Kotak Emerging Equity Fund', category: 'Mid Cap' },
 { name: 'SBI Contra Fund', category: 'Flexi Cap' },
 { name: 'DSP Small Cap Fund', category: 'Small Cap' },
 { name: 'RELIANCE.NS', category: 'Energy & Retail' },
 { name: 'TCS.NS', category: 'IT Services' },
 { name: 'HDFCBANK.NS', category: 'Banking' },
 { name: 'ICICIBANK.NS', category: 'Banking' },
 { name: 'INFY.NS', category: 'IT Services' },
 { name: 'TATAMOTORS.NS', category: 'Automotive' },
 ];

 const handleNameChange = (val) => {
 setNewName(val);
 if (val.includes('.NS') || val.includes('.BO') || val.toUpperCase() === val && val.length <= 5) {
 setNewType('stock');
 } else if (val.toLowerCase().includes('fund') || val.toLowerCase().includes('cap') || val.toLowerCase().includes('index')) {
 setNewType('mutual_fund');
 }

 const matched = POPULAR_MF_PRESETS.find(p => p.name.toLowerCase() === val.toLowerCase());
 if (matched) {
 setNewCategory(matched.category);
 }
 };

 const handleImportWatchlist = () => {
 try {
 const saved = JSON.parse(localStorage.getItem('watchlist') || '[]');
 if (!saved.length) return;
 const imported = saved.map((sym, idx) => ({
 id: `imported_${idx}_${Date.now()}`,
 name: sym,
 holding_type: 'stock',
 amount_inr: 50000,
 category: 'Equity Stock',
 is_regular_plan: false,
 }));
 setHoldings([...holdings, ...imported]);
 } catch (e) {
 console.warn('Could not import watchlist:', e);
 }
 };

 const handleAddHolding = (e) => {
 e.preventDefault();
 if (!newName.trim() || !newAmount || Number(newAmount) <= 0) return;

 const newItem = {
 id: Date.now().toString(),
 name: newName.trim(),
 holding_type: newType,
 amount_inr: Number(newAmount),
 category: newCategory.trim() || 'General',
 is_regular_plan: newType === 'mutual_fund' ? newIsRegular : false,
 };

 setHoldings([...holdings, newItem]);
 setNewName('');
 setNewAmount('50000');
 };

 const handleRemoveHolding = (id) => {
 setHoldings(holdings.filter((h) => h.id !== id));
 };

 const runAudit = async () => {
 if (holdings.length === 0) {
 setErrorMsg('Please add at least one holding to run a portfolio audit.');
 return;
 }

 setIsAuditing(true);
 setErrorMsg(null);

 try {
 const response = await fetch(`${API_BASE_URL}/api/portfolio/audit`, {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({
 holdings: holdings.map(({ name, holding_type, amount_inr, category, is_regular_plan }) => ({
 name,
 holding_type,
 amount_inr,
 category,
 is_regular_plan,
 })),
 }),
 });

 if (!response.ok) {
 throw new Error(`Server returned HTTP ${response.status}`);
 }

 const data = await response.json();
 setAuditResult(data);
 } catch (err) {
 console.error('Portfolio audit error:', err);
 setErrorMsg('Failed to generate portfolio audit. Ensure backend is running.');
 } finally {
 setIsAuditing(false);
 }
 };

 // Auto-run audit when sample portfolio is loaded and no results exist yet
 useEffect(() => {
 if (holdings.length > 0 && !auditResult && !isAuditing) {
 runAudit();
 }
 }, [holdings]);

 return (
 <div style={{ maxWidth: '1440px', margin: '0 auto' }}>

 {/* ── Header Card ─────────────────────────────────────────────────── */}
 <div className="glass-panel panel-appear" style={{ padding: '24px', marginBottom: '24px' }}>
 <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
 <div>
 <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
 <ShieldCheck size={22} style={{ color: 'var(--signal-gold)' }} />
 <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--ink)' }}>
 Portfolio Health Doctor
 </h2>
 </div>
 <p style={{ fontSize: '0.86rem', color: 'var(--slate-light)' }}>
 Audit your stock & mutual fund holdings for overlaps, hidden distributor commissions, and macro stress resilience.
 </p>
 </div>

 <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
 <button
 onClick={handleImportWatchlist}
 className="glass-pill"
 style={{ cursor: 'pointer', fontSize: '0.78rem', color: 'var(--amber-gold)', borderColor: 'rgba(201,165,77,0.3)', background: 'rgba(201,165,77,0.08)' }}
 title="Import all symbols from your Tracked Watchlist"
 >
 Import My Watchlist
 </button>
 <button
 onClick={() => { setHoldings(SAMPLE_HOLDINGS); setAuditResult(null); }}
 className="glass-pill"
 style={{ cursor: 'pointer', fontSize: '0.78rem', color: 'var(--slate)', borderColor: 'var(--glass-border)' }}
 >
 Load Sample
 </button>
 <button
 onClick={() => { setHoldings([]); setAuditResult(null); }}
 className="glass-pill"
 style={{ cursor: 'pointer', fontSize: '0.78rem', color: 'var(--accent-bearish)', borderColor: 'rgba(255,92,108,0.3)' }}
 >
 Clear All
 </button>
 <button
 onClick={runAudit}
 disabled={isAuditing}
 style={{
 display: 'flex',
 alignItems: 'center',
 gap: '8px',
 padding: '10px 20px',
 borderRadius: '10px',
 background: 'var(--signal-gold)',
 color: 'var(--void-panel)',
 fontWeight: 700,
 fontSize: '0.88rem',
 cursor: 'pointer',
 border: 'none',
 }}
 >
 {isAuditing ? <RefreshCw className="spin" size={16} /> : <Zap size={16} />}
 Run Portfolio Audit
 </button>
 </div>
 </div>
 </div>

 {errorMsg && (
 <div className="glass-panel panel-appear" style={{ padding: '16px 20px', marginBottom: '24px', borderColor: 'rgba(255,92,108,0.4)' }}>
 <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--accent-bearish)' }}>
 <AlertTriangle size={18} />
 <span style={{ fontSize: '0.88rem' }}>{errorMsg}</span>
 </div>
 </div>
 )}

 {/* ── Holdings Manager & Input Section ───────────────────────────── */}
 <div className="glass-panel panel-appear" style={{ padding: '24px', marginBottom: '24px' }}>
 <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--ink)', marginBottom: '16px' }}>
 Current Portfolio Holdings
 </h3>

 {/* Holdings Table */}
 <div style={{ overflowX: 'auto', marginBottom: '20px' }}>
 <table className="data-table">
 <thead>
 <tr>
 <th>Holding Name</th>
 <th>Asset Type</th>
 <th>Category</th>
 <th>Invested Amount (₹)</th>
 <th>Plan Type</th>
 <th style={{ textAlign: 'right' }}>Action</th>
 </tr>
 </thead>
 <tbody>
 {holdings.map((item) => (
 <tr key={item.id}>
 <td style={{ fontWeight: 600, color: 'var(--ink)' }}>{item.name}</td>
 <td>
 <span className="glass-pill" style={{ fontSize: '0.72rem' }}>
 {item.holding_type === 'stock' ? 'Direct Stock' : 'Mutual Fund'}
 </span>
 </td>
 <td style={{ color: 'var(--slate-light)' }}>{item.category}</td>
 <td className="font-mono" style={{ fontWeight: 600 }}>
 ₹{item.amount_inr.toLocaleString('en-IN')}
 </td>
 <td>
 {item.holding_type === 'mutual_fund' ? (
 <span className={`glass-pill ${item.is_regular_plan ? 'badge-selloff' : 'badge-rally'}`} style={{ fontSize: '0.72rem' }}>
 {item.is_regular_plan ? 'Regular Plan' : 'Direct Plan'}
 </span>
 ) : (
 <span style={{ color: 'var(--slate)', fontSize: '0.75rem' }}>N/A</span>
 )}
 </td>
 <td style={{ textAlign: 'right' }}>
 <button
 onClick={() => handleRemoveHolding(item.id)}
 style={{ color: 'var(--accent-bearish)', padding: '4px', cursor: 'pointer', background: 'transparent', border: 'none' }}
 title="Remove Holding"
 >
 <Trash2 size={16} />
 </button>
 </td>
 </tr>
 ))}
 {holdings.length === 0 && (
 <tr>
 <td colSpan={6}>
 <div style={{ textAlign: 'center', padding: '48px 20px', opacity: 0.7 }}>
 <div style={{ fontSize: '2rem', marginBottom: '12px' }}>⊞</div>
 <div style={{ fontSize: '1rem', fontFamily: "'Space Grotesk', sans-serif", color: 'var(--ink)', marginBottom: '6px' }}>No portfolio loaded</div>
 <div style={{ fontSize: '0.78rem', fontFamily: "'IBM Plex Mono', monospace", color: 'var(--slate)' }}>Click "Load Sample Portfolio" above to run your first audit instantly</div>
 </div>
 </td>
 </tr>
 )}
 </tbody>
 </table>
 </div>

 {/* Add Holding Form */}
 <form onSubmit={handleAddHolding} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px' }}>
 <input
 type="text"
 list="portfolio-holding-suggestions"
 placeholder="Name (e.g. RELIANCE.NS, Parag Parikh Flexi Cap)"
 value={newName}
 onChange={(e) => handleNameChange(e.target.value)}
 style={{ padding: '8px 12px', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--glass-border)', borderRadius: '8px', color: 'var(--ink)', fontSize: '0.85rem' }}
 required
 />
 <datalist id="portfolio-holding-suggestions">
 {POPULAR_MF_PRESETS.map((p) => (
 <option key={p.name} value={p.name} label={p.category} />
 ))}
 {mfSuggestions.map((s) => (
 <option key={s.schemeCode || s.schemeName} value={s.schemeName} />
 ))}
 </datalist>
 <select
 value={newType}
 onChange={(e) => setNewType(e.target.value)}
 style={{ padding: '8px 12px', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--glass-border)', borderRadius: '8px', color: 'var(--ink)', fontSize: '0.85rem' }}
 >
 <option value="mutual_fund">Mutual Fund</option>
 <option value="stock">Direct Stock</option>
 </select>
 <input
 type="number"
 placeholder="Amount in ₹"
 value={newAmount}
 onChange={(e) => setNewAmount(e.target.value)}
 style={{ padding: '8px 12px', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--glass-border)', borderRadius: '8px', color: 'var(--ink)', fontSize: '0.85rem' }}
 required
 />
 <input
 type="text"
 placeholder="Category (e.g. Large Cap)"
 value={newCategory}
 onChange={(e) => setNewCategory(e.target.value)}
 style={{ padding: '8px 12px', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--glass-border)', borderRadius: '8px', color: 'var(--ink)', fontSize: '0.85rem' }}
 />
 {newType === 'mutual_fund' && (
 <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: 'var(--slate-light)', cursor: 'pointer' }}>
 <input
 type="checkbox"
 checked={newIsRegular}
 onChange={(e) => setNewIsRegular(e.target.checked)}
 style={{ accentColor: 'var(--accent-bearish)' }}
 />
 Regular Plan (Paying Commission)
 </label>
 )}
 <button
 type="submit"
 style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '8px 16px', background: 'rgba(255,255,255,0.08)', border: '1px solid var(--glass-border)', borderRadius: '8px', color: 'var(--ink)', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}
 >
 <Plus size={16} /> Add Holding
 </button>
 </form>
 </div>

 {/* ── Audit Results View ─────────────────────────────────────────── */}
 {auditResult && (
 <>
 {/* Top Score Banner & Diagnostics */}
 <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px', marginBottom: '24px' }}>

 {/* Score Badge */}
 <div className="glass-panel panel-appear" style={{ padding: '24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
 <div style={{ fontSize: '0.75rem', color: 'var(--slate)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
 Portfolio Health Score
 </div>
 <div
 className="font-mono"
 style={{
 fontSize: '3.2rem',
 fontWeight: 700,
 color: auditResult.health_score >= 80 ? 'var(--accent-bullish)' : auditResult.health_score >= 60 ? 'var(--signal-gold)' : 'var(--accent-bearish)',
 }}
 >
 {auditResult.health_score}
 <span style={{ fontSize: '1.2rem', color: 'var(--slate)' }}>/100</span>
 </div>
 <span
 className={`glass-pill ${auditResult.health_score >= 80 ? 'badge-rally' : auditResult.health_score >= 60 ? 'badge-gold' : 'badge-selloff'}`}
 style={{ marginTop: '10px', fontSize: '0.8rem' }}
 >
 STATUS: {auditResult.health_rating}
 </span>
 </div>

 {/* Diagnostics List */}
 <div className="glass-panel panel-appear" style={{ padding: '24px' }}>
 <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', color: 'var(--signal-gold)' }}>
 <Activity size={18} />
 <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Top 3 Factual Self-Defense Diagnostics</h3>
 </div>
 <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
 {auditResult.diagnostics.map((diag, index) => (
 <div key={index} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', background: 'rgba(255,255,255,0.02)', padding: '10px 14px', borderRadius: '8px', borderLeft: '3px solid var(--signal-gold)' }}>
 <span className="font-mono" style={{ color: 'var(--signal-gold)', fontWeight: 700, fontSize: '0.88rem' }}>0{index + 1}</span>
 <span style={{ fontSize: '0.86rem', color: 'var(--ink)', lineHeight: 1.4 }}>{diag}</span>
 </div>
 ))}
 </div>
 </div>
 </div>

 {/* Fee Leakage & Overlap Grid */}
 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>

 {/* Distributor Fee Leakage Audit */}
 <div className="glass-panel panel-appear" style={{ padding: '24px' }}>
 <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', color: 'var(--accent-bearish)' }}>
 <DollarSign size={18} />
 <h3 style={{ fontSize: '0.98rem', fontWeight: 600 }}>Distributor Fee Drag Audit</h3>
 </div>
 <p style={{ fontSize: '0.84rem', color: 'var(--slate-light)', marginBottom: '16px' }}>
 Regular plans pay ~1.25% p.a. in ongoing distributor commissions out of your portfolio NAV.
 </p>

 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
 <div style={{ background: 'rgba(255,92,108,0.08)', border: '1px solid rgba(255,92,108,0.2)', padding: '14px', borderRadius: '10px' }}>
 <div style={{ fontSize: '0.72rem', color: 'var(--slate)' }}>Annual Fee Drag</div>
 <div className="font-mono" style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--accent-bearish)', marginTop: '4px' }}>
 -₹{auditResult.fee_leakage.annual_fee_drag_inr.toLocaleString('en-IN')}/yr
 </div>
 </div>

 <div style={{ background: 'rgba(255,92,108,0.08)', border: '1px solid rgba(255,92,108,0.2)', padding: '14px', borderRadius: '10px' }}>
 <div style={{ fontSize: '0.72rem', color: 'var(--slate)' }}>10Y Compounded Fee Loss</div>
 <div className="font-mono" style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--accent-bearish)', marginTop: '4px' }}>
 -₹{auditResult.fee_leakage.ten_year_compounded_loss_inr.toLocaleString('en-IN')}
 </div>
 </div>
 </div>
 </div>

 {/* Overlap Matrix */}
 <div className="glass-panel panel-appear" style={{ padding: '24px' }}>
 <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', color: 'var(--signal-gold)' }}>
 <Layers size={18} />
 <h3 style={{ fontSize: '0.98rem', fontWeight: 600 }}>Mutual Fund Overlap Matrix</h3>
 </div>

 {auditResult.overlaps.length > 0 ? (
 <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
 {auditResult.overlaps.map((item, idx) => (
 <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: '8px', background: item.is_high_overlap ? 'rgba(255,92,108,0.08)' : 'rgba(255,255,255,0.02)' }}>
 <div>
 <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--ink)' }}>{item.fund_a} ↔ {item.fund_b}</div>
 </div>
 <span className={`font-mono ${item.is_high_overlap ? 'badge-selloff' : 'glass-pill'}`} style={{ fontSize: '0.85rem' }}>
 {item.overlap_pct}% Overlap
 </span>
 </div>
 ))}
 </div>
 ) : (
 <div style={{ color: 'var(--slate)', fontSize: '0.85rem', textAlign: 'center', padding: '20px' }}>
 Add 2 or more mutual funds to audit holding overlap.
 </div>
 )}
 </div>
 </div>

 {/* ── Interactive Fee Drag Wealth Calculator ── */}
 {/* Novel contribution: W_drag(N) formula made interactive with live sliders */}
 {/* Research basis: Chhabra & Patel (2023) SSRN 4512301 — this converts their */}
 {/* static PDF scenario table into a personalized, real-time user tool.       */}
 <div className="glass-panel panel-appear" style={{ padding: '28px', marginBottom: '24px' }}>
 <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', color: 'var(--signal-gold)' }}>
 <SlidersHorizontal size={18} />
 <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Interactive Fee Drag Wealth Calculator</h3>
 <span style={{ marginLeft: 'auto', fontSize: '0.65rem', fontFamily: "'IBM Plex Mono', monospace", color: 'var(--slate)', background: 'rgba(255,255,255,0.05)', padding: '3px 8px', borderRadius: '4px' }}>W_drag(N) Formula</span>
 </div>
 <p style={{ fontSize: '0.82rem', color: 'var(--slate-light)', marginBottom: '20px' }}>
 Adjust the sliders to see how much compounded wealth a distributor commission costs you over your specific investment horizon. For education only — not advice.
 </p>

 {(() => {
 // W_drag(N) = P0 * [FVA(r-cD, N) - FVA(r-cR, N)]
 // FVA(g, N) = ((1+g)^N - 1) / g  using monthly compounding
 const p0 = fdSip;                             // monthly SIP
 const r_m = fdReturn / 100 / 12;             // monthly market return
 const cD_m = fdDirectTer / 100 / 12;         // monthly direct TER
 const cR_m = fdRegularTer / 100 / 12;        // monthly regular TER
 const months = fdHorizon * 12;
 const gD = r_m - cD_m;                       // net monthly growth (direct)
 const gR = r_m - cR_m;                       // net monthly growth (regular)
 const fvaD = gD > 0 ? p0 * ((Math.pow(1 + gD, months) - 1) / gD) : p0 * months;
 const fvaR = gR > 0 ? p0 * ((Math.pow(1 + gR, months) - 1) / gR) : p0 * months;
 const wDrag = Math.max(0, fvaD - fvaR);
 const totalInvested = p0 * months;
 const wDragPct = totalInvested > 0 ? (wDrag / totalInvested * 100).toFixed(1) : '0.0';

 return (
 <div>
 {/* Result headline */}
 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '24px' }}>
 <div style={{ background: 'rgba(255,92,108,0.08)', border: '1px solid rgba(255,92,108,0.25)', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
 <div style={{ fontSize: '0.7rem', color: 'var(--slate)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: "'IBM Plex Mono',monospace" }}>Wealth Lost to Fees</div>
 <div className="font-mono" style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-bearish)' }}>₹{Math.round(wDrag).toLocaleString('en-IN')}</div>
 <div style={{ fontSize: '0.72rem', color: 'var(--slate)', marginTop: '4px' }}>over {fdHorizon} years</div>
 </div>
 <div style={{ background: 'rgba(255,200,0,0.08)', border: '1px solid rgba(255,200,0,0.2)', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
 <div style={{ fontSize: '0.7rem', color: 'var(--slate)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: "'IBM Plex Mono',monospace" }}>% of Total Invested</div>
 <div className="font-mono" style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--signal-gold)' }}>{wDragPct}%</div>
 <div style={{ fontSize: '0.72rem', color: 'var(--slate)', marginTop: '4px' }}>₹{Math.round(totalInvested).toLocaleString('en-IN')} invested</div>
 </div>
 <div style={{ background: 'rgba(0,255,180,0.06)', border: '1px solid rgba(0,255,180,0.18)', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
 <div style={{ fontSize: '0.7rem', color: 'var(--slate)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: "'IBM Plex Mono',monospace" }}>Direct Plan Corpus</div>
 <div className="font-mono" style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-bullish, #00ffb4)' }}>₹{Math.round(fvaD).toLocaleString('en-IN')}</div>
 <div style={{ fontSize: '0.72rem', color: 'var(--slate)', marginTop: '4px' }}>vs ₹{Math.round(fvaR).toLocaleString('en-IN')} regular</div>
 </div>
 </div>

 {/* Sliders */}
 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px 28px' }}>

 {/* SIP Amount */}
 <div>
 <label style={{ fontSize: '0.78rem', color: 'var(--slate)', display: 'flex', justifyContent: 'space-between' }}>
 <span>Monthly SIP</span>
 <span className="font-mono" style={{ color: 'var(--ink)' }}>₹{fdSip.toLocaleString('en-IN')}</span>
 </label>
 <input type="range" min={1000} max={100000} step={1000} value={fdSip}
 onChange={e => setFdSip(Number(e.target.value))}
 style={{ width: '100%', marginTop: '8px', accentColor: 'var(--signal-gold)' }} />
 <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--slate)' }}>
 <span>₹1,000</span><span>₹1,00,000</span>
 </div>
 </div>

 {/* Investment Horizon */}
 <div>
 <label style={{ fontSize: '0.78rem', color: 'var(--slate)', display: 'flex', justifyContent: 'space-between' }}>
 <span>Horizon (Years)</span>
 <span className="font-mono" style={{ color: 'var(--ink)' }}>{fdHorizon} yrs</span>
 </label>
 <input type="range" min={3} max={30} step={1} value={fdHorizon}
 onChange={e => setFdHorizon(Number(e.target.value))}
 style={{ width: '100%', marginTop: '8px', accentColor: 'var(--signal-gold)' }} />
 <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--slate)' }}>
 <span>3 yr</span><span>30 yr</span>
 </div>
 </div>

 {/* Expected Return */}
 <div>
 <label style={{ fontSize: '0.78rem', color: 'var(--slate)', display: 'flex', justifyContent: 'space-between' }}>
 <span>Expected Annual Return</span>
 <span className="font-mono" style={{ color: 'var(--ink)' }}>{fdReturn}%</span>
 </label>
 <input type="range" min={6} max={20} step={0.5} value={fdReturn}
 onChange={e => setFdReturn(Number(e.target.value))}
 style={{ width: '100%', marginTop: '8px', accentColor: 'var(--signal-gold)' }} />
 <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--slate)' }}>
 <span>6%</span><span>20%</span>
 </div>
 </div>

 {/* TER Gap */}
 <div>
 <label style={{ fontSize: '0.78rem', color: 'var(--slate)', display: 'flex', justifyContent: 'space-between' }}>
 <span>TER: Direct / Regular</span>
 <span className="font-mono" style={{ color: 'var(--accent-bearish)' }}>{fdDirectTer}% / {fdRegularTer}%</span>
 </label>
 <div style={{ display: 'flex', gap: '8px', marginTop: '8px', alignItems: 'center' }}>
 <input type="range" min={0.1} max={1.5} step={0.05} value={fdDirectTer}
 onChange={e => setFdDirectTer(Number(e.target.value))}
 style={{ width: '50%', accentColor: '#00ffb4' }} />
 <input type="range" min={0.5} max={2.5} step={0.05} value={fdRegularTer}
 onChange={e => setFdRegularTer(Number(e.target.value))}
 style={{ width: '50%', accentColor: 'var(--accent-bearish)' }} />
 </div>
 <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--slate)' }}>
 <span style={{ color: '#00ffb4' }}>↑ Direct (0.1–1.5%)</span><span style={{ color: 'var(--accent-bearish)' }}>↑ Regular (0.5–2.5%)</span>
 </div>
 </div>
 </div>

 {/* Formula badge */}
 <div style={{ marginTop: '18px', padding: '10px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', fontSize: '0.72rem', fontFamily: "'IBM Plex Mono',monospace", color: 'var(--slate)', borderLeft: '3px solid var(--signal-gold)' }}>
 W_drag(N) = P₀ × [FVA(r−c_D, N) − FVA(r−c_R, N)] &nbsp;|&nbsp; FVA(g,N) = ((1+g)^N − 1) / g &nbsp;|&nbsp; Monthly compounding
 &nbsp;| For education only. Not investment advice.
 </div>
 </div>
 );
 })()}
 </div>

 {/* Macro Stress Test Scenarios */}
 <div className="glass-panel panel-appear" style={{ padding: '24px' }}>
 <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: 'var(--accent-bearish)' }}>
 <ShieldAlert size={18} />
 <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Macro Stress Testing Scenarios</h3>
 </div>

 {(() => {
 const selectedScenario = auditResult.stress_tests[stressScenarioIndex] || auditResult.stress_tests[0];
 const intensity = stressIntensity / 100;
 const scaledLoss = selectedScenario ? selectedScenario.estimated_loss_inr * intensity : 0;
 const scaledImpact = selectedScenario ? selectedScenario.portfolio_impact_pct * intensity : 0;
 return (
 <div className="portfolio-stress-control">
 <div className="portfolio-stress-control-header">
 <div>
 <div className="cockpit-card-label"><SlidersHorizontal size={15} /> SCENARIO EXPLORER</div>
 <strong>What would a partial shock look like?</strong>
 </div>
 <div className="font-mono portfolio-stress-loss">-₹{scaledLoss.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
 </div>
 <div className="portfolio-stress-tabs" role="tablist" aria-label="Stress scenarios">
 {auditResult.stress_tests.map((scenario, index) => (
 <button key={scenario.scenario} type="button" role="tab" aria-selected={stressScenarioIndex === index} className={stressScenarioIndex === index ? 'portfolio-stress-tab active' : 'portfolio-stress-tab'} onClick={() => setStressScenarioIndex(index)}>
 {scenario.scenario.split(' (')[0]}
 </button>
 ))}
 </div>
 <label className="portfolio-stress-slider-label" htmlFor="stress-intensity"><span>Shock intensity</span><span>{stressIntensity}% of scenario</span></label>
 <input id="stress-intensity" className="portfolio-stress-slider" type="range" min="0" max="100" step="5" value={stressIntensity} onChange={(event) => setStressIntensity(Number(event.target.value))} />
 <div className="portfolio-stress-scale"><span>0% impact</span><span>Estimated impact: {scaledImpact.toFixed(1)}%</span><span>100% scenario</span></div>
 <p className="portfolio-stress-note">Illustrative historical stress framing based on the audit scenario. It is not a forecast or a recommendation.</p>
 </div>
 );
 })()}

 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
 {auditResult.stress_tests.map((st, idx) => (
 <div key={idx} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)', padding: '16px', borderRadius: '12px' }}>
 <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--ink)', marginBottom: '8px' }}>
 {st.scenario}
 </div>
 <div className="font-mono" style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--accent-bearish)' }}>
 -₹{st.estimated_loss_inr.toLocaleString('en-IN')}
 </div>
 <div style={{ fontSize: '0.74rem', color: 'var(--slate)', marginTop: '4px' }}>
 Impact: {st.portfolio_impact_pct}% of total portfolio
 </div>
 </div>
 ))}
 </div>
 </div>

 <div className="pipeline-module-footer">
 <span className="pipeline-module-footer-label">PORTFOLIO → OPTIMIZE</span>
 <button className="pipeline-cta" onClick={() => onNavigate && onNavigate('mutualfunds')}>
 ↗ Find Direct Plan Alternatives → Mutual Funds
 </button>
 </div>
 </>
 )}

 </div>
 );
}
