/**
 * EducationAcademyView.jsx — Masterclass & Interactive Academy
 *
 * Design Thesis: Terminal precision, retail warmth.
 * Translates complex quantitative finance, mutual fund math, machine learning models,
 * risk rules, and financial planning into intuitive, animated masterclasses with exact
 * formulas, interactive calculators, and real-world case studies.
 */

import React, { useState, useEffect } from 'react';
import {
 BookOpen, TrendingUp, ShieldAlert, Cpu, Activity, Zap,
 CheckCircle2, AlertTriangle, ArrowRight, RefreshCw, BarChart2, Info, ChevronRight,
 PieChart, Calculator, PiggyBank, Target, Scale
} from 'lucide-react';

// ─── ANIMATED CHART SIMULATOR COMPONENT ───────────────────────────────────────

/**
 * AnimatedStrategySimulator — Interactive step-by-step visual chart animation
 * demonstrating how EMA Golden Cross, RSI Divergence, and Bollinger Squeeze unfold.
 */
function AnimatedStrategySimulator() {
 const [currentStep, setCurrentStep] = useState(0);
 const [isPlaying, setIsPlaying] = useState(true);

 const STEPS = [
 {
 title: "1. Consolidation & Volatility Squeeze",
 description: "Stock price trades in a tight range ₹1,200 – ₹1,220. Bollinger Bands contract sharply (Squeeze). Volatility reaches a 60-day low.",
 price: 1210,
 ema20: 1208,
 ema50: 1215,
 rsi: 48,
 bbUpper: 1225,
 bbLower: 1195,
 status: "BUILDING MOMENTUM",
 statusColor: 'var(--amber-gold)',
 candleType: "neutral",
 },
 {
 title: "2. Golden Cross Signal (EMA 20 > EMA 50)",
 description: "Fast EMA 20 crosses above slow EMA 50 on heavy volume. RSI moves from 48 to 62, confirming strong buying pressure.",
 price: 1245,
 ema20: 1230,
 ema50: 1222,
 rsi: 62,
 bbUpper: 1255,
 bbLower: 1185,
 status: "BULLISH BREAKOUT",
 statusColor: 'var(--rally)',
 candleType: "bullish",
 },
 {
 title: "3. Expansion & Upper Band Riding",
 description: "Price surges to ₹1,320, riding above the Upper Bollinger Band. %B exceeds 1.0. Momentum reaches peak acceleration.",
 price: 1320,
 ema20: 1280,
 ema50: 1245,
 rsi: 78,
 bbUpper: 1315,
 bbLower: 1175,
 status: "STRONG OVERBOUGHT",
 statusColor: 'var(--selloff)',
 candleType: "bullish",
 },
 {
 title: "4. RSI Bearish Divergence Warning",
 description: "Price makes a new high at ₹1,340, but RSI drops from 78 to 66 (Lower High). ML Model detects institutional distribution.",
 price: 1340,
 ema20: 1310,
 ema50: 1265,
 rsi: 66,
 bbUpper: 1350,
 bbLower: 1190,
 status: "WARNING: DIVERGENCE",
 statusColor: 'var(--selloff)',
 candleType: "bearish",
 },
 {
 title: "5. ATR Controlled Exit & Profit Booking",
 description: "Price breaks below EMA 20 at ₹1,295. Dynamic ATR Stop Loss triggers, locking in +7.0% net gain while avoiding full trend reversal drop.",
 price: 1295,
 ema20: 1302,
 ema50: 1278,
 rsi: 42,
 bbUpper: 1360,
 bbLower: 1210,
 status: "TRADE COMPLETED",
 statusColor: 'var(--amber-gold)',
 candleType: "exit",
 },
 ];

 useEffect(() => {
 if (!isPlaying) return;
 const interval = setInterval(() => {
 setCurrentStep((prev) => (prev + 1) % STEPS.length);
 }, 4500);
 return () => clearInterval(interval);
 }, [isPlaying]);

 const step = STEPS[currentStep];

 return (
 <div className="glass-card" style={{ border: '1px solid rgba(201,165,77,0.3)', padding: '24px', marginBottom: '32px' }}>
 {/* Header */}
 <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
 <div>
 <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
 <Zap size={20} color="var(--amber-gold)" />
 <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '1.2rem', fontWeight: 700, color: 'var(--ink)' }}>
 Live Animated Case Study: Reliance Breakout Execution
 </h3>
 </div>
 <p style={{ fontSize: '0.82rem', color: 'var(--slate)', fontFamily: "'Space Grotesk', sans-serif", marginTop: '2px' }}>
 Watch step-by-step how EMA 20/50, RSI Divergence, and ATR Stop-Loss work together in real market conditions.
 </p>
 </div>

 <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
 <button
 onClick={() => setIsPlaying(p => !p)}
 style={{
 fontFamily: "'IBM Plex Mono', monospace",
 fontSize: '0.76rem',
 padding: '6px 12px',
 borderRadius: '6px',
 border: '1px solid rgba(201,165,77,0.3)',
 background: isPlaying ? 'rgba(201,165,77,0.15)' : 'rgba(255,255,255,0.05)',
 color: 'var(--amber-gold)',
 cursor: 'pointer',
 }}
 >
 {isPlaying ? '⏸ Pause Simulation' : '▶ Play Animation'}
 </button>
 </div>
 </div>

 {/* Progress timeline bars */}
 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px', marginBottom: '20px' }}>
 {STEPS.map((s, idx) => (
 <button
 key={idx}
 onClick={() => { setCurrentStep(idx); setIsPlaying(false); }}
 style={{
 height: '6px',
 borderRadius: '3px',
 background: idx === currentStep ? 'var(--amber-gold)' : idx < currentStep ? 'var(--rally)' : 'rgba(255,255,255,0.1)',
 border: 'none',
 cursor: 'pointer',
 transition: 'all 0.3s ease',
 }}
 />
 ))}
 </div>

 {/* Interactive Simulation Display Grid */}
 <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
 {/* Animated Visual Gauge Box */}
 <div style={{
 background: '#0B0E13',
 borderRadius: '12px',
 border: '1px solid rgba(255,255,255,0.08)',
 padding: '20px',
 display: 'grid',
 gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
 gap: '16px',
 position: 'relative',
 overflow: 'hidden'
 }}>
 {/* Animated Background Pulse */}
 <div style={{
 position: 'absolute',
 top: 0, left: 0, right: 0, bottom: 0,
 background: `radial-gradient(circle at 50% 50%, ${step.statusColor}10 0%, transparent 70%)`,
 transition: 'all 0.8s ease'
 }} />

 <div>
 <div style={{ fontSize: '0.7rem', color: 'var(--slate)', fontFamily: "'Space Grotesk', sans-serif", textTransform: 'uppercase' }}>Stock Price</div>
 <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '1.5rem', fontWeight: 700, color: 'var(--ink)' }}>₹{step.price}</div>
 </div>

 <div>
 <div style={{ fontSize: '0.7rem', color: 'var(--slate)', fontFamily: "'Space Grotesk', sans-serif", textTransform: 'uppercase' }}>EMA 20 vs 50</div>
 <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '1.1rem', fontWeight: 600, color: step.ema20 > step.ema50 ? 'var(--rally)' : 'var(--selloff)' }}>
 ₹{step.ema20} / ₹{step.ema50}
 </div>
 </div>

 <div>
 <div style={{ fontSize: '0.7rem', color: 'var(--slate)', fontFamily: "'Space Grotesk', sans-serif", textTransform: 'uppercase' }}>RSI (14)</div>
 <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '1.1rem', fontWeight: 600, color: step.rsi > 70 ? 'var(--selloff)' : step.rsi < 30 ? 'var(--rally)' : 'var(--amber-gold)' }}>
 {step.rsi} {step.rsi > 70 ? '(Overbought)' : step.rsi < 30 ? '(Oversold)' : '(Neutral)'}
 </div>
 </div>

 <div>
 <div style={{ fontSize: '0.7rem', color: 'var(--slate)', fontFamily: "'Space Grotesk', sans-serif", textTransform: 'uppercase' }}>Status Signal</div>
 <div style={{
 display: 'inline-block',
 fontFamily: "'Space Grotesk', sans-serif",
 fontSize: '0.78rem',
 fontWeight: 700,
 color: step.statusColor,
 background: `${step.statusColor}18`,
 border: `1px solid ${step.statusColor}40`,
 padding: '4px 10px',
 borderRadius: '6px',
 marginTop: '4px'
 }}>
 {step.status}
 </div>
 </div>
 </div>

 {/* Step Explanation Callout */}
 <div style={{
 background: 'rgba(255,255,255,0.03)',
 borderLeft: `4px solid ${step.statusColor}`,
 padding: '16px 20px',
 borderRadius: '0 10px 10px 0',
 }}>
 <h4 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '1.05rem', color: 'var(--ink)', marginBottom: '6px' }}>
 {step.title}
 </h4>
 <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '0.92rem', color: 'var(--slate-light)', lineHeight: 1.6 }}>
 {step.description}
 </p>
 </div>
 </div>
 </div>
 );
}

// ─── INTERACTIVE SIP CALCULATOR WIDGET ───────────────────────────────────────

function SIPCalculatorWidget() {
 const [monthlySIP, setMonthlySIP] = useState(10000);
 const [tenureYears, setTenureYears] = useState(10);
 const [expectedReturn, setExpectedReturn] = useState(12);

 const monthlyRate = expectedReturn / 12 / 100;
 const totalMonths = tenureYears * 12;
 const totalInvested = monthlySIP * totalMonths;
 const totalWealth = monthlyRate === 0
 ? totalInvested
 : monthlySIP * ((Math.pow(1 + monthlyRate, totalMonths) - 1) / monthlyRate) * (1 + monthlyRate);
 const estimatedReturns = Math.max(0, totalWealth - totalInvested);

 const returnRatio = totalWealth > 0 ? (estimatedReturns / totalWealth) * 100 : 0;
 const investedRatio = totalWealth > 0 ? (totalInvested / totalWealth) * 100 : 100;

 return (
 <div className="glass-card" style={{ border: '1px solid rgba(201,165,77,0.3)', padding: '24px', marginBottom: '28px' }}>
 <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
 <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
 <Calculator size={22} color="var(--amber-gold)" />
 <div>
 <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '1.25rem', fontWeight: 700, color: 'var(--ink)' }}>
 Interactive SIP Wealth Compounder
 </h3>
 <p style={{ fontSize: '0.82rem', color: 'var(--slate)', fontFamily: "'Space Grotesk', sans-serif", marginTop: '2px' }}>
 Simulate monthly Systematic Investment Plan (SIP) growth powered by rupee cost averaging and compound interest.
 </p>
 </div>
 </div>
 <span style={{
 fontFamily: "'IBM Plex Mono', monospace",
 fontSize: '0.72rem',
 fontWeight: 700,
 color: 'var(--rally)',
 background: 'rgba(61,220,132,0.12)',
 border: '1px solid rgba(61,220,132,0.3)',
 padding: '4px 10px',
 borderRadius: '6px'
 }}>
 PILLAR 2 WIDGET
 </span>
 </div>

 {/* Formula Callout */}
 <div style={{
 background: '#0B0E13',
 border: '1px solid rgba(201,165,77,0.2)',
 borderRadius: '10px',
 padding: '14px 16px',
 marginBottom: '20px'
 }}>
 <div style={{ fontSize: '0.7rem', color: 'var(--amber-gold)', fontFamily: "'Space Grotesk', sans-serif", textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>
 SIP Compounding Formula
 </div>
 <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.92rem', color: 'var(--ink)', fontWeight: 600 }}>
 M = P × [ ((1 + i)^n - 1) / i ] × (1 + i)
 </div>
 <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '0.78rem', color: 'var(--slate)', marginTop: '4px' }}>
 P = Monthly Amount (₹{monthlySIP.toLocaleString('en-IN')}) | i = Monthly Interest Rate ({(expectedReturn / 12).toFixed(3)}%) | n = Total Months ({totalMonths})
 </div>
 </div>

 {/* Inputs Grid */}
 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '24px' }}>
 {/* Input 1: Monthly SIP */}
 <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
 <label style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '0.88rem', fontWeight: 600, color: 'var(--ink)' }}>
 Monthly SIP Amount
 </label>
 <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '1rem', fontWeight: 700, color: 'var(--amber-gold)' }}>
 ₹{Number(monthlySIP).toLocaleString('en-IN')}
 </span>
 </div>
 <input
 type="range"
 min="500"
 max="100000"
 step="500"
 value={monthlySIP}
 onChange={(e) => setMonthlySIP(Number(e.target.value))}
 style={{ width: '100%', accentColor: 'var(--amber-gold)', cursor: 'pointer' }}
 />
 <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--slate)', fontFamily: "'IBM Plex Mono', monospace", marginTop: '6px' }}>
 <span>₹500</span>
 <span>₹50,000</span>
 <span>₹1,00,000</span>
 </div>
 </div>

 {/* Input 2: Investment Tenure */}
 <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
 <label style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '0.88rem', fontWeight: 600, color: 'var(--ink)' }}>
 Investment Tenure
 </label>
 <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '1rem', fontWeight: 700, color: 'var(--amber-gold)' }}>
 {tenureYears} Years
 </span>
 </div>
 <input
 type="range"
 min="1"
 max="30"
 step="1"
 value={tenureYears}
 onChange={(e) => setTenureYears(Number(e.target.value))}
 style={{ width: '100%', accentColor: 'var(--amber-gold)', cursor: 'pointer' }}
 />
 <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--slate)', fontFamily: "'IBM Plex Mono', monospace", marginTop: '6px' }}>
 <span>1 Yr</span>
 <span>15 Yrs</span>
 <span>30 Yrs</span>
 </div>
 </div>

 {/* Input 3: Expected Annual Return */}
 <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
 <label style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '0.88rem', fontWeight: 600, color: 'var(--ink)' }}>
 Expected Annual Return (%)
 </label>
 <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '1rem', fontWeight: 700, color: 'var(--rally)' }}>
 {expectedReturn}% p.a.
 </span>
 </div>
 <input
 type="range"
 min="1"
 max="30"
 step="0.5"
 value={expectedReturn}
 onChange={(e) => setExpectedReturn(Number(e.target.value))}
 style={{ width: '100%', accentColor: 'var(--rally)', cursor: 'pointer' }}
 />
 <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--slate)', fontFamily: "'IBM Plex Mono', monospace", marginTop: '6px' }}>
 <span>1% (Debt)</span>
 <span>12% (Nifty)</span>
 <span>30% (Alpha)</span>
 </div>
 </div>
 </div>

 {/* Output Summary Cards */}
 <div style={{
 background: '#0B0E13',
 borderRadius: '12px',
 border: '1px solid rgba(255,255,255,0.08)',
 padding: '20px',
 display: 'grid',
 gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
 gap: '16px',
 marginBottom: '16px'
 }}>
 <div>
 <div style={{ fontSize: '0.72rem', color: 'var(--slate)', fontFamily: "'Space Grotesk', sans-serif", textTransform: 'uppercase' }}>
 Total Out-of-Pocket Invested
 </div>
 <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '1.4rem', fontWeight: 700, color: 'var(--ink)', marginTop: '4px' }}>
 ₹{Math.round(totalInvested).toLocaleString('en-IN')}
 </div>
 </div>

 <div>
 <div style={{ fontSize: '0.72rem', color: 'var(--slate)', fontFamily: "'Space Grotesk', sans-serif", textTransform: 'uppercase' }}>
 Estimated Growth Returns
 </div>
 <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '1.4rem', fontWeight: 700, color: 'var(--rally)', marginTop: '4px' }}>
 +₹{Math.round(estimatedReturns).toLocaleString('en-IN')}
 </div>
 </div>

 <div>
 <div style={{ fontSize: '0.72rem', color: 'var(--slate)', fontFamily: "'Space Grotesk', sans-serif", textTransform: 'uppercase' }}>
 Total Projected Wealth Value
 </div>
 <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '1.55rem', fontWeight: 700, color: 'var(--amber-gold)', marginTop: '4px' }}>
 ₹{Math.round(totalWealth).toLocaleString('en-IN')}
 </div>
 </div>
 </div>

 {/* Visual Proportion Bar */}
 <div>
 <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem', fontFamily: "'Space Grotesk', sans-serif", color: 'var(--slate-light)', marginBottom: '6px' }}>
 <span>Invested Principal ({investedRatio.toFixed(1)}%)</span>
 <span style={{ color: 'var(--rally)' }}>Compounded Profit ({returnRatio.toFixed(1)}%)</span>
 </div>
 <div style={{ height: '10px', borderRadius: '5px', background: 'rgba(255,255,255,0.1)', overflow: 'hidden', display: 'flex' }}>
 <div style={{ width: `${investedRatio}%`, background: 'var(--slate)', transition: 'width 0.3s ease' }} />
 <div style={{ width: `${returnRatio}%`, background: 'var(--rally)', transition: 'width 0.3s ease' }} />
 </div>
 </div>
 </div>
 );
}

// ─── INTERACTIVE RULE OF 72 CALCULATOR WIDGET ───────────────────────────────

function RuleOf72Widget() {
 const [returnRate, setReturnRate] = useState(12);

 const yearsToDouble = returnRate > 0 ? (72 / returnRate).toFixed(1) : '0';

 const benchmarks = [
 { name: 'Savings Account', rate: 3.5, color: 'var(--slate)' },
 { name: 'Bank FD', rate: 6.5, color: 'var(--slate)' },
 { name: 'Nifty 50 Index', rate: 12.0, color: 'var(--amber-gold)' },
 { name: 'Clearward Quant Strategy', rate: 18.0, color: 'var(--rally)' },
 ];

 return (
 <div className="glass-card" style={{ border: '1px solid rgba(201,165,77,0.3)', padding: '24px', marginBottom: '28px' }}>
 <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
 <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
 <Zap size={22} color="var(--amber-gold)" />
 <div>
 <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '1.25rem', fontWeight: 700, color: 'var(--ink)' }}>
 Interactive Rule of 72 Doubling Time Calculator
 </h3>
 <p style={{ fontSize: '0.82rem', color: 'var(--slate)', fontFamily: "'Space Grotesk', sans-serif", marginTop: '2px' }}>
 Determine exactly how many years it takes for your initial investment to double at a target annual rate of return.
 </p>
 </div>
 </div>
 <span style={{
 fontFamily: "'IBM Plex Mono', monospace",
 fontSize: '0.72rem',
 fontWeight: 700,
 color: 'var(--rally)',
 background: 'rgba(61,220,132,0.12)',
 border: '1px solid rgba(61,220,132,0.3)',
 padding: '4px 10px',
 borderRadius: '6px'
 }}>
 PILLAR 4 WIDGET
 </span>
 </div>

 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', alignItems: 'center', marginBottom: '24px' }}>
 {/* Slider Box */}
 <div style={{ background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
 <label style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '0.9rem', fontWeight: 600, color: 'var(--ink)' }}>
 Expected Annual Return Rate (%)
 </label>
 <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '1.1rem', fontWeight: 700, color: 'var(--amber-gold)' }}>
 {returnRate}% p.a.
 </span>
 </div>

 <input
 type="range"
 min="1"
 max="30"
 step="0.5"
 value={returnRate}
 onChange={(e) => setReturnRate(Number(e.target.value))}
 style={{ width: '100%', accentColor: 'var(--amber-gold)', cursor: 'pointer', marginBottom: '12px' }}
 />

 <div style={{ background: '#0B0E13', padding: '12px', borderRadius: '8px', border: '1px solid rgba(201,165,77,0.2)' }}>
 <div style={{ fontSize: '0.7rem', color: 'var(--slate)', fontFamily: "'Space Grotesk', sans-serif", textTransform: 'uppercase' }}>
 Mathematical Rule Formula
 </div>
 <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.9rem', color: 'var(--ink)', fontWeight: 600, marginTop: '2px' }}>
 Years to Double = 72 ÷ {returnRate} = <span style={{ color: 'var(--rally)' }}>{yearsToDouble} Years</span>
 </div>
 </div>
 </div>

 {/* Display Output Box */}
 <div style={{
 background: '#0B0E13',
 padding: '24px',
 borderRadius: '12px',
 border: '1px solid rgba(61,220,132,0.3)',
 textAlign: 'center',
 display: 'flex',
 flexDirection: 'column',
 justifyContent: 'center',
 alignItems: 'center'
 }}>
 <div style={{ fontSize: '0.75rem', color: 'var(--slate)', fontFamily: "'Space Grotesk', sans-serif", textTransform: 'uppercase', letterSpacing: '0.05em' }}>
 Estimated Portfolio Doubling Horizon
 </div>
 <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '2.5rem', fontWeight: 700, color: 'var(--rally)', margin: '8px 0' }}>
 {yearsToDouble} <span style={{ fontSize: '1.2rem', color: 'var(--ink)' }}>Years</span>
 </div>
 <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '0.82rem', color: 'var(--slate-light)', maxWidth: '280px' }}>
 At {returnRate}% p.a. return, a ₹10 Lakh portfolio doubles to ₹20 Lakhs in exactly {yearsToDouble} years.
 </p>
 </div>
 </div>

 {/* Benchmark Comparisons Grid */}
 <div>
 <div style={{ fontSize: '0.78rem', fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, color: 'var(--amber-gold)', textTransform: 'uppercase', marginBottom: '12px' }}>
 Asset Class Doubling Speed Comparisons
 </div>
 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
 {benchmarks.map((b, idx) => {
 const time = (72 / b.rate).toFixed(1);
 return (
 <div key={idx} style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
 <div style={{ fontSize: '0.72rem', color: 'var(--slate-light)', fontFamily: "'Space Grotesk', sans-serif" }}>{b.name}</div>
 <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.85rem', color: b.color, fontWeight: 600, marginTop: '2px' }}>{b.rate}% Return</div>
 <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '1.1rem', fontWeight: 700, color: 'var(--ink)', marginTop: '4px' }}>
 {time} yrs
 </div>
 </div>
 );
 })}
 </div>
 </div>
 </div>
 );
}

// ─── ACADEMY MODULE DATA ──────────────────────────────────────────────────────

const TECHNICAL_INDICATORS = [
 {
 id: 'ema',
 name: 'Exponential Moving Average (EMA 20 & EMA 50)',
 category: 'Trend Identification',
 formula: 'EMA_t = (Close_t × k) + (EMA_{t-1} × (1 - k)) where k = 2 / (N + 1)',
 formulaNotes: 'N = 20 days (fast trend) or 50 days (structural trend)',
 importance: 'Unlike Simple Moving Averages (SMA) which treat a price from 50 days ago identically to yesterday\'s price, the EMA applies exponential weighting to recent prices. This reduces lag by up to 40%, giving earlier warnings of trend reversals.',
 basicExample: 'A retail investor in Reliance checks the EMA 20. When Reliance price stays above EMA 20 (₹2,450), the short-term trend is upward. Falling below EMA 20 signals a pull-back.',
 complexExample: 'Golden Cross & Death Cross Filter: When EMA 20 crosses above EMA 50 during a period of expanding volume, it confirms an institutional accumulation phase. However, if the crossover occurs during declining volume, the AI engine flags it as a "Bull Trap" and lowers confidence.',
 badgeText: 'CORE TREND',
 badgeColor: 'var(--rally)',
 },
 {
 id: 'bollinger',
 name: 'Bollinger Bands & Percent B (%B)',
 category: 'Volatility & Range',
 formula: 'Upper = SMA_{20} + (2 × σ) | Lower = SMA_{20} - (2 × σ) | %B = (Price - Lower) / (Upper - Lower)',
 formulaNotes: 'σ = 20-day standard deviation of closing prices',
 importance: 'Statistical law dictates that roughly 95% of all price action occurs between the Upper and Lower Bollinger Bands. %B normalizes price relative to these bands: %B > 1.0 means price is outside the upper band, while %B < 0 means price is below the lower band.',
 basicExample: 'If Infosys drops sharply and its %B falls to -0.05, the stock is trading beyond its statistical lower boundary, indicating extreme oversold compression.',
 complexExample: 'Bollinger Band Squeeze: When standard deviation contracts to multi-month lows (bands narrow like a bottleneck), it indicates massive energy build-up. The AI engine monitors the direction of the subsequent breakout combined with volume to enter long positions before the major move.',
 badgeText: 'VOLATILITY',
 badgeColor: '#8B5CF6',
 },
 {
 id: 'rsi',
 name: 'Relative Strength Index (RSI 14)',
 category: 'Momentum Oscillator',
 formula: 'RSI = 100 - [ 100 / (1 + (Avg Gain / Avg Loss)) ]',
 formulaNotes: 'Calculated over a 14-day rolling window',
 importance: 'RSI measures the speed and magnitude of recent price changes to evaluate overbought or oversold conditions on a scale of 0 to 100. It prevents retail traders from chasing stocks at dangerous tops or panic selling at bottom exhaustion points.',
 basicExample: 'TCS rallies non-stop for 8 days and RSI hits 82. This signals the stock is heavily overbought (>70), warning a retail investor not to buy at the peak.',
 complexExample: 'Bearish RSI Divergence: Price forms a Higher High (e.g. ₹3,500 → ₹3,580), but RSI forms a Lower High (e.g. 76 → 64). This negative divergence reveals underlying buying momentum is weakening even as prices rise, preceding a sharp correction.',
 badgeText: 'MOMENTUM',
 badgeColor: 'var(--amber-gold)',
 },
 {
 id: 'macd',
 name: 'MACD (Moving Average Convergence Divergence)',
 category: 'Momentum & Trend Crossover',
 formula: 'MACD Line = EMA_{12} - EMA_{26} | Signal Line = EMA_9(MACD) | Histogram = MACD - Signal',
 formulaNotes: 'Fast EMA (12), Slow EMA (26), Signal Smoothing (9)',
 importance: 'MACD converts two trend-following moving averages into a momentum oscillator. By subtracting the 26-day EMA from the 12-day EMA, it visually reveals when momentum is accelerating or decelerating.',
 basicExample: 'When the MACD line crosses above the Signal line and the histogram turns green, it indicates short-term momentum has turned positive.',
 complexExample: 'Zero-Line Rejection: When MACD pulls back toward the zero line during a macro bull trend and bounces upward without crossing into negative territory, it signals an ideal institutional re-entry point with high probability.',
 badgeText: 'CROSSOVER',
 badgeColor: '#06B6D4',
 },
];

const MUTUAL_FUND_TOPICS = [
 {
 id: 'direct-vs-regular',
 name: 'Direct vs Regular Mutual Fund Plans (Distributor Drag)',
 category: 'Pillar 2: Mutual Fund Architecture',
 formula: 'Wealth_{Direct} - Wealth_{Regular} = \\sum (SIP_t \\times (1 + R)^t) - \\sum (SIP_t \\times (1 + R - TER_{diff})^t)',
 formulaNotes: 'TER_diff = Distributor commission payout (typically 0.5% to 1.5% p.a.)',
 importance: 'Regular plans route a portion of your daily net asset value (NAV) to mutual fund distributors as perpetual trail commissions. Direct plans bypass distributors entirely, crediting that 0.5%–1.5% difference directly back into your compounded investment value.',
 basicExample: 'An investor putting ₹10,000/month into a Regular Plan for 20 years at 12% gross annual returns accumulates ₹90.3 Lakhs. In a Direct Plan (with 1.0% lower TER), the exact same investor accumulates ₹99.9 Lakhs — recovering ₹9.6 Lakhs in distributor commission drag!',
 complexExample: 'Compounding Drag & Churn Incentives: Distributor commissions create an inherent conflict of interest, incentivizing brokers to recommend switching funds every 3 years to claim upfront bonuses. Direct plans remove intermediary friction, unlocking uninterrupted multi-decade compounding.',
 badgeText: 'SAVINGS EDGE',
 badgeColor: 'var(--rally)',
 },
 {
 id: 'cagr-ter',
 name: 'CAGR & Total Expense Ratio (TER) Impact Formula',
 category: 'Pillar 2: Return Measurement & Costs',
 formula: 'CAGR = \\left( \\frac{NAV_{Ending}}{NAV_{Beginning}} \\right)^{\\frac{1}{N}} - 1 \\quad | \\quad Net\\ Return = Gross\\ CAGR - TER',
 formulaNotes: 'N = Investment tenure in years | TER = Management Fee + Admin Costs + Brokerage Fees',
 importance: 'Compound Annual Growth Rate (CAGR) measures the geometric annualized return, eliminating distorted simple average claims. Total Expense Ratio (TER) is deducted daily from NAV. A 2.0% TER vs 0.5% TER silently consumes up to 25% of your lifetime corpus.',
 basicExample: 'If a Large Cap Mutual Fund NAV rises from ₹100 to ₹248.83 over 5 years, the CAGR is (248.83 / 100)^(1/5) - 1 = 20.0% per year.',
 complexExample: 'TER Drag Multiplier in Bear Markets: During sideways or bear market years (e.g. 0% gross return), a 2.0% TER still deducts capital, resulting in a net -2.0% return. This forces the portfolio to work twice as hard in recovery years just to reach break-even.',
 badgeText: 'RETURN METRICS',
 badgeColor: 'var(--amber-gold)',
 },
];

const MLOPS_METRICS = [
 {
 id: 'rf',
 name: 'Random Forest Ensemble Classifier',
 category: 'Predictive ML Engine',
 formula: 'y_{pred} = Mode( T_1(x), T_2(x), ..., T_{100}(x) )',
 formulaNotes: 'Combines 100 decision trees built on bootstrap samples with random feature selection.',
 importance: 'Single decision trees overfit to market noise. Random Forests aggregate predictions across 100 independent decision trees trained on different feature subsets, dramatically reducing variance and eliminating overfitting.',
 basicExample: 'Instead of relying on a single indicator, the Random Forest model evaluates RSI, MACD, EMA ratios, and volume simultaneously to output a probability prediction (e.g., UP 74%).',
 complexExample: 'SHAP (SHapley Additive exPlanations) Feature Attribution: The model assigns mathematical contribution weights to each input feature for every prediction (e.g., +14% due to RSI oversold, +22% due to volume ratio, -5% due to EMA 50 resistance).',
 },
 {
 id: 'walkforward',
 name: 'Walk-Forward Cross Validation (Zero-Leakage)',
 category: 'Backtesting Integrity',
 formula: 'Train_k = [0, t_k] | Test_k = (t_k, t_k + \\Delta t]',
 formulaNotes: 'Strict temporal expanding window split with automated timestamp assertions.',
 importance: 'Standard random K-Fold cross validation suffers from "lookahead bias" in financial time series (using future price data to predict past prices). Walk-Forward validation strictly respects chronological order.',
 basicExample: 'The AI trains only on data up to December 2025 to predict January 2026. It never sees January data while training for December.',
 complexExample: 'Leakage Violation Prevention: The pipeline enforces an automated code assertion `assert max(train_timestamp) < min(test_timestamp)`. If an indicator attempts to compute forward-looking rolling windows, the system raises an immediate build exception.',
 },
 {
 id: 'sharpe',
 name: 'Sharpe Ratio & Max Drawdown (MDD)',
 category: 'Risk-Adjusted Performance',
 formula: 'Sharpe = (R_p - R_f) / \\sigma_p | MDD = (Peak - Trough) / Peak',
 formulaNotes: 'R_p = Strategy Return, R_f = Risk-Free Rate (6.5% India G-Sec), \\sigma_p = Return Std Dev',
 importance: 'A strategy that makes +30% return with 40% swings is far more dangerous than one making +22% return with 5% swings. Sharpe Ratio measures excess return per unit of volatility.',
 basicExample: 'A Sharpe ratio of > 1.5 indicates a high-quality strategy that generates solid returns relative to the risk taken.',
 complexExample: 'Promotion Gatekeeping: A candidate ML model is ONLY promoted to "Champion" status if its Out-of-Sample Sharpe Ratio exceeds the incumbent model by at least +0.20 AND its Max Drawdown remains below 12%.',
 },
];

const LIFE_PLANNING_TOPICS = [
 {
 id: 'emergency-fund',
 name: 'Emergency Fund (6-Month Essential Expense Rule)',
 category: 'Pillar 4: Financial Resilience',
 formula: 'Target\\ Liquid\\ Reserve = Monthly\\ Essential\\ Expenses \\times 6',
 formulaNotes: 'Essential Expenses = Rent/EMI + Food + Utilities + Insurance Premiums + School Fees',
 importance: 'The emergency fund acts as financial armor. Before allocating a single rupee into volatile equity markets or mutual funds, an investor must hold 6 months of essential living expenses in high-liquidity, low-risk instruments (Liquid Mutual Funds, Instant Sweep-in FDs).',
 basicExample: 'If a family requires ₹50,000 monthly for essential living expenses, their mandatory Emergency Fund buffer is ₹50,000 × 6 = ₹3,00,000 held in a 24x7 liquid fund.',
 complexExample: 'Sequence of Returns Protection: Possessing a 6-month liquid cushion prevents panic-selling equity portfolios during sudden market crashes (e.g. 2020 COVID dip) when job loss or medical urgency strikes, allowing long-term equity compounding to remain untouched.',
 badgeText: 'RESILIENCE BASE',
 badgeColor: 'var(--rally)',
 },
 {
 id: 'asset-allocation',
 name: 'Asset Allocation by Age & Annual Rebalancing Rules',
 category: 'Pillar 4: Portfolio Architecture',
 formula: 'Equity\\ \\% = 100 - Age \\quad | \\quad Fixed\\ Income\\ \\% = Age',
 formulaNotes: 'Dynamic Risk Tolerance Adaptation: Equity % = 110 - Age for aggressive growth objectives',
 importance: 'Asset allocation accounts for over 90% of long-term investment return variance. As you age, human capital (earning capacity) decreases, requiring a systematic shift from volatile equities to capital-preserving fixed income.',
 basicExample: 'A 30-year-old investor allocates 70% (100 - 30) of portfolio to Equity Funds and 30% to Sovereign Gold Bonds and Corporate Debt.',
 complexExample: 'Systematic Annual Rebalancing Trigger: If an aggressive equity rally expands equity weight from 70% to 85%, annual rebalancing systematically trims 15% out of equity into debt. This enforces buying low and selling high without emotional bias.',
 badgeText: 'RISK HARNESS',
 badgeColor: '#06B6D4',
 },
];

const SEBI_RULES_TOPICS = [
 {
 id: 'sebi-categorization',
 name: 'SEBI Mutual Fund Categorization & Rationalization Scheme',
 category: 'SEBI Regulatory Framework',
 formula: 'Large\\ Cap = Rank\\ 1-100 \\quad | \\quad Mid\\ Cap = Rank\\ 101-250 \\quad | \\quad Small\\ Cap = Rank\\ 251+',
 formulaNotes: 'Enforced under SEBI Circular SEBI/HO/IMD/DF3/CIR/P/2017/114',
 importance: 'SEBI mandates strict universe boundaries to prevent "style drift", ensuring a fund manager cannot secretly invest in high-risk small caps to pad performance figures while advertising as a low-risk Large Cap fund.',
 basicExample: 'A SEBI-registered Large Cap Mutual Fund must invest at least 80% of its total assets in top 100 market-cap companies at all times.',
 complexExample: 'Automated Style Drift Auditing: Clearward scans daily AMC portfolio disclosures against SEBI classification boundaries. If a Large Cap fund breaches the 80% threshold, the system flags a regulatory drift warning.',
 badgeText: 'REGULATION',
 badgeColor: '#8B5CF6',
 },
 {
 id: 'sebi-ia-ra',
 name: 'SEBI IA & RA Regulations (Non-Advisory Firewall)',
 category: 'Investor Protection',
 formula: 'Educational\\ Analytics \\neq Personalized\\ Investment\\ Advice\\ (Reg\\ 2(1)(m))',
 formulaNotes: 'SEBI Investment Advisers Regulations 2013 & Research Analysts Regulations 2014',
 importance: 'SEBI regulations distinguish between educational/algorithmic research platforms and registered investment advisers (RIA). Educational tools must remain strictly non-discretionary without fee-splitting or guaranteed return promises.',
 basicExample: 'Clearward operates purely as an analytics and educational masterclass platform. It does not issue buy/sell calls or manage client money.',
 complexExample: 'Transparent Deterministic Math Firewall: All indicators, backtest results, and ML outputs in Clearward are derived from open mathematical formulas (EMA, RSI, Sharpe), eliminating subjective bias or hidden commission channels.',
 badgeText: 'COMPLIANCE',
 badgeColor: 'var(--amber-gold)',
 },
 {
 id: 'sebi-margin-settlement',
 name: 'SEBI T+1 Settlement & Upfront Peak Margin Rules',
 category: 'Market Infrastructure',
 formula: 'Settlement\\ Cycle = T + 1\\ Day \\quad | \\quad Upfront\\ Margin = 100\\%',
 formulaNotes: 'India is among the first global financial markets to achieve T+1 settlement across all listed securities.',
 importance: 'Upfront peak margin requirements prevent stockbrokers from providing excessive leverage to retail traders, protecting the financial system from systemic broker default cascades.',
 basicExample: 'When you sell shares on Monday, trade settlement and funds credit complete on Tuesday (T+1), enabling rapid capital liquidity.',
 complexExample: 'Intraday Peak Margin Snapshots: Clearing corporations take 4 random intraday snapshots of open positions. Any margin shortfall incurs automated exchange penalties, preventing leverage blowouts.',
 badgeText: 'SETTLEMENT',
 badgeColor: 'var(--rally)',
 },
 {
 id: 'sebi-scores',
 name: 'SEBI SCORES & Investor Grievance Redressal Mechanism',
 category: 'Grievance Mechanism',
 formula: 'Resolution\\ Timeline \\le 30\\ Days \\quad | \\quad SCORES\\ Portal = scores.sebi.gov.in',
 formulaNotes: 'SEBI Complaints Redress System (SCORES) provides binding legal dispute resolution.',
 importance: 'Retail investors possess a legally binding, centralized escalation channel against Mutual Fund AMCs, Stockbrokers, or Registrars (CAMS/KFintech) for unresolved service issues.',
 basicExample: 'If a Mutual Fund AMC fails to process a SIP cancellation or redemption within statutory timelines, an investor files a direct grievance on SCORES.',
 complexExample: 'Two-Tiered Escalation Matrix: Investor Lodge Complaint with AMC/Broker (30-day resolution limit) → Escalate to SEBI SCORES Portal → Binding Online Dispute Resolution (ODR) arbitration.',
 badgeText: 'GRIEVANCE RIGHT',
 badgeColor: 'var(--selloff)',
 },
];

// ─── MAIN ACADEMY COMPONENT ───────────────────────────────────────────────────

export default function EducationAcademyView() {
 const [activeTab, setActiveTab] = useState('indicators');
 const [expandedId, setExpandedId] = useState('ema');
 const [visitedPillars, setVisitedPillars] = useState(() => {
 try {
 return JSON.parse(localStorage.getItem('academy_visited') || '[]');
 } catch {
 return [];
 }
 });

 const markPillarVisited = (pillarId) => {
 try {
 const stored = JSON.parse(localStorage.getItem('academy_visited') || '[]');
 if (!stored.includes(pillarId)) {
 const next = [...stored, pillarId];
 localStorage.setItem('academy_visited', JSON.stringify(next));
 setVisitedPillars(next);
 }
 } catch (e) {
 console.error(e);
 }
 };

 useEffect(() => {
 markPillarVisited(activeTab);
 }, [activeTab]);

 const visited = visitedPillars;

 return (
 <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '24px 16px' }}>

 {/* ── Page Hero Title Bar ───────────────────────────────────────────── */}
 <div style={{ marginBottom: '28px', textAlign: 'center' }}>
 <div style={{
 display: 'inline-flex',
 alignItems: 'center',
 gap: '8px',
 background: 'rgba(201,165,77,0.12)',
 border: '1px solid rgba(201,165,77,0.3)',
 borderRadius: '9999px',
 padding: '6px 16px',
 fontSize: '0.78rem',
 fontFamily: "'IBM Plex Mono', monospace",
 color: 'var(--amber-gold)',
 marginBottom: '12px'
 }}>
 <BookOpen size={14} /> CLEARWARD ACADEMY & QUANT MASTERCLASS
 </div>

 <h1 style={{
 fontFamily: "'Space Grotesk', sans-serif",
 fontSize: '2.2rem',
 fontWeight: 700,
 color: 'var(--ink)',
 letterSpacing: '-0.02em',
 marginBottom: '8px'
 }}>
 Master Technical Indicators, Mutual Funds & Financial Planning
 </h1>

 <p style={{
 fontFamily: "'Space Grotesk', sans-serif",
 fontSize: '1rem',
 color: 'var(--slate-light)',
 maxWidth: '780px',
 margin: '0 auto',
 lineHeight: 1.6
 }}>
 Terminal precision meets retail warmth. Learn exact mathematical formulas, interactive compounding calculators, ML backtesting rules, and SEBI compliance standards powering Clearward.
 </p>
 </div>

 {/* ── Interactive Animated Simulation Section ──────────────────────── */}
 <AnimatedStrategySimulator />

 {/* ── Navigation Tabs ───────────────────────────────────────────────── */}
 <div style={{
 display: 'flex',
 gap: '4px',
 borderBottom: '1px solid rgba(255,255,255,0.08)',
 marginBottom: '28px',
 overflowX: 'auto',
 scrollbarWidth: 'none', /* Firefox */
 msOverflowStyle: 'none', /* IE */
 paddingBottom: '2px',
 WebkitOverflowScrolling: 'touch',
 }}>
 <button
 onClick={() => { setActiveTab('indicators'); setExpandedId('ema'); markPillarVisited('indicators'); }}
 style={{
 display: 'flex',
 alignItems: 'center',
 gap: '8px',
 fontFamily: "'Space Grotesk', sans-serif",
 fontSize: '0.92rem',
 fontWeight: 600,
 padding: '10px 16px',
 border: 'none',
 background: activeTab === 'indicators' ? 'rgba(201,165,77,0.1)' : 'transparent',
 color: activeTab === 'indicators' ? 'var(--amber-gold)' : 'var(--slate)',
 borderBottom: activeTab === 'indicators' ? '2px solid #C9A54D' : '2px solid transparent',
 borderRadius: '6px 6px 0 0',
 cursor: 'pointer',
 whiteSpace: 'nowrap'
 }}
 >
 <TrendingUp size={16} /> Technical Indicators (4)
 {visited.includes('indicators') && <span style={{ color: 'var(--accent-positive)', fontSize: '0.65rem', marginLeft: 4 }}></span>}
 </button>

 <button
 onClick={() => { setActiveTab('mutualfunds'); setExpandedId('direct-vs-regular'); markPillarVisited('mutualfunds'); }}
 style={{
 display: 'flex',
 alignItems: 'center',
 gap: '8px',
 fontFamily: "'Space Grotesk', sans-serif",
 fontSize: '0.92rem',
 fontWeight: 600,
 padding: '10px 16px',
 border: 'none',
 background: activeTab === 'mutualfunds' ? 'rgba(201,165,77,0.1)' : 'transparent',
 color: activeTab === 'mutualfunds' ? 'var(--amber-gold)' : 'var(--slate)',
 borderBottom: activeTab === 'mutualfunds' ? '2px solid #C9A54D' : '2px solid transparent',
 borderRadius: '6px 6px 0 0',
 cursor: 'pointer',
 whiteSpace: 'nowrap'
 }}
 >
 <PieChart size={16} /> Mutual Fund Fundamentals (Pillar 2)
 {visited.includes('mutualfunds') && <span style={{ color: 'var(--accent-positive)', fontSize: '0.65rem', marginLeft: 4 }}></span>}
 </button>

 <button
 onClick={() => { setActiveTab('mlops'); setExpandedId('rf'); markPillarVisited('mlops'); }}
 style={{
 display: 'flex',
 alignItems: 'center',
 gap: '8px',
 fontFamily: "'Space Grotesk', sans-serif",
 fontSize: '0.92rem',
 fontWeight: 600,
 padding: '10px 16px',
 border: 'none',
 background: activeTab === 'mlops' ? 'rgba(201,165,77,0.1)' : 'transparent',
 color: activeTab === 'mlops' ? 'var(--amber-gold)' : 'var(--slate)',
 borderBottom: activeTab === 'mlops' ? '2px solid #C9A54D' : '2px solid transparent',
 borderRadius: '6px 6px 0 0',
 cursor: 'pointer',
 whiteSpace: 'nowrap'
 }}
 >
 <Cpu size={16} /> Machine Learning & Backtesting (3)
 {visited.includes('mlops') && <span style={{ color: 'var(--accent-positive)', fontSize: '0.65rem', marginLeft: 4 }}></span>}
 </button>

 <button
 onClick={() => { setActiveTab('lifeplanning'); setExpandedId('emergency-fund'); markPillarVisited('lifeplanning'); }}
 style={{
 display: 'flex',
 alignItems: 'center',
 gap: '8px',
 fontFamily: "'Space Grotesk', sans-serif",
 fontSize: '0.92rem',
 fontWeight: 600,
 padding: '10px 16px',
 border: 'none',
 background: activeTab === 'lifeplanning' ? 'rgba(201,165,77,0.1)' : 'transparent',
 color: activeTab === 'lifeplanning' ? 'var(--amber-gold)' : 'var(--slate)',
 borderBottom: activeTab === 'lifeplanning' ? '2px solid #C9A54D' : '2px solid transparent',
 borderRadius: '6px 6px 0 0',
 cursor: 'pointer',
 whiteSpace: 'nowrap'
 }}
 >
 <PiggyBank size={16} /> Financial Life Planning (Pillar 4)
 {visited.includes('lifeplanning') && <span style={{ color: 'var(--accent-positive)', fontSize: '0.65rem', marginLeft: 4 }}></span>}
 </button>

 <button
 onClick={() => { setActiveTab('sebi'); setExpandedId('sebi-categorization'); markPillarVisited('sebi'); }}
 style={{
 display: 'flex',
 alignItems: 'center',
 gap: '8px',
 fontFamily: "'Space Grotesk', sans-serif",
 fontSize: '0.92rem',
 fontWeight: 600,
 padding: '10px 16px',
 border: 'none',
 background: activeTab === 'sebi' ? 'rgba(201,165,77,0.1)' : 'transparent',
 color: activeTab === 'sebi' ? 'var(--amber-gold)' : 'var(--slate)',
 borderBottom: activeTab === 'sebi' ? '2px solid #C9A54D' : '2px solid transparent',
 borderRadius: '6px 6px 0 0',
 cursor: 'pointer',
 whiteSpace: 'nowrap'
 }}
 >
 <ShieldAlert size={16} /> SEBI Rules & Investor Rights (4)
 {visited.includes('sebi') && <span style={{ color: 'var(--accent-positive)', fontSize: '0.65rem', marginLeft: 4 }}></span>}
 </button>
 </div>

 {/* ── TAB 1: TECHNICAL INDICATORS ───────────────────────────────────── */}
 {activeTab === 'indicators' && (
 <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
 {TECHNICAL_INDICATORS.map((item) => {
 const isOpen = expandedId === item.id;

 return (
 <div
 key={item.id}
 className="glass-card"
 style={{
 border: isOpen ? '1px solid rgba(201,165,77,0.35)' : '1px solid rgba(255,255,255,0.08)',
 padding: '24px',
 transition: 'all 0.25s ease'
 }}
 >
 {/* Card Title Bar */}
 <div
 onClick={() => setExpandedId(isOpen ? null : item.id)}
 style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
 >
 <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
 <span style={{
 fontFamily: "'IBM Plex Mono', monospace",
 fontSize: '0.72rem',
 fontWeight: 700,
 color: item.badgeColor,
 background: `${item.badgeColor}15`,
 border: `1px solid ${item.badgeColor}35`,
 padding: '4px 10px',
 borderRadius: '6px'
 }}>
 {item.badgeText}
 </span>

 <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '1.2rem', fontWeight: 700, color: 'var(--ink)' }}>
 {item.name}
 </h3>
 </div>

 <button style={{ color: 'var(--amber-gold)', background: 'none', border: 'none', cursor: 'pointer' }}>
 <ChevronRight size={20} style={{ transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
 </button>
 </div>

 {/* Expanded Details Content */}
 {isOpen && (
 <div style={{ marginTop: '20px', paddingTop: '18px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
 {/* Formula Display Box */}
 <div style={{
 background: '#0B0E13',
 border: '1px solid rgba(201,165,77,0.2)',
 borderRadius: '10px',
 padding: '16px',
 marginBottom: '20px'
 }}>
 <div style={{ fontSize: '0.7rem', color: 'var(--amber-gold)', fontFamily: "'Space Grotesk', sans-serif", textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>
 Mathematical Formula
 </div>
 <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.95rem', color: 'var(--ink)', fontWeight: 600 }}>
 {item.formula}
 </div>
 <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '0.78rem', color: 'var(--slate)', marginTop: '6px' }}>
 Note: {item.formulaNotes}
 </div>
 </div>

 {/* Why This Matters */}
 <div style={{ marginBottom: '20px' }}>
 <h4 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '0.95rem', color: 'var(--amber-gold)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
 <Info size={16} /> Why This Matters (Core Importance)
 </h4>
 <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '0.92rem', color: 'var(--ink)', lineHeight: 1.65 }}>
 {item.importance}
 </p>
 </div>

 {/* Basic vs Complex Case Study Grid */}
 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
 <div style={{
 background: 'rgba(61,220,132,0.04)',
 border: '1px solid rgba(61,220,132,0.2)',
 borderRadius: '10px',
 padding: '16px'
 }}>
 <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--rally)', fontFamily: "'Space Grotesk', sans-serif", marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
 <CheckCircle2 size={14} /> Basic Retail Scenario
 </div>
 <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '0.88rem', color: 'var(--slate-light)', lineHeight: 1.6 }}>
 {item.basicExample}
 </p>
 </div>

 <div style={{
 background: 'rgba(201,165,77,0.04)',
 border: '1px solid rgba(201,165,77,0.2)',
 borderRadius: '10px',
 padding: '16px'
 }}>
 <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--amber-gold)', fontFamily: "'Space Grotesk', sans-serif", marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
 <Zap size={14} /> Complex / Institutional Edge Case
 </div>
 <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '0.88rem', color: 'var(--slate-light)', lineHeight: 1.6 }}>
 {item.complexExample}
 </p>
 </div>
 </div>
 </div>
 )}
 </div>
 );
 })}
 </div>
 )}

 {/* ── TAB 2: MUTUAL FUND FUNDAMENTALS (PILLAR 2) ────────────────────── */}
 {activeTab === 'mutualfunds' && (
 <div>
 {/* Interactive Calculator Widget */}
 <SIPCalculatorWidget />

 {/* Accordion Topics Grid */}
 <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
 {MUTUAL_FUND_TOPICS.map((item) => {
 const isOpen = expandedId === item.id;

 return (
 <div
 key={item.id}
 className="glass-card"
 style={{
 border: isOpen ? '1px solid rgba(201,165,77,0.35)' : '1px solid rgba(255,255,255,0.08)',
 padding: '24px',
 transition: 'all 0.25s ease'
 }}
 >
 <div
 onClick={() => setExpandedId(isOpen ? null : item.id)}
 style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
 >
 <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
 <span style={{
 fontFamily: "'IBM Plex Mono', monospace",
 fontSize: '0.72rem',
 fontWeight: 700,
 color: item.badgeColor,
 background: `${item.badgeColor}15`,
 border: `1px solid ${item.badgeColor}35`,
 padding: '4px 10px',
 borderRadius: '6px'
 }}>
 {item.badgeText}
 </span>

 <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '1.2rem', fontWeight: 700, color: 'var(--ink)' }}>
 {item.name}
 </h3>
 </div>

 <button style={{ color: 'var(--amber-gold)', background: 'none', border: 'none', cursor: 'pointer' }}>
 <ChevronRight size={20} style={{ transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
 </button>
 </div>

 {isOpen && (
 <div style={{ marginTop: '20px', paddingTop: '18px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
 <div style={{
 background: '#0B0E13',
 border: '1px solid rgba(201,165,77,0.2)',
 borderRadius: '10px',
 padding: '16px',
 marginBottom: '20px'
 }}>
 <div style={{ fontSize: '0.7rem', color: 'var(--amber-gold)', fontFamily: "'Space Grotesk', sans-serif", textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>
 Mathematical Formula
 </div>
 <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.95rem', color: 'var(--ink)', fontWeight: 600 }}>
 {item.formula}
 </div>
 <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '0.78rem', color: 'var(--slate)', marginTop: '6px' }}>
 Note: {item.formulaNotes}
 </div>
 </div>

 <div style={{ marginBottom: '20px' }}>
 <h4 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '0.95rem', color: 'var(--amber-gold)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
 <Info size={16} /> Why This Matters (Core Importance)
 </h4>
 <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '0.92rem', color: 'var(--ink)', lineHeight: 1.65 }}>
 {item.importance}
 </p>
 </div>

 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
 <div style={{
 background: 'rgba(61,220,132,0.04)',
 border: '1px solid rgba(61,220,132,0.2)',
 borderRadius: '10px',
 padding: '16px'
 }}>
 <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--rally)', fontFamily: "'Space Grotesk', sans-serif", marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
 <CheckCircle2 size={14} /> Basic Retail Scenario
 </div>
 <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '0.88rem', color: 'var(--slate-light)', lineHeight: 1.6 }}>
 {item.basicExample}
 </p>
 </div>

 <div style={{
 background: 'rgba(201,165,77,0.04)',
 border: '1px solid rgba(201,165,77,0.2)',
 borderRadius: '10px',
 padding: '16px'
 }}>
 <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--amber-gold)', fontFamily: "'Space Grotesk', sans-serif", marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
 <Zap size={14} /> Complex / Institutional Edge Case
 </div>
 <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '0.88rem', color: 'var(--slate-light)', lineHeight: 1.6 }}>
 {item.complexExample}
 </p>
 </div>
 </div>
 </div>
 )}
 </div>
 );
 })}
 </div>
 </div>
 )}

 {/* ── TAB 3: MACHINE LEARNING & BACKTESTING ─────────────────────────── */}
 {activeTab === 'mlops' && (
 <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
 {MLOPS_METRICS.map((item) => (
 <div key={item.id} className="glass-card" style={{ padding: '24px' }}>
 <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
 <Cpu size={18} color="var(--amber-gold)" />
 <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '1.2rem', fontWeight: 700, color: 'var(--ink)' }}>
 {item.name}
 </h3>
 </div>

 <div style={{
 background: '#0B0E13',
 border: '1px solid rgba(201,165,77,0.2)',
 borderRadius: '8px',
 padding: '14px',
 marginBottom: '16px'
 }}>
 <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.9rem', color: 'var(--ink)' }}>
 {item.formula}
 </div>
 <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '0.78rem', color: 'var(--slate)', marginTop: '4px' }}>
 {item.formulaNotes}
 </div>
 </div>

 <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '0.92rem', color: 'var(--ink)', lineHeight: 1.65, marginBottom: '16px' }}>
 {item.importance}
 </p>

 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
 <div style={{ background: 'rgba(255,255,255,0.03)', padding: '14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
 <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--rally)', marginBottom: '4px', fontFamily: "'Space Grotesk', sans-serif" }}>Basic Application</div>
 <div style={{ fontSize: '0.85rem', color: 'var(--slate-light)', lineHeight: 1.55, fontFamily: "'Space Grotesk', sans-serif" }}>{item.basicExample}</div>
 </div>

 <div style={{ background: 'rgba(255,255,255,0.03)', padding: '14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
 <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--amber-gold)', marginBottom: '4px', fontFamily: "'Space Grotesk', sans-serif" }}>Advanced Quant Mechanism</div>
 <div style={{ fontSize: '0.85rem', color: 'var(--slate-light)', lineHeight: 1.55, fontFamily: "'Space Grotesk', sans-serif" }}>{item.complexExample}</div>
 </div>
 </div>
 </div>
 ))}
 </div>
 )}

 {/* ── TAB 4: FINANCIAL LIFE PLANNING (PILLAR 4) ────────────────────── */}
 {activeTab === 'lifeplanning' && (
 <div>
 {/* Interactive Calculator Widget */}
 <RuleOf72Widget />

 {/* Accordion Topics Grid */}
 <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
 {LIFE_PLANNING_TOPICS.map((item) => {
 const isOpen = expandedId === item.id;

 return (
 <div
 key={item.id}
 className="glass-card"
 style={{
 border: isOpen ? '1px solid rgba(201,165,77,0.35)' : '1px solid rgba(255,255,255,0.08)',
 padding: '24px',
 transition: 'all 0.25s ease'
 }}
 >
 <div
 onClick={() => setExpandedId(isOpen ? null : item.id)}
 style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
 >
 <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
 <span style={{
 fontFamily: "'IBM Plex Mono', monospace",
 fontSize: '0.72rem',
 fontWeight: 700,
 color: item.badgeColor,
 background: `${item.badgeColor}15`,
 border: `1px solid ${item.badgeColor}35`,
 padding: '4px 10px',
 borderRadius: '6px'
 }}>
 {item.badgeText}
 </span>

 <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '1.2rem', fontWeight: 700, color: 'var(--ink)' }}>
 {item.name}
 </h3>
 </div>

 <button style={{ color: 'var(--amber-gold)', background: 'none', border: 'none', cursor: 'pointer' }}>
 <ChevronRight size={20} style={{ transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
 </button>
 </div>

 {isOpen && (
 <div style={{ marginTop: '20px', paddingTop: '18px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
 <div style={{
 background: '#0B0E13',
 border: '1px solid rgba(201,165,77,0.2)',
 borderRadius: '10px',
 padding: '16px',
 marginBottom: '20px'
 }}>
 <div style={{ fontSize: '0.7rem', color: 'var(--amber-gold)', fontFamily: "'Space Grotesk', sans-serif", textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>
 Mathematical Formula
 </div>
 <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.95rem', color: 'var(--ink)', fontWeight: 600 }}>
 {item.formula}
 </div>
 <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '0.78rem', color: 'var(--slate)', marginTop: '6px' }}>
 Note: {item.formulaNotes}
 </div>
 </div>

 <div style={{ marginBottom: '20px' }}>
 <h4 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '0.95rem', color: 'var(--amber-gold)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
 <Info size={16} /> Why This Matters (Core Importance)
 </h4>
 <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '0.92rem', color: 'var(--ink)', lineHeight: 1.65 }}>
 {item.importance}
 </p>
 </div>

 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
 <div style={{
 background: 'rgba(61,220,132,0.04)',
 border: '1px solid rgba(61,220,132,0.2)',
 borderRadius: '10px',
 padding: '16px'
 }}>
 <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--rally)', fontFamily: "'Space Grotesk', sans-serif", marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
 <CheckCircle2 size={14} /> Basic Retail Scenario
 </div>
 <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '0.88rem', color: 'var(--slate-light)', lineHeight: 1.6 }}>
 {item.basicExample}
 </p>
 </div>

 <div style={{
 background: 'rgba(201,165,77,0.04)',
 border: '1px solid rgba(201,165,77,0.2)',
 borderRadius: '10px',
 padding: '16px'
 }}>
 <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--amber-gold)', fontFamily: "'Space Grotesk', sans-serif", marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
 <Zap size={14} /> Complex / Institutional Edge Case
 </div>
 <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '0.88rem', color: 'var(--slate-light)', lineHeight: 1.6 }}>
 {item.complexExample}
 </p>
 </div>
 </div>
 </div>
 )}
 </div>
 );
 })}
 </div>
 </div>
 )}

 {/* ── TAB 5: SEBI RULES & INVESTOR RIGHTS ───────────────────────────── */}
 {activeTab === 'sebi' && (
 <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
 {SEBI_RULES_TOPICS.map((item) => {
 const isOpen = expandedId === item.id;

 return (
 <div
 key={item.id}
 className="glass-card"
 style={{
 border: isOpen ? '1px solid rgba(201,165,77,0.35)' : '1px solid rgba(255,255,255,0.08)',
 padding: '24px',
 transition: 'all 0.25s ease'
 }}
 >
 <div
 onClick={() => setExpandedId(isOpen ? null : item.id)}
 style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
 >
 <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
 <span style={{
 fontFamily: "'IBM Plex Mono', monospace",
 fontSize: '0.72rem',
 fontWeight: 700,
 color: item.badgeColor,
 background: `${item.badgeColor}15`,
 border: `1px solid ${item.badgeColor}35`,
 padding: '4px 10px',
 borderRadius: '6px'
 }}>
 {item.badgeText}
 </span>

 <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '1.2rem', fontWeight: 700, color: 'var(--ink)' }}>
 {item.name}
 </h3>
 </div>

 <button style={{ color: 'var(--amber-gold)', background: 'none', border: 'none', cursor: 'pointer' }}>
 <ChevronRight size={20} style={{ transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
 </button>
 </div>

 {isOpen && (
 <div style={{ marginTop: '20px', paddingTop: '18px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
 <div style={{
 background: '#0B0E13',
 border: '1px solid rgba(201,165,77,0.2)',
 borderRadius: '10px',
 padding: '16px',
 marginBottom: '20px'
 }}>
 <div style={{ fontSize: '0.7rem', color: 'var(--amber-gold)', fontFamily: "'Space Grotesk', sans-serif", textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>
 Regulatory Standard / Rule Definition
 </div>
 <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.95rem', color: 'var(--ink)', fontWeight: 600 }}>
 {item.formula}
 </div>
 <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '0.78rem', color: 'var(--slate)', marginTop: '6px' }}>
 Reference: {item.formulaNotes}
 </div>
 </div>

 <div style={{ marginBottom: '20px' }}>
 <h4 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '0.95rem', color: 'var(--amber-gold)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
 <Info size={16} /> Why This Protection Matters
 </h4>
 <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '0.92rem', color: 'var(--ink)', lineHeight: 1.65 }}>
 {item.importance}
 </p>
 </div>

 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
 <div style={{
 background: 'rgba(61,220,132,0.04)',
 border: '1px solid rgba(61,220,132,0.2)',
 borderRadius: '10px',
 padding: '16px'
 }}>
 <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--rally)', fontFamily: "'Space Grotesk', sans-serif", marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
 <CheckCircle2 size={14} /> Retail Investor Right
 </div>
 <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '0.88rem', color: 'var(--slate-light)', lineHeight: 1.6 }}>
 {item.basicExample}
 </p>
 </div>

 <div style={{
 background: 'rgba(201,165,77,0.04)',
 border: '1px solid rgba(201,165,77,0.2)',
 borderRadius: '10px',
 padding: '16px'
 }}>
 <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--amber-gold)', fontFamily: "'Space Grotesk', sans-serif", marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
 <Zap size={14} /> Platform Compliance Enforcer
 </div>
 <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '0.88rem', color: 'var(--slate-light)', lineHeight: 1.6 }}>
 {item.complexExample}
 </p>
 </div>
 </div>
 </div>
 )}
 </div>
 );
 })}
 </div>
 )}

 <div className="pipeline-module-footer">
 <span className="pipeline-module-footer-label">LEARN → APPLY</span>
 <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
 <button className="pipeline-cta">
 ⊙ Apply to Live Stock Analysis →
 </button>
 <button className="pipeline-cta">
 Run Hype Guard →
 </button>
 </div>
 </div>
 </div>
 );
}
