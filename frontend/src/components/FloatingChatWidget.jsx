/**
 * FloatingChatWidget.jsx — Floating AI Chatbot Popup Widget
 *
 * Renders a persistent floating trigger button in the bottom-right corner of the viewport.
 * Clicking opens a sleek, glassmorphic floating chat popup modal that can be accessed
 * from ANY tab or view in the application.
 */

import React, { useState, Suspense } from 'react';
import { Bot, X, Sparkles, MessageSquare } from 'lucide-react';

const ChatbotView = React.lazy(() => import('./ChatbotView'));

export default function FloatingChatWidget({ activeSymbol }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* ── Floating Trigger Button (Bottom Right) ─────────────────── */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="Toggle AI Assistant Chat Popup"
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 18px',
          background: 'linear-gradient(135deg, rgba(201,165,77,0.9) 0%, rgba(160,120,40,0.95) 100%)',
          color: '#070A10',
          border: '1px solid rgba(255,255,255,0.2)',
          borderRadius: '30px',
          boxShadow: '0 8px 32px rgba(201,165,77,0.35), 0 2px 8px rgba(0,0,0,0.5)',
          cursor: 'pointer',
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: '0.84rem',
          fontWeight: 700,
          transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
          backdropFilter: 'blur(12px)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px) scale(1.03)';
          e.currentTarget.style.boxShadow = '0 12px 40px rgba(201,165,77,0.5), 0 4px 12px rgba(0,0,0,0.6)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0) scale(1)';
          e.currentTarget.style.boxShadow = '0 8px 32px rgba(201,165,77,0.35), 0 2px 8px rgba(0,0,0,0.5)';
        }}
      >
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          {isOpen ? <X size={18} /> : <Bot size={18} />}
          <span
            style={{
              position: 'absolute',
              top: '-3px',
              right: '-3px',
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#3DDC84',
              boxShadow: '0 0 8px #3DDC84',
            }}
          />
        </div>
        <span>{isOpen ? 'Close Assistant' : 'Clearward AI'}</span>
      </button>

      {/* ── Floating Chat Popup Modal Window ───────────────────────── */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            bottom: '80px',
            right: '24px',
            width: '440px',
            maxWidth: 'calc(100vw - 32px)',
            height: '620px',
            maxHeight: 'calc(100vh - 110px)',
            zIndex: 9998,
            background: 'rgba(12, 14, 26, 0.94)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(201,165,77,0.3)',
            borderRadius: '16px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.8), 0 0 40px rgba(201,165,77,0.15)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            animation: 'slideUpFade 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          <Suspense fallback={
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--slate)', fontFamily: "'IBM Plex Mono', monospace" }}>
              Loading AI Assistant...
            </div>
          }>
            <ChatbotView
              activeSymbol={activeSymbol}
              isPopup={true}
              onClose={() => setIsOpen(false)}
            />
          </Suspense>
        </div>
      )}
    </>
  );
}
