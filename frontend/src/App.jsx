/**
 * App.jsx — Root component for the Financial Analytics Dashboard
 *
 * Responsibilities:
 * - Manages global application state (active symbol, all API data, watchlist)
 * - Fetches all four API endpoints in parallel using Promise.all
 * - Cancels in-flight requests via AbortController when the symbol changes (P8)
 * - Persists the watchlist to localStorage so it survives page refresh (P12)
 * - Renders the top-level layout: banner, ticker tape, nav bar, and routed views
 */

import React, { useState, useEffect, useRef, Suspense } from 'react';
import {
 LayoutDashboard, ShieldAlert, Briefcase,
 TrendingUp, GitCompare, Star, Cpu, Bot, ChevronLeft, ChevronRight, SlidersHorizontal
} from 'lucide-react';

// ─── Component Imports ────────────────────────────────────────────────────────
import MarketTickerTape from './components/MarketTickerTape';
import SearchHeader from './components/SearchHeader';
import DisclaimerBanner from './components/DisclaimerBanner';
import ModelHealthBadge from './components/ModelHealthBadge';
import StockChart from './components/StockChart';
import PredictionCard from './components/PredictionCard';
import SignalCard from './components/SignalCard';
import ExplanationView from './components/ExplanationView';
import WatchlistView from './components/WatchlistView';
import RiskManagementCard from './components/RiskManagementCard';
import BehavioralNudgeBanner from './components/BehavioralNudgeBanner';
import HypeAndHealthCard from './components/HypeAndHealthCard';
import ShareholdingCard from './components/ShareholdingCard';
import HypeGuardView from './components/HypeGuardView';
import TimeSeriesForecastCard from './components/TimeSeriesForecastCard';
import RiskCockpit from './components/RiskCockpit';
import MobileNav from './components/MobileNav';
import ErrorBoundary from './components/ErrorBoundary';
import FloatingChatWidget from './components/FloatingChatWidget';

const StockComparisonView = React.lazy(() => import('./components/StockComparisonView'));
const ModelChangelogView = React.lazy(() => import('./components/ModelChangelogView'));
const ChatbotView = React.lazy(() => import('./components/ChatbotView'));
const MutualFundView = React.lazy(() => import('./components/MutualFundView'));
const PortfolioDoctorView = React.lazy(() => import('./components/PortfolioDoctorView'));
const SettingsView = React.lazy(() => import('./components/SettingsView'));

// ─── Constants ────────────────────────────────────────────────────────────────

/** Default watchlist shown on first load (before any user customisation) */
const DEFAULT_WATCHLIST = ['RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS', 'ICICIBANK.NS', 'INFY.NS', 'TATAMOTORS.NS'];

/**
 * Navigation tabs rendered in the desktop nav bar and mirrored in MobileNav.
 * The `id` values MUST stay in sync with MobileNav tab IDs.
 */
const NAV_TABS = [
 { id: 'dashboard', label: 'Stock Intelligence' },
 { id: 'hypeguard', label: 'Hype Guard' },
 { id: 'portfolio', label: 'Portfolio Doctor' },
 { id: 'mutualfunds', label: 'Mutual Fund Analyzer' },
 { id: 'compare', label: 'Multi-Stock Comparison' },
 { id: 'watchlist', label: 'Tracked Watchlist' },
 { id: 'models', label: 'Model Changelog' },
 { id: 'chatbot', label: 'AI Chat' },
];

/** Sub-navigation filter tabs for the Stock Analysis workspace */
const STOCK_SUB_TABS = [
 { id: 'overview', label: 'Overview Dashboard' },
 { id: 'signals', label: 'Technicals & ML' },
 { id: 'forecast', label: '5-Day ARIMA Range' },
 { id: 'doctor', label: 'Health & Risk Doctor' },
 { id: 'explainer', label: 'AI Grounded Explainer' },
];

// ─── Root Component ───────────────────────────────────────────────────────────

export default function App() {

 // ── State: currently viewed stock symbol ──────────────────────────────────
 const [activeSymbol, setActiveSymbol] = useState('RELIANCE.NS');
 const [stockSubTab, setStockSubTab] = useState('overview');

 // ── State: data returned by the four API endpoints ────────────────────────
 const [priceHistory, setPriceHistory] = useState([]);
 const [signals, setSignals] = useState(null);
 const [prediction, setPrediction] = useState(null);
 const [explanation, setExplanation] = useState(null);

 // ── State: watchlist — loaded from localStorage on first render (P12) ──────
 const [watchlist, setWatchlist] = useState(
 () => JSON.parse(localStorage.getItem('watchlist') || 'null') || DEFAULT_WATCHLIST
 );

 // ── State: UI flags ───────────────────────────────────────────────────────
 const [isLoadingStockData, setIsLoadingStockData] = useState(false);
 const [isIngesting, setIsIngesting] = useState(false);
 const [activeTab, setActiveTab] = useState('dashboard');
 const [hasApiError, setHasApiError] = useState(false);
 const [invalidSymbolError, setInvalidSymbolError] = useState(null);
 const [marketContext, setMarketContext] = useState(null);
 const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);

 // ── Ref: holds the AbortController for the current in-flight fetch (P8) ───
 const abortControllerRef = useRef(null);

 // ─── Effect: fetch market context (^INDIAVIX) on mount ─────────────────────
 useEffect(() => {
 fetch('/api/market-context')
 .then(res => res.ok ? res.json() : null)
 .then(data => data && setMarketContext(data))
 .catch(err => console.warn('Market context fetch skipped:', err));
 }, []);

 // ─── Effect: persist watchlist to localStorage whenever it changes (P12) ──
 useEffect(() => {
 localStorage.setItem('watchlist', JSON.stringify(watchlist));
 }, [watchlist]);

 // ─── Effect: re-fetch stock data whenever the active symbol changes ────────
 useEffect(() => {
 const debounceTimer = setTimeout(() => {
 fetchAllStockData(activeSymbol);
 }, 300);

 // Cleanup: abort any pending requests if the component unmounts mid-fetch
 return () => {
 clearTimeout(debounceTimer);
 if (abortControllerRef.current) {
 abortControllerRef.current.abort();
 }
 };
 }, [activeSymbol]);

 // ─── Data Fetching ────────────────────────────────────────────────────────

 /**
 * Fetches all four API endpoints for the given stock symbol in parallel.
 * Each endpoint has its own try/catch so one failure won't block the others.
 * Uses an AbortController signal so that switching stocks mid-flight cancels
 * the stale requests immediately (P8).
 *
 * @param {string} symbol - The stock ticker symbol, e.g. "RELIANCE.NS"
 */
 const fetchAllStockData = async (symbol) => {
 // Cancel any previous in-flight requests before starting new ones (P8)
 if (abortControllerRef.current) {
 abortControllerRef.current.abort();
 }
 const controller = new AbortController();
 abortControllerRef.current = controller;
 const { signal } = controller;

 setIsLoadingStockData(true);
 setHasApiError(false);
 setInvalidSymbolError(null);

 // ── Fire all four fetches simultaneously (F2: was sequential, now parallel)
 const [priceResponse, signalsResponse, predictResponse, explainResponse] =
 await Promise.all([
 fetch(`/api/stocks/${symbol}/price-history?period=1y`, { signal }),
 fetch(`/api/stocks/${symbol}/signals`, { signal }),
 fetch(`/api/stocks/${symbol}/predict`, { signal }),
 fetch(`/api/stocks/${symbol}/explanation`, { signal }),
 ]).catch((fetchError) => {
 // If the error is an abort we silently ignore it — the user just
 // switched stocks, so stale data loading is expected behaviour.
 const isAborted = fetchError.name === 'AbortError' || signal.aborted || (fetchError.message && fetchError.message.includes('aborted'));
 if (!isAborted) {
 console.error('Network error during parallel fetch:', fetchError);
 setHasApiError(true);
 }
 // Return an array of null so each individual handler below is skipped
 return [null, null, null, null];
 });

 // ── 1. Price History ─────────────────────────────────────────────────────
 // F1 fix: API returns { history: [...] }, NOT { price_history: [...] }
 try {
 if (priceResponse && priceResponse.ok) {
 const priceData = await priceResponse.json();
 setPriceHistory(priceData.history || []);
 setHasApiError(false);
 } else if (priceResponse) {
 console.warn(`Price-history endpoint returned ${priceResponse.status} for ${symbol}`);
 if (priceResponse.status === 404) {
 setInvalidSymbolError(symbol);
 } else {
 setHasApiError(true);
 }
 setPriceHistory([]);
 }
 } catch (priceParseError) {
 console.error('Failed to parse price-history response:', priceParseError);
 setPriceHistory([]);
 }

 // ── 2. Technical Signals ─────────────────────────────────────────────────
 try {
 if (signalsResponse && signalsResponse.ok) {
 const signalsData = await signalsResponse.json();
 setSignals(signalsData);
 } else if (signalsResponse) {
 console.warn(`Signals endpoint returned ${signalsResponse.status} for ${symbol}`);
 setSignals(null);
 }
 } catch (signalsParseError) {
 console.error('Failed to parse signals response:', signalsParseError);
 setSignals(null);
 }

 // ── 3. ML Price Prediction ───────────────────────────────────────────────
 try {
 if (predictResponse && predictResponse.ok) {
 const predictionData = await predictResponse.json();
 // API may return either `primary_prediction` (newer) or `prediction` (legacy)
 setPrediction(predictionData.primary_prediction || predictionData.prediction || null);
 } else if (predictResponse) {
 console.warn(`Predict endpoint returned ${predictResponse.status} for ${symbol}`);
 setPrediction(null);
 }
 } catch (predictParseError) {
 console.error('Failed to parse prediction response:', predictParseError);
 setPrediction(null);
 }

 // ── 4. Grounded RAG Explanation ──────────────────────────────────────────
 try {
 if (explainResponse && explainResponse.ok) {
 const explanationData = await explainResponse.json();
 setExplanation(explanationData);
 } else if (explainResponse) {
 console.warn(`Explanation endpoint returned ${explainResponse.status} for ${symbol}`);
 setExplanation(null);
 }
 } catch (explainParseError) {
 console.error('Failed to parse explanation response:', explainParseError);
 setExplanation(null);
 }

 setIsLoadingStockData(false);
 };

 // ─── Event Handlers ───────────────────────────────────────────────────────

 /**
 * Called when the user searches for or clicks a new stock symbol.
 * Adds the symbol to the watchlist if it isn't already tracked, then
 * navigates to the dashboard tab for that symbol.
 *
 * @param {string} symbol - The newly selected ticker symbol
 */
 const handleSelectSymbol = (symbol) => {
 setActiveSymbol(symbol);
 setActiveTab('dashboard');

 // Add to watchlist if not already present (avoid duplicates)
 setWatchlist((currentWatchlist) =>
 currentWatchlist.includes(symbol)
 ? currentWatchlist
 : [...currentWatchlist, symbol]
 );
 };

 /**
 * Removes a symbol from the tracked watchlist.
 * Called by WatchlistView when the user clicks the remove button.
 *
 * @param {string} symbol - The ticker symbol to remove
 */
 const handleRemoveSymbol = (symbol) => {
 setWatchlist((currentWatchlist) =>
 currentWatchlist.filter((existingSymbol) => existingSymbol !== symbol)
 );
 };

 /**
 * Triggers a background data ingestion job for the given symbol,
 * then refreshes all displayed stock data once the job completes.
 *
 * @param {string} symbol - The ticker symbol to ingest news & fundamentals for
 */
 const handleTriggerIngest = async (targetSymbol) => {
 const sym = (typeof targetSymbol === 'string' && targetSymbol) ? targetSymbol : activeSymbol;
 if (!sym) return;
 setIsIngesting(true);
 try {
 await fetch(`/api/stocks/${sym}/ingest`, { method: 'POST' });
 await fetch(`/api/retrain/trigger?symbol=${sym}`, { method: 'POST' });
 await fetchAllStockData(sym);
 } catch (ingestError) {
 console.error('Ingestion job failed:', ingestError);
 } finally {
    setIsIngesting(false);
  }
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden', background: '#06070D', color: '#E8EDF4' }}>

      {hasApiError && (
        <div style={{ background: 'rgba(239,68,68,0.1)', borderBottom: '1px solid rgba(239,68,68,0.25)', color: '#EF4444', padding: '7px 24px', fontSize: '0.72rem', textAlign: 'center', fontFamily: "'IBM Plex Mono', monospace", letterSpacing: '0.03em' }}>
          ⚠ Server API unreachable — displaying cached market data
        </div>
      )}

      {invalidSymbolError && (
        <div style={{ background: 'rgba(245,166,35,0.07)', borderBottom: '1px solid rgba(245,166,35,0.2)', color: '#F5A623', padding: '7px 24px', fontSize: '0.72rem', textAlign: 'center', fontFamily: "'IBM Plex Mono', monospace", letterSpacing: '0.03em' }}>
          Symbol "{invalidSymbolError}" not found — try NSE format e.g. RELIANCE.NS
        </div>
      )}

      <MarketTickerTape />

      <SearchHeader
        activeSymbol={activeSymbol}
        onSelectSymbol={handleSelectSymbol}
        onTriggerIngest={handleTriggerIngest}
        isIngesting={isIngesting}
      />

      <div className="app-layout">
        <aside className={`app-sidebar${sidebarCollapsed ? ' collapsed' : ''}`}>

          <button
            onClick={() => setSidebarCollapsed(c => !c)}
            title={sidebarCollapsed ? 'Expand' : 'Collapse'}
            style={{
              alignSelf: sidebarCollapsed ? 'center' : 'flex-end',
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--muted)', padding: '5px',
              marginBottom: '10px', flexShrink: 0,
              borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'color 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--ink)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}
          >
            {sidebarCollapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
          </button>

      {/* Main nav items */}
      {[
        { id: 'dashboard',   Icon: LayoutDashboard,  label: 'Stock Intel' },
        { id: 'hypeguard',   Icon: ShieldAlert,       label: 'Hype Guard' },
        { id: 'portfolio',   Icon: Briefcase,         label: 'Portfolio Doctor' },
        { id: 'mutualfunds', Icon: TrendingUp,        label: 'Mutual Funds' },
        { id: 'compare',     Icon: GitCompare,        label: 'Compare' },
        { id: 'watchlist',   Icon: Star,              label: 'Watchlist' },
      ].map(item => (
        <div
          key={item.id}
          className={`sidebar-nav-item${activeTab === item.id ? ' active' : ''}`}
          onClick={() => setActiveTab(item.id)}
          title={item.label}
        >
          <item.Icon size={15} style={{ flexShrink: 0, opacity: activeTab === item.id ? 1 : 0.6 }} />
          {!sidebarCollapsed && <span>{item.label}</span>}
        </div>
      ))}

      {!sidebarCollapsed && <div className="sidebar-section-label">System</div>}

      {[
        { id: 'models',   Icon: Cpu,               label: 'Model Log' },
        { id: 'chatbot',  Icon: Bot,               label: 'AI Chat' },
        { id: 'settings', Icon: SlidersHorizontal, label: 'Settings' },
      ].map(item => (
        <div
          key={item.id}
          className={`sidebar-nav-item${activeTab === item.id ? ' active' : ''}`}
          onClick={() => setActiveTab(item.id)}
          title={item.label}
        >
          <item.Icon size={15} style={{ flexShrink: 0, opacity: activeTab === item.id ? 1 : 0.6 }} />
          {!sidebarCollapsed && <span>{item.label}</span>}
        </div>
      ))}

    </aside>

 {/* MAIN CONTENT */}
 <main className="app-main">
 <ErrorBoundary>
 <div style={{ maxWidth: '1440px', margin: '24px auto', padding: '0 24px' }}>

 {/* Behavioral Nudge Banners — sitewide contextual warnings */}
 <BehavioralNudgeBanner
 activeSymbol={activeSymbol}
 priceHistory={priceHistory}
 marketContext={marketContext}
 />

 {/* Dashboard tab: Stock Analysis Workspace */}
 {activeTab === 'dashboard' && (
 <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

 <RiskCockpit
 activeSymbol={activeSymbol}
 priceHistory={priceHistory}
 marketContext={marketContext}
 isLoading={isLoadingStockData && priceHistory.length === 0}
 hasApiError={hasApiError}
 onNavigate={(tab) => setActiveTab(tab)}
 />

 {/* 1. Primary Candlestick Price Action Chart — TOP VISUAL ANCHOR */}
 <div className="panel-appear" style={{ animationDelay: '0ms' }}>
 <StockChart
 symbol={activeSymbol}
 priceData={priceHistory}
 prediction={prediction}
 loading={isLoadingStockData && priceHistory.length === 0}
 />
 </div>

 {/* 2. Stock View Sub-Navigation Filter Bar */}
 <div
 className="glass-card"
 style={{
 padding: '12px 20px',
 display: 'flex',
 alignItems: 'center',
 justifyContent: 'space-between',
 flexWrap: 'wrap',
 gap: '12px',
 }}
 >
 <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
 {STOCK_SUB_TABS.map((subTab) => (
 <button
 key={subTab.id}
 onClick={() => setStockSubTab(subTab.id)}
 style={{
 padding: '6px 14px',
 borderRadius: '20px',
 border: '1px solid',
 borderColor: stockSubTab === subTab.id ? 'var(--signal-gold)' : 'rgba(255,255,255,0.08)',
 background: stockSubTab === subTab.id ? 'var(--signal-gold-dim)' : 'transparent',
 color: stockSubTab === subTab.id ? 'var(--signal-gold)' : 'var(--slate)',
 fontSize: '0.78rem',
 fontWeight: 600,
 cursor: 'pointer',
 transition: 'all 0.2s',
 }}
 >
 {subTab.label}
 </button>
 ))}
 </div>
 <div style={{ fontSize: '0.75rem', color: 'var(--slate)', display: 'flex', alignItems: 'center', gap: '6px' }}>
 <span>Analyzing Ticker:</span>
 <strong style={{ color: 'var(--ink)', fontFamily: 'IBM Plex Mono, monospace' }}>{activeSymbol}</strong>
 </div>
 </div>

 {/* 3. Sub-Tab Content Views */}

 {/* MODE A: OVERVIEW (Balanced 2-Column Responsive Layout) */}
 {stockSubTab === 'overview' && (
 <div className="dashboard-grid-2col panel-appear" style={{ animationDelay: '30ms' }}>
 {/* Left Column: Signals, ARIMA Forecast & AI Explainer */}
 <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
 <PredictionCard prediction={prediction} loading={isLoadingStockData} />
 <SignalCard signalsData={signals} loading={isLoadingStockData} />
 </div>

 <TimeSeriesForecastCard symbol={activeSymbol} />

 <ExplanationView explanation={explanation} loading={isLoadingStockData} />
 </div>

 {/* Right Column: Health Doctor & Capital Risk Defense */}
 <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
 <div>
 <HypeAndHealthCard symbol={activeSymbol} />
 {activeSymbol && <ShareholdingCard symbol={activeSymbol} />}
 {/* Pipeline: Stock Intelligence → Hype Guard */}
 <div className="pipeline-module-footer" style={{ marginTop: '16px', padding: '12px 0' }}>
 <span className="pipeline-module-footer-label">ANALYZE → GUARD</span>
 <button
 className="pipeline-cta"
 onClick={() => setActiveTab('hypeguard')}
 >
 Full Hype Guard Scan →
 </button>
 </div>
 </div>

 <RiskManagementCard
 symbol={activeSymbol}
 priceData={priceHistory}
 prediction={prediction}
 signalsData={signals}
 />
 </div>
 </div>
 )}

 {/* MODE B: TECHNICALS & ML */}
 {stockSubTab === 'signals' && (
 <div className="panel-appear" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px' }}>
 <PredictionCard prediction={prediction} loading={isLoadingStockData} />
 <SignalCard signalsData={signals} loading={isLoadingStockData} />
 </div>
 )}

 {/* MODE C: 5-DAY ARIMA FORECAST */}
 {stockSubTab === 'forecast' && (
 <div className="panel-appear">
 <TimeSeriesForecastCard symbol={activeSymbol} />
 </div>
 )}

 {/* MODE D: HEALTH & RISK DOCTOR */}
 {stockSubTab === 'doctor' && (
 <div className="panel-appear" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px' }}>
 <HypeAndHealthCard symbol={activeSymbol} />
 {activeSymbol && <ShareholdingCard symbol={activeSymbol} />}
 <RiskManagementCard
 symbol={activeSymbol}
 priceData={priceHistory}
 prediction={prediction}
 signalsData={signals}
 />
 </div>
 )}

 {/* MODE E: AI GROUNDED EXPLAINER */}
 {stockSubTab === 'explainer' && (
 <div className="panel-appear">
 <ExplanationView explanation={explanation} loading={isLoadingStockData} />
 <div className="pipeline-module-footer" style={{ marginTop: '16px', padding: '12px 0' }}>
 <span className="pipeline-module-footer-label">EXPLAIN → PROTECT</span>
 <div style={{ display: 'flex', gap: 8 }}>
 <button className="pipeline-cta" onClick={() => setActiveTab('hypeguard')}>
 Check Hype Score →
 </button>
 <button className="pipeline-cta" onClick={() => setActiveTab('portfolio')}>
 ⊞ Portfolio Audit →
 </button>
 </div>
 </div>
 </div>
 )}

 </div>
 )}

 {/* Portfolio Doctor Tab */}
 {activeTab === 'portfolio' && (
 <div className="panel-appear" style={{ animationDelay: '0ms' }}>
 <Suspense fallback={
 <div className="glass-card" style={{ padding: '40px', textAlign: 'center', color: 'var(--slate)' }}>
 Loading Portfolio Doctor...
 </div>
 }>
 <PortfolioDoctorView onNavigate={(tab) => setActiveTab(tab)} />
 </Suspense>
 </div>
 )}

 {/* Hype & Behavioral Guard Tab */}
 {activeTab === 'hypeguard' && (
 <div className="panel-appear" style={{ animationDelay: '0ms' }}>
 <HypeGuardView
 activeSymbol={activeSymbol}
 setActiveSymbol={setActiveSymbol}
 priceHistory={priceHistory}
 marketContext={marketContext}
 setActiveTab={setActiveTab}
 />
 </div>
 )}

 {/* Mutual Fund Analyzer Tab */}
 {activeTab === 'mutualfunds' && (
 <div className="panel-appear" style={{ animationDelay: '0ms' }}>
 <Suspense fallback={
 <div className="glass-card" style={{ padding: '40px', textAlign: 'center', color: 'var(--slate)' }}>
 Loading Mutual Fund Analyzer...
 </div>
 }>
 <MutualFundView />
 </Suspense>
 </div>
 )}

 {/* Compare tab: side-by-side multi-stock view */}
 {activeTab === 'compare' && (
 <div className="panel-appear" style={{ animationDelay: '0ms' }}>
 <Suspense fallback={
 <div className="glass-card" style={{ padding: '40px', textAlign: 'center', color: 'var(--slate)' }}>
 Loading comparison view...
 </div>
 }>
 <StockComparisonView defaultSymbols={['TCS.NS', 'INFY.NS', 'RELIANCE.NS', 'HDFCBANK.NS']} />
 </Suspense>
 </div>
 )}

 {/* Watchlist tab: tracked symbols with live signals */}
 {activeTab === 'watchlist' && (
 <div className="panel-appear" style={{ animationDelay: '0ms' }}>
 <WatchlistView
 watchlist={watchlist}
 activeSymbol={activeSymbol}
 onSelectSymbol={handleSelectSymbol}
 onRemoveSymbol={handleRemoveSymbol}
 onAddSymbol={(sym) => setWatchlist(prev => prev.includes(sym) ? prev : [...prev, sym])}
 onNavigate={(tab) => setActiveTab(tab)}
 />
 </div>
 )}

 {/* Models tab: champion model performance changelog */}
 {activeTab === 'models' && (
 <div className="panel-appear" style={{ animationDelay: '0ms' }}>
 <Suspense fallback={
 <div className="glass-card" style={{ padding: '40px', textAlign: 'center', color: 'var(--slate)' }}>
 Loading changelog...
 </div>
 }>
 <ModelChangelogView />
 </Suspense>
 </div>
 )}

 {/* AI Chatbot tab */}
 {activeTab === 'chatbot' && (
 <div className="panel-appear" style={{ animationDelay: '0ms' }}>
 <Suspense fallback={
 <div className="glass-card" style={{ padding: '40px', textAlign: 'center', color: 'var(--slate)' }}>
 Loading AI Chat...
 </div>
 }>
 <ChatbotView activeSymbol={activeSymbol} />
 </Suspense>
 </div>
 )}

 {/* Settings tab */}
 {activeTab === 'settings' && (
 <div className="panel-appear" style={{ animationDelay: '0ms' }}>
 <Suspense fallback={
 <div className="glass-card" style={{ padding: '40px', textAlign: 'center', color: 'var(--slate)' }}>
 Loading Settings...
 </div>
 }>
 <SettingsView activeSymbol={activeSymbol} />
 </Suspense>
 </div>
 )}
 </div>
 </ErrorBoundary>
 </main>
 </div>
 <FloatingChatWidget activeSymbol={activeSymbol} />
 <MobileNav activeTab={activeTab} setActiveTab={setActiveTab} />
 </div>
 );
}
