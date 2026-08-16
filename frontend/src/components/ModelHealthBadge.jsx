/**
 * ModelHealthBadge.jsx — Collapsed model health indicator, anchored to bottom-right
 *
 * Design: This is infrastructure the builder cares about, not something that
 * should compete for attention with the user's actual question about a stock.
 * So it lives collapsed as a 40×40 pill in the nav bar, never in the main layout.
 *
 * Behaviour:
 * - Collapsed: a small colored dot (gold = healthy, red = degraded)
 * - Click/hover: expands to a glass tooltip showing model name + last retrain time
 *
 * Props:
 * - onOpenModels {Function} Called when user clicks to open the Models tab
 */

import React, { useState } from 'react';
import { Cpu, ChevronRight } from 'lucide-react';

export default function ModelHealthBadge({ onOpenModels }) {
 const [isExpanded, setIsExpanded] = useState(false);

 return (
 <div style={{ position: 'relative' }}>
 {/* Collapsed pill — always visible */}
 <button
 onClick={() => { setIsExpanded(prev => !prev); }}
 aria-label="Model health status — click to expand"
 aria-expanded={isExpanded}
 style={{
 display: 'flex',
 alignItems: 'center',
 gap: '6px',
 background: 'rgba(201,165,77,0.1)',
 border: '1px solid rgba(201,165,77,0.25)',
 borderRadius: '8px',
 padding: '6px 10px',
 cursor: 'pointer',
 transition: 'all 0.15s',
 }}
 onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--amber-gold)'}
 onMouseLeave={(e) => !isExpanded && (e.currentTarget.style.borderColor = 'rgba(201,165,77,0.25)')}
 >
 {/* Health indicator dot */}
 <span style={{
 width: 7, height: 7,
 borderRadius: '50%',
 background: 'var(--rally)',
 boxShadow: '0 0 6px rgba(61,220,132,0.6)',
 display: 'inline-block',
 flexShrink: 0,
 }} />
 <Cpu size={13} color="var(--amber-gold)" />
 <span style={{
 fontFamily: "'IBM Plex Mono', monospace",
 fontSize: '0.72rem',
 color: 'var(--amber-gold)',
 }}>Model</span>
 </button>

 {/* Expanded tooltip panel */}
 {isExpanded && (
 <div style={{
 position: 'absolute',
 top: 'calc(100% + 8px)',
 right: 0,
 background: 'var(--void-panel)',
 border: '1px solid rgba(201,165,77,0.25)',
 borderRadius: '10px',
 padding: '12px 14px',
 minWidth: '200px',
 boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
 zIndex: 200,
 animation: 'panel-rise 200ms ease both',
 }}>
 <div style={{ fontSize: '0.72rem', color: 'var(--slate)', fontFamily: "'Space Grotesk', sans-serif", marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Active Model</div>
 <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.82rem', color: 'var(--ink)', marginBottom: '4px' }}>RandomForest Champion</div>
 <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.72rem', color: 'var(--slate)' }}>13 tests passing · Walk-forward validated</div>
 <button
 onClick={() => { onOpenModels(); setIsExpanded(false); }}
 style={{
 marginTop: '10px',
 display: 'flex',
 alignItems: 'center',
 gap: '4px',
 fontFamily: "'Space Grotesk', sans-serif",
 fontSize: '0.78rem',
 color: 'var(--amber-gold)',
 cursor: 'pointer',
 padding: '0',
 background: 'none',
 border: 'none',
 }}
 >
 View changelog <ChevronRight size={13} />
 </button>
 </div>
 )}
 </div>
 );
}
