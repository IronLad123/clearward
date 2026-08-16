/**
 * MobileNav.jsx — Fixed-to-bottom navigation bar for mobile viewports
 *
 * Props:
 * - activeTab {string} The currently active route ID (matches App.jsx router)
 * - setActiveTab {Function} Callback to switch the active route
 *
 * IMPORTANT: The tab `id` values here MUST stay in sync with:
 * - The NAV_TABS constant in App.jsx
 * - The router conditionals in App.jsx's <main> block
 *
 * F7 fix: was using 'chart' | 'signals' | 'rag' | 'watchlist'.
 * Now uses the correct IDs: 'dashboard' | 'compare' | 'watchlist' | 'models'
 */

import React from 'react';
import { LayoutDashboard, ShieldAlert, SquareStack, TrendingUp, ArrowLeftRight, Star, Bot } from 'lucide-react';

// ─── Tab Definitions ──────────────────────────────────────────────────────────

/**
 * NAV_TABS — Bottom-nav items for mobile.
 * Each `id` matches an activeTab value used in App.jsx's router.
 */
const NAV_TABS = [
 { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
 { id: 'hypeguard', label: 'Hype Guard',icon: ShieldAlert },
 { id: 'portfolio', label: 'Portfolio', icon: SquareStack },
 { id: 'mutualfunds', label: 'Funds', icon: TrendingUp },
 { id: 'compare', label: 'Compare', icon: ArrowLeftRight },
 { id: 'watchlist', label: 'Watchlist', icon: Star },
 { id: 'chatbot', label: 'AI Chat', icon: Bot },
];

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * MobileNav renders a fixed bottom navigation bar with four icon-and-label
 * buttons. Displayed only on screens narrower than 768 px (hidden via CSS).
 */
export default function MobileNav({ activeTab, setActiveTab }) {
 return (
 <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
 {NAV_TABS.map((tab) => {
 const TabIcon = tab.icon;
 const isActive = activeTab === tab.id;

 return (
 <button
 key={tab.id}
 onClick={() => setActiveTab(tab.id)}
 aria-label={tab.label}
 aria-current={isActive ? 'page' : undefined}
 style={{
 background: 'transparent',
 border: 'none',
 color: isActive ? 'var(--accent-primary)' : 'var(--text-muted)',
 display: 'flex',
 flexDirection: 'column',
 alignItems: 'center',
 gap: '4px',
 fontSize: '0.72rem',
 fontWeight: isActive ? 700 : 500,
 cursor: 'pointer',
 padding: '8px 12px',
 borderRadius: '8px',
 transition: 'color 0.2s',
 }}
 >
 <TabIcon
 size={20}
 strokeWidth={isActive ? 2.5 : 1.8}
 />
 <span>{tab.label}</span>
 </button>
 );
 })}
 </nav>
 );
}
