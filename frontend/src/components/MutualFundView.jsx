/**
 * MutualFundView.jsx — Mutual Fund Analyzer & Fee Audit Component
 *
 * Features:
 * - Search bar with debounced autocomplete for ~1,500+ AMFI mutual fund schemes
 * - Fund Identity Card: Scheme Name, AMC, Category, Direct vs Regular Plan Badge, Current NAV
 * - Performance & Risk Grid: 1Y/3Y/5Y CAGR, Max Drawdown, Volatility, Sharpe Ratio
 * - Direct vs Regular Compounding Cost Audit Calculator:
 * Interactive monthly SIP slider (₹1,000 - ₹1,00,000) displaying wealth lost to distributor
 * commissions (1.25% expense ratio delta) over 5Y, 10Y, 20Y, and 30Y investment horizons.
 * - Compliant: Zero directional calls. Pure risk-return pattern metrics.
 */

import React, { useState, useEffect, useRef } from 'react';
import { Search, TrendingUp, ShieldAlert, Award, Calculator, Info, RefreshCw, AlertTriangle, CheckCircle } from 'lucide-react';

const API_BASE_URL = '';

/** Quick-audit popular mutual fund choices — schemeCode from AMFI/mfapi.in */
const POPULAR_FUNDS = [
 { name: 'Parag Parikh Flexi Cap', schemeCode: '122639', query: 'Parag Parikh Flexi Cap Direct' },
 { name: 'HDFC Flexi Cap', schemeCode: '118955', query: 'HDFC Flexi Cap Direct' },
 { name: 'SBI Small Cap', schemeCode: '125497', query: 'SBI Small Cap Direct' },
 { name: 'ICICI Bluechip', schemeCode: '120586', query: 'ICICI Prudential Large Cap Direct' },
 { name: 'Axis Midcap', schemeCode: '120505', query: 'Axis Midcap Direct' },
 { name: 'Nippon Small Cap', schemeCode: '118778', query: 'Nippon India Small Cap Direct' },
 { name: 'Mirae Large Cap', schemeCode: '118825', query: 'Mirae Asset Large Cap Direct' },
 { name: 'SBI Bluechip Direct', schemeCode: '119598', query: 'SBI Large Cap Direct' },
];

export default function MutualFundView() {
 // Default popular scheme: 122640 (Parag Parikh Flexi Cap Fund - Regular Plan - Growth)
 const [selectedSchemeCode, setSelectedSchemeCode] = useState('122640');
 const [searchQuery, setSearchQuery] = useState('');
 const [searchResults, setSearchResults] = useState([]);
 const [isSearching, setIsSearching] = useState(false);
 const [showDropdown, setShowDropdown] = useState(false);

 const [fundData, setFundData] = useState(null);
 const [isLoadingFund, setIsLoadingFund] = useState(true);
 const [fundError, setFundError] = useState(null);

 // Interactive SIP Calculator State
 const [monthlySip, setMonthlySip] = useState(10000);

 const dropdownRef = useRef(null);

 // ── 1. Debounced Search Effect ─────────────────────────────────────────────
 useEffect(() => {
 if (!searchQuery || searchQuery.trim().length < 2) {
 setSearchResults([]);
 setIsSearching(false);
 return;
 }

 const timer = setTimeout(() => {
 setIsSearching(true);
 fetch(`${API_BASE_URL}/api/mf/search?q=${encodeURIComponent(searchQuery.trim())}`)
 .then((res) => (res.ok ? res.json() : []))
 .then((data) => {
 setSearchResults(data);
 setIsSearching(false);
 setShowDropdown(true);
 })
 .catch((err) => {
 console.error('MF search error:', err);
 setIsSearching(false);
 });
 }, 350);

 return () => clearTimeout(timer);
 }, [searchQuery]);

 // Close dropdown on outside click
 useEffect(() => {
 const handleClickOutside = (event) => {
 if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
 setShowDropdown(false);
 }
 };
 document.addEventListener('mousedown', handleClickOutside);
 return () => document.removeEventListener('mousedown', handleClickOutside);
 }, []);

 // ── 2. Fetch Fund Analysis Effect ─────────────────────────────────────────
 useEffect(() => {
 if (!selectedSchemeCode) return;

 const controller = new AbortController();
 setIsLoadingFund(true);
 setFundError(null);

 fetch(`${API_BASE_URL}/api/mf/${selectedSchemeCode}/analyze`, {
 signal: controller.signal,
 })
 .then((res) => {
 if (!res.ok) {
 throw new Error(`Server returned HTTP ${res.status}`);
 }
 return res.json();
 })
 .then((json) => {
 setFundData(json);
 setIsLoadingFund(false);
 })
 .catch((err) => {
 if (err.name !== 'AbortError') {
 console.error('Failed to fetch MF analysis:', err);
 setFundError('Unable to load mutual fund analysis. Please try another scheme.');
 setIsLoadingFund(false);
 }
 });

 return () => controller.abort();
 }, [selectedSchemeCode]);


 /**
 * handleQuickSelect — instantly loads a fund when a Quick Audit chip is clicked.
 * Uses the pre-mapped schemeCode for an instant data load, bypassing the search
 * dropdown round-trip. Also updates the search label so the user sees the name.
 */
 const handleQuickSelect = (fund) => {
 setSelectedSchemeCode(String(fund.schemeCode));
 setSearchQuery(fund.query);
 setShowDropdown(false);
 setSearchResults([]);
 };

 const handleSelectScheme = (scheme) => {
 setSelectedSchemeCode(String(scheme.schemeCode));
 setSearchQuery(scheme.schemeName);
 setShowDropdown(false);
 };

 return (
 <div style={{ maxWidth: '1440px', margin: '0 auto' }}>

 {/* ── Search Bar Section ───────────────────────────────────────────── */}
 <div className="glass-panel panel-appear" style={{ padding: '20px 24px', marginBottom: '24px', position: 'relative', zIndex: 50 }}>
 <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
 <TrendingUp size={20} style={{ color: 'var(--signal-gold)' }} />
 <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--ink)' }}>Mutual Fund Risk & Cost Audit</h2>
 </div>

 <div ref={dropdownRef} style={{ position: 'relative', width: '100%', maxWidth: '640px' }}>
 <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
 <Search size={18} style={{ position: 'absolute', left: '14px', color: 'var(--slate)' }} />
 <input
 type="text"
 placeholder="Search ~1,500+ Indian mutual funds (e.g. Parag Parikh, HDFC Mid Cap, SBI Small Cap)..."
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
 style={{
 width: '100%',
 padding: '12px 14px 12px 42px',
 background: 'rgba(255, 255, 255, 0.05)',
 border: '1px solid var(--glass-border)',
 borderRadius: '12px',
 color: 'var(--ink)',
 fontSize: '0.88rem',
 outline: 'none',
 fontFamily: 'inherit',
 }}
 />
 {isSearching && (
 <RefreshCw className="spin" size={16} style={{ position: 'absolute', right: '14px', color: 'var(--signal-gold)' }} />
 )}
 </div>

 {/* Quick Popular Fund Chips */}
 <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
 <span style={{ fontSize: '0.75rem', color: 'var(--slate)', fontWeight: 600 }}>Quick Audit:</span>
 {POPULAR_FUNDS.map((fund) => {
 const isActive = selectedSchemeCode === String(fund.schemeCode);
 return (
 <button
 key={fund.name}
 onClick={() => handleQuickSelect(fund)}
 className="glass-pill"
 style={{
 fontSize: '0.75rem',
 cursor: 'pointer',
 background: isActive ? 'rgba(201,165,77,0.15)' : 'rgba(255, 255, 255, 0.04)',
 borderColor: isActive ? 'var(--signal-gold)' : 'rgba(255, 255, 255, 0.08)',
 color: isActive ? 'var(--signal-gold)' : 'var(--ink)',
 fontWeight: isActive ? 700 : 400,
 transition: 'all 0.15s',
 }}
 onMouseEnter={(e) => {
 if (!isActive) {
 e.currentTarget.style.borderColor = 'var(--signal-gold)';
 e.currentTarget.style.color = 'var(--signal-gold)';
 }
 }}
 onMouseLeave={(e) => {
 if (!isActive) {
 e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
 e.currentTarget.style.color = 'var(--ink)';
 }
 }}
 >
 {isActive ? '● ' : ''}{fund.name}
 </button>
 );
 })}
 </div>

 {/* Search Dropdown Results — Elevated z-index & solid background */}
 {showDropdown && searchResults.length > 0 && (
 <div
 style={{
 position: 'absolute',
 top: '100%',
 left: 0,
 right: 0,
 marginTop: '8px',
 background: '#111520',
 border: '1px solid rgba(201, 165, 77, 0.4)',
 borderRadius: '12px',
 maxHeight: '300px',
 overflowY: 'auto',
 zIndex: 9999,
 boxShadow: '0 24px 64px rgba(0, 0, 0, 0.95)',
 }}
 >
 {searchResults.map((scheme) => (
 <button
 key={scheme.schemeCode}
 onClick={() => handleSelectScheme(scheme)}
 style={{
 width: '100%',
 textAlign: 'left',
 padding: '12px 16px',
 borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
 background: 'transparent',
 color: 'var(--ink)',
 fontSize: '0.85rem',
 cursor: 'pointer',
 display: 'flex',
 flexDirection: 'column',
 gap: '2px',
 }}
 onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)')}
 onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
 >
 <span style={{ fontWeight: 600 }}>{scheme.schemeName}</span>
 <span className="font-mono" style={{ fontSize: '0.75rem', color: 'var(--slate)' }}>
 AMFI Code: {scheme.schemeCode}
 </span>
 </button>
 ))}
 </div>
 )}
 </div>
 </div>

 {/* ── Loading Skeleton ────────────────────────────────────────────── */}
 {isLoadingFund && (
 <div className="glass-panel panel-appear skeleton-pulse" style={{ padding: '32px' }}>
 <div style={{ height: '30px', width: '60%', background: 'rgba(255,255,255,0.06)', borderRadius: '8px', marginBottom: '16px' }} />
 <div style={{ height: '80px', background: 'rgba(255,255,255,0.04)', borderRadius: '12px', marginBottom: '20px' }} />
 <div style={{ height: '160px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px' }} />
 </div>
 )}

 {/* ── Error Banner ────────────────────────────────────────────────── */}
 {fundError && (
 <div className="glass-panel panel-appear" style={{ padding: '24px', borderColor: 'rgba(255,92,108,0.4)' }}>
 <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--accent-bearish)' }}>
 <AlertTriangle size={20} />
 <h4 style={{ fontWeight: 600, fontSize: '0.95rem' }}>Fund Analysis Error</h4>
 </div>
 <p style={{ fontSize: '0.86rem', color: 'var(--slate-light)', marginTop: '8px' }}>{fundError}</p>
 </div>
 )}

 {/* ── Fund Details Content ────────────────────────────────────────── */}
 {!isLoadingFund && !fundError && fundData && (
 <>
 {/* Fund Identity Card */}
 <div className="glass-panel panel-appear" style={{ padding: '24px', marginBottom: '24px' }}>
 <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
 <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
 <div>
 <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
 <span
 className={`glass-pill ${fundData.is_direct_plan ? 'badge-rally' : 'badge-gold'}`}
 style={{ fontSize: '0.78rem' }}
 >
 {fundData.plan_type}
 </span>
 <span className="glass-pill" style={{ color: 'var(--slate)', fontSize: '0.75rem' }}>
 {fundData.scheme_category}
 </span>
 <span className="glass-pill" style={{ color: 'var(--signal-gold)', fontSize: '0.75rem', borderColor: 'rgba(201,165,77,0.3)' }}>
 Min SIP: ₹{fundData.min_sip_amount || 100}/mo
 </span>
 </div>
 <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--ink)' }}>{fundData.scheme_name}</h1>
 <p style={{ fontSize: '0.86rem', color: 'var(--slate-light)', marginTop: '4px' }}>
 Fund House: <strong style={{ color: 'var(--ink)' }}>{fundData.fund_house}</strong> · Type: {fundData.scheme_type}
 </p>
 </div>

 <div style={{ textAlign: 'right' }}>
 <div style={{ fontSize: '0.75rem', color: 'var(--slate)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
 Latest NAV
 </div>
 <div className="font-mono" style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--signal-gold)' }}>
 ₹{fundData.current_nav.toFixed(2)}
 </div>
 <div style={{ fontSize: '0.74rem', color: 'var(--slate)', marginTop: '2px' }}>
 as of {fundData.nav_date} ({fundData.nav_history_count} daily records)
 </div>
 </div>
 </div>

 {(fundData.as_of || fundData.fetched_at) && (
 <div style={{ fontSize: '0.70rem', color: 'var(--slate)', fontFamily: "'IBM Plex Mono', monospace", marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
 <span style={{ opacity: 0.6 }}>DATA AS OF</span>
 <span>{new Date(fundData.as_of || fundData.fetched_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true })}</span>
 <span style={{ opacity: 0.4 }}>· cached 23h</span>
 </div>
 )}
 </div>
 </div>

 {/* Performance & Risk Metrics Grid */}
 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '24px' }}>

 {/* Returns Card */}
 <div className="glass-panel panel-appear" style={{ padding: '20px' }}>
 <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', color: 'var(--signal-gold)' }}>
 <Award size={18} />
 <h3 style={{ fontSize: '0.95rem', fontWeight: 600 }}>Annualised CAGR Returns</h3>
 </div>
 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
 <div>
 <div style={{ fontSize: '0.72rem', color: 'var(--slate)' }}>1 Year</div>
 <div className="font-mono" style={{ fontSize: '1.2rem', fontWeight: 700, color: (fundData.returns.cagr_1y || 0) >= 0 ? 'var(--accent-bullish)' : 'var(--accent-bearish)' }}>
 {fundData.returns.cagr_1y !== null ? `${fundData.returns.cagr_1y > 0 ? '+' : ''}${fundData.returns.cagr_1y}%` : 'N/A'}
 </div>
 </div>
 <div>
 <div style={{ fontSize: '0.72rem', color: 'var(--slate)' }}>3 Year</div>
 <div className="font-mono" style={{ fontSize: '1.2rem', fontWeight: 700, color: (fundData.returns.cagr_3y || 0) >= 0 ? 'var(--accent-bullish)' : 'var(--accent-bearish)' }}>
 {fundData.returns.cagr_3y !== null ? `${fundData.returns.cagr_3y > 0 ? '+' : ''}${fundData.returns.cagr_3y}%` : 'N/A'}
 </div>
 </div>
 <div>
 <div style={{ fontSize: '0.72rem', color: 'var(--slate)' }}>5 Year</div>
 <div className="font-mono" style={{ fontSize: '1.2rem', fontWeight: 700, color: (fundData.returns.cagr_5y || 0) >= 0 ? 'var(--accent-bullish)' : 'var(--accent-bearish)' }}>
 {fundData.returns.cagr_5y !== null ? `${fundData.returns.cagr_5y > 0 ? '+' : ''}${fundData.returns.cagr_5y}%` : 'N/A'}
 </div>
 </div>
 </div>
 </div>

 {/* Risk & Volatility Card */}
 <div className="glass-panel panel-appear" style={{ padding: '20px' }}>
 <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', color: 'var(--accent-bearish)' }}>
 <ShieldAlert size={18} />
 <h3 style={{ fontSize: '0.95rem', fontWeight: 600 }}>Risk & Drawdown Profile</h3>
 </div>
 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
 <div>
 <div style={{ fontSize: '0.72rem', color: 'var(--slate)' }}>Max Historical Drawdown</div>
 <div className="font-mono" style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--accent-bearish)' }}>
 {fundData.risk.max_drawdown_pct.toFixed(1)}%
 </div>
 </div>
 <div>
 <div style={{ fontSize: '0.72rem', color: 'var(--slate)' }}>Annualised Volatility</div>
 <div className="font-mono" style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--ink)' }}>
 {fundData.risk.volatility_annualised !== null ? `${fundData.risk.volatility_annualised}%` : 'N/A'}
 </div>
 </div>
 </div>
 </div>

 {/* Sharpe Ratio Card */}
 <div className="glass-panel panel-appear" style={{ padding: '20px' }}>
 <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', color: 'var(--signal-gold)' }}>
 <Calculator size={18} />
 <h3 style={{ fontSize: '0.95rem', fontWeight: 600 }}>Sharpe Risk-Adjusted Ratio</h3>
 </div>
 <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
 <div className="font-mono" style={{ fontSize: '1.8rem', fontWeight: 700, color: (fundData.risk.sharpe_ratio || 0) >= 1.0 ? 'var(--accent-bullish)' : 'var(--ink)' }}>
 {fundData.risk.sharpe_ratio !== null ? fundData.risk.sharpe_ratio.toFixed(2) : 'N/A'}
 </div>
 <div style={{ fontSize: '0.76rem', color: 'var(--slate)' }}>
 (Benchmark Risk-Free Rf = 6.5% India Gilt)
 </div>
 </div>
 </div>
 </div>

 {/* ── Direct vs Regular Compounding Cost Audit Calculator ────────────── */}
 <div className="glass-panel panel-appear" style={{ padding: '24px', marginBottom: '24px', borderColor: 'rgba(201, 165, 77, 0.3)' }}>
 <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
 <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
 <Calculator size={20} style={{ color: 'var(--signal-gold)' }} />
 <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--ink)' }}>
 Direct vs. Regular Plan Compounding Cost Audit
 </h3>
 </div>

 {!fundData.is_direct_plan && (
 <span
 className="glass-pill badge-selloff"
 style={{
 fontSize: '0.78rem',
 maxWidth: '100%',
 overflow: 'hidden',
 textOverflow: 'ellipsis',
 whiteSpace: 'nowrap',
 }}
 >
 Regular Plan Detected — Paying ~1.25% p.a. Distributor Commission
 </span>
 )}
 </div>

 <p style={{ fontSize: '0.86rem', color: 'var(--slate-light)', lineHeight: 1.5, marginBottom: '20px' }}>
 Regular mutual fund plans pay an ongoing hidden 1.0%–1.5% yearly commission to distributors out of your portfolio NAV.
 See how much wealth is lost over time by holding a Regular plan instead of a Direct plan:
 </p>

 {/* Monthly SIP Slider & Flexible Input */}
 <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '16px 20px', borderRadius: '12px', marginBottom: '20px' }}>
 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
 <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--ink)' }}>
 Monthly SIP Investment Amount (Min ₹{fundData.min_sip_amount || 100}):
 </span>
 <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
 <span style={{ fontSize: '1rem', color: 'var(--signal-gold)', fontWeight: 700 }}>₹</span>
 <input
 type="number"
 min={fundData.min_sip_amount || 100}
 max="1000000"
 step="100"
 value={monthlySip}
 onChange={(e) => setMonthlySip(Math.max(Number(e.target.value), fundData.min_sip_amount || 100))}
 className="font-mono"
 style={{
 width: '120px',
 padding: '6px 10px',
 background: 'rgba(0,0,0,0.4)',
 border: '1px solid var(--signal-gold)',
 borderRadius: '6px',
 color: 'var(--signal-gold)',
 fontSize: '1rem',
 fontWeight: 700,
 outline: 'none',
 }}
 />
 <span style={{ fontSize: '0.8rem', color: 'var(--slate)' }}>/ month</span>
 </div>
 </div>
 <input
 type="range"
 min={fundData.min_sip_amount || 100}
 max="100000"
 step={fundData.min_sip_amount <= 500 ? 100 : 500}
 value={monthlySip}
 onChange={(e) => setMonthlySip(Math.max(Number(e.target.value), fundData.min_sip_amount || 100))}
 style={{ width: '100%', accentColor: 'var(--signal-gold)', cursor: 'pointer' }}
 />
 </div>

 {/* Projections Table */}
 <div style={{ overflowX: 'auto' }}>
 <table className="data-table">
 <thead>
 <tr>
 <th>Time Horizon</th>
 <th>Total Invested</th>
 <th>Direct Plan Value ({fundData.fee_audit.assumed_direct_cagr_pct}%)</th>
 <th>Regular Plan Value ({fundData.fee_audit.assumed_regular_cagr_pct}%)</th>
 <th>Wealth Lost to Commissions</th>
 </tr>
 </thead>
 <tbody>
 {['5y', '10y', '20y', '30y'].map((horizon) => {
 // Re-calculate projection dynamically based on user slider
 const years = parseInt(horizon, 10);
 const iDirect = (fundData.fee_audit.assumed_direct_cagr_pct / 100) / 12;
 const iReg = (fundData.fee_audit.assumed_regular_cagr_pct / 100) / 12;
 const n = years * 12;

 const fvDirect = monthlySip * (((1 + iDirect) ** n - 1) / iDirect) * (1 + iDirect);
 const fvReg = monthlySip * (((1 + iReg) ** n - 1) / iReg) * (1 + iReg);
 const lost = Math.max(fvDirect - fvReg, 0);

 return (
 <tr key={horizon}>
 <td style={{ fontWeight: 600, color: 'var(--ink)' }}>{years} Years</td>
 <td className="font-mono">₹{(monthlySip * 12 * years).toLocaleString('en-IN')}</td>
 <td className="font-mono" style={{ color: 'var(--accent-bullish)', fontWeight: 600 }}>
 ₹{Math.round(fvDirect).toLocaleString('en-IN')}
 </td>
 <td className="font-mono" style={{ color: 'var(--slate-light)' }}>
 ₹{Math.round(fvReg).toLocaleString('en-IN')}
 </td>
 <td className="font-mono" style={{ color: 'var(--accent-bearish)', fontWeight: 700 }}>
 -₹{Math.round(lost).toLocaleString('en-IN')}
 </td>
 </tr>
 );
 })}
 </tbody>
 </table>
 </div>
 </div>
 </>
 )}

 {fundData && (
 <div className="pipeline-module-footer">
 <span className="pipeline-module-footer-label">FUNDS → LEARN</span>
 <button className="pipeline-cta" onClick={() => {}}>
 Understand CAGR Formula → Academy
 </button>
 </div>
 )}
 </div>
 );
}
