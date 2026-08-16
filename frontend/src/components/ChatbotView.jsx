/**
 * ChatbotView.jsx — Clearward Intelligence AI Financial Assistant
 *
 * Designed to match the platform's Obsidian Terminal design system:
 * - Glassmorphism cards with amber/slate accents
 * - Categorized prompt pills (Technicals, Hype Guard, Mutual Funds, ML & Risk)
 * - Copy message, intention badge, markdown formatting
 * - Contextual stock awareness
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Bot, User, Send, Trash2, Copy, Check, Sparkles,
  ShieldAlert, Activity, PieChart, Cpu, HelpCircle,
  ExternalLink, CornerDownLeft, RefreshCw, Zap, X, Minus
} from 'lucide-react';
import { formatRegimeLabel } from '../utils/sebiFormatter';

// ─── Categorized Quick Prompts ──────────────────────────────────────────────────

const PROMPT_CATEGORIES = [
  {
    id: 'technicals',
    label: 'Technicals',
    icon: Activity,
    prompts: [
      { label: 'Explain RSI (14)', query: 'Explain RSI-14 and how overbought/oversold levels work for Indian stocks.' },
      { label: 'MACD Divergence', query: 'What is MACD histogram divergence and how is it calculated?' },
      { label: 'Moving Averages', query: 'What is the difference between 50-day and 200-day EMA golden cross?' },
    ],
  },
  {
    id: 'hype',
    label: 'Hype Guard',
    icon: ShieldAlert,
    prompts: [
      { label: 'Detect Pump & Dump', query: 'How does Clearward Hype Guard detect stock manipulation and social media pump-and-dump spikes?' },
      { label: 'Volume Anomalies', query: 'What qualifies as a volume anomaly and why does unusual volume precede price moves?' },
    ],
  },
  {
    id: 'funds',
    label: 'Mutual Funds',
    icon: PieChart,
    prompts: [
      { label: 'Direct vs Regular MF', query: 'What is the exact difference between Direct and Regular mutual fund plans and how much returns do you lose?' },
      { label: 'Portfolio Overlap', query: 'What is mutual fund portfolio overlap and why does holding 5 equity funds increase risk?' },
    ],
  },
  {
    id: 'ml',
    label: 'ML & Risk',
    icon: Cpu,
    prompts: [
      { label: 'Walk-Forward ML', query: 'How does Clearward walk-forward validation prevent target leakage in ML models?' },
      { label: 'Max Drawdown', query: 'Explain max drawdown risk and why it matters more than simple 1-year returns.' },
    ],
  },
];

// ─── Intent Metadata ────────────────────────────────────────────────────────────

const INTENT_MAP = {
  technical_analysis: { label: 'Technicals', color: 'var(--amber-gold)' },
  mutual_fund:        { label: 'Mutual Funds', color: '#60A5FA' },
  portfolio:          { label: 'Portfolio Risk', color: '#38BDF8' },
  hype_guard:         { label: 'Hype Guard', color: 'var(--selloff)' },
  model_explanation:  { label: 'ML Architecture', color: '#A78BFA' },
  stock_query:        { label: 'Stock Intel', color: 'var(--rally)' },
  regulatory:         { label: 'SEBI Compliance', color: '#2DD4BF' },
  general_finance:    { label: 'Finance Concept', color: 'var(--slate)' },
};

// ─── Markdown Parser ───────────────────────────────────────────────────────────

function parseMarkdown(text) {
  if (!text) return '';
  let html = text
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong style="color:var(--ink);font-weight:600">$1</strong>')
    // Italic
    .replace(/\*(.+?)\*/g, '<em style="color:var(--slate-light)">$1</em>')
    // Inline Code
    .replace(/`([^`]+)`/g, '<code style="background:rgba(201,165,77,0.12);border:1px solid rgba(201,165,77,0.25);color:var(--amber-gold);padding:2px 6px;border-radius:4px;font-size:0.82em;font-family:\'IBM Plex Mono\',monospace">$1</code>')
    // Bullet points
    .replace(/^[-•] (.+)$/gm, '<li style="margin-bottom:4px">$1</li>')
    .replace(/(<li.*<\/li>)/s, '<ul style="margin:8px 0 8px 18px;padding:0;color:var(--ink)">$1</ul>')
    // Line breaks
    .replace(/\n\n/g, '</p><p style="margin:8px 0">')
    .replace(/\n/g, '<br/>');

  return `<p style="margin:0">${html}</p>`;
}

// ─── Message Item ──────────────────────────────────────────────────────────────

function MessageBubble({ msg, isLatest }) {
  const isUser = msg.role === 'user';
  const [copied, setCopied] = useState(false);

  const copyText = () => {
    navigator.clipboard.writeText(msg.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const intentInfo = msg.intent ? INTENT_MAP[msg.intent] : null;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: isUser ? 'row-reverse' : 'row',
        alignItems: 'flex-start',
        gap: '12px',
        marginBottom: '18px',
      }}
    >
      {/* Avatar */}
      <div
        style={{
          width: '34px',
          height: '34px',
          borderRadius: '8px',
          flexShrink: 0,
          background: isUser ? 'rgba(201,165,77,0.15)' : 'rgba(255,255,255,0.04)',
          border: `1px solid ${isUser ? 'rgba(201,165,77,0.3)' : 'var(--glass-border)'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {isUser ? (
          <User size={16} color="var(--amber-gold)" />
        ) : (
          <Bot size={16} color="var(--amber-gold)" />
        )}
      </div>

      {/* Bubble Content */}
      <div style={{ maxWidth: '82%', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {/* Intent tag for assistant */}
        {!isUser && intentInfo && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
            <span
              style={{
                fontSize: '0.62rem',
                fontFamily: "'IBM Plex Mono', monospace",
                color: intentInfo.color,
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid var(--glass-border)',
                borderRadius: '4px',
                padding: '1px 6px',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              {intentInfo.label}
            </span>
          </div>
        )}

        <div
          style={{
            padding: '14px 18px',
            borderRadius: isUser ? '12px 2px 12px 12px' : '2px 12px 12px 12px',
            background: isUser
              ? 'rgba(201,165,77,0.08)'
              : 'rgba(255,255,255,0.02)',
            border: `1px solid ${isUser ? 'rgba(201,165,77,0.25)' : 'var(--glass-border)'}`,
            color: 'var(--ink)',
            fontSize: '0.88rem',
            lineHeight: '1.65',
            fontFamily: "'Inter', sans-serif",
            position: 'relative',
          }}
        >
          {isUser ? (
            <div style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>
          ) : (
            <div dangerouslySetInnerHTML={{ __html: parseMarkdown(msg.content) }} />
          )}
        </div>

        {/* Footer info & actions */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: isUser ? 'flex-end' : 'space-between',
            fontSize: '0.65rem',
            color: 'var(--slate)',
            fontFamily: "'IBM Plex Mono', monospace",
            padding: '0 2px',
          }}
        >
          {!isUser && (
            <button
              onClick={copyText}
              style={{
                background: 'none',
                border: 'none',
                color: copied ? 'var(--rally)' : 'var(--slate)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.65rem',
                fontFamily: "'IBM Plex Mono', monospace",
                padding: '2px 4px',
              }}
            >
              {copied ? <Check size={11} /> : <Copy size={11} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          )}
          <span>{msg.timestamp}</span>
        </div>

        {/* Dynamic Follow-Up Prompt Suggestions */}
        {!isUser && msg.suggestions && msg.suggestions.length > 0 && (
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
            {msg.suggestions.map((sug, i) => (
              <button
                key={i}
                onClick={() => onSendSuggestion && onSendSuggestion(sug)}
                style={{
                  fontSize: '0.72rem',
                  fontFamily: "'Inter', sans-serif",
                  color: 'var(--amber-gold)',
                  background: 'rgba(201,165,77,0.08)',
                  border: '1px solid rgba(201,165,77,0.25)',
                  borderRadius: '12px',
                  padding: '3px 10px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  textAlign: 'left',
                }}
              >
                ↳ {sug}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Loading Skeleton ──────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '18px' }}>
      <div
        style={{
          width: '34px',
          height: '34px',
          borderRadius: '8px',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid var(--glass-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Bot size={16} color="var(--amber-gold)" />
      </div>
      <div
        style={{
          padding: '14px 18px',
          borderRadius: '2px 12px 12px 12px',
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid var(--glass-border)',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}
      >
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: 'var(--amber-gold)',
              animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
            }}
          />
        ))}
        <span style={{ fontSize: '0.75rem', color: 'var(--slate)', fontFamily: "'IBM Plex Mono', monospace", marginLeft: '6px' }}>
          Analyzing intelligence...
        </span>
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function ChatbotView({ activeSymbol, isPopup = false, onClose }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `**Clearward Financial Intelligence**

Ask me anything about market indicators, risk metrics, mutual funds, or algorithmic signals.

${activeSymbol ? `Currently inspecting **${activeSymbol}**. Ask a specific question about it!` : 'Select a quick topic below or type your query.'}`,
      timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      intent: null,
    },
  ]);

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('technicals');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSend = useCallback(async (textToSend) => {
    const query = (textToSend || input).trim();
    if (!query || isLoading) return;

    const userMsg = {
      role: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    const history = messages.slice(1).map((m) => ({ role: m.role, content: m.content }));

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          history,
          symbol: activeSymbol || null,
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: data.reply,
          intent: data.intent,
          suggestions: data.suggestions || [],
          timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Unable to connect to financial intelligence engine. Ensure backend server is running.',
          intent: null,
          timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [input, isLoading, messages, activeSymbol]);

  const handleClear = () => {
    setMessages([
      {
        role: 'assistant',
        content: 'Chat cleared. How can I assist your financial analysis?',
        timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        intent: null,
      },
    ]);
  };

  const selectedCategory = PROMPT_CATEGORIES.find((c) => c.id === activeTab);

  return (
    <div
      style={{
        maxWidth: isPopup ? '100%' : '920px',
        margin: '0 auto',
        height: isPopup ? '100%' : 'calc(100vh - 130px)',
        minHeight: isPopup ? '420px' : '620px',
        display: 'flex',
        flexDirection: 'column',
        gap: '0',
      }}
    >
      {/* ── Top Header Bar ───────────────────────────────────────── */}
      <div
        style={{
          padding: '14px 18px',
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid var(--glass-border)',
          borderRadius: '12px 12px 0 0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '8px',
              background: 'rgba(201,165,77,0.12)',
              border: '1px solid rgba(201,165,77,0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Sparkles size={16} color="var(--amber-gold)" />
          </div>
          <div>
            <h2
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: '0.98rem',
                fontWeight: 700,
                color: 'var(--ink)',
                margin: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              Clearward AI
              {activeSymbol && (
                <span
                  style={{
                    fontSize: '0.68rem',
                    fontFamily: "'IBM Plex Mono', monospace",
                    color: 'var(--amber-gold)',
                    background: 'rgba(201,165,77,0.1)',
                    border: '1px solid rgba(201,165,77,0.25)',
                    padding: '2px 8px',
                    borderRadius: '12px',
                  }}
                >
                  {activeSymbol}
                </span>
              )}
            </h2>
            <p style={{ margin: 0, fontSize: '0.68rem', color: 'var(--slate)', fontFamily: "'IBM Plex Mono', monospace" }}>
              Educational Financial AI
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={handleClear}
            title="Clear chat session"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '5px 10px',
              background: 'transparent',
              border: '1px solid var(--glass-border)',
              borderRadius: '6px',
              color: 'var(--slate)',
              fontSize: '0.72rem',
              fontFamily: "'IBM Plex Mono', monospace",
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <Trash2 size={13} /> Clear
          </button>

          {onClose && (
            <button
              onClick={onClose}
              title="Close chat popup"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '28px',
                height: '28px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid var(--glass-border)',
                borderRadius: '6px',
                color: 'var(--ink)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* ── Messages Container ───────────────────────────────────── */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '22px',
          background: 'rgba(0,0,0,0.25)',
          borderLeft: '1px solid var(--glass-border)',
          borderRight: '1px solid var(--glass-border)',
        }}
      >
        {messages.map((msg, idx) => (
          <MessageBubble
            key={idx}
            msg={msg}
            isLatest={idx === messages.length - 1}
            onSendSuggestion={handleSend}
          />
        ))}

        {isLoading && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </div>

      {/* ── Quick Prompts Tabs & Chips ───────────────────────────── */}
      <div
        style={{
          background: 'rgba(255,255,255,0.015)',
          borderLeft: '1px solid var(--glass-border)',
          borderRight: '1px solid var(--glass-border)',
          borderTop: '1px solid var(--glass-border)',
          padding: '12px 18px',
          flexShrink: 0,
        }}
      >
        {/* Category Selector */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '10px', overflowX: 'auto', paddingBottom: '2px' }}>
          {PROMPT_CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeTab === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveTab(cat.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  padding: '4px 10px',
                  borderRadius: '6px',
                  border: isActive ? '1px solid var(--amber-gold)' : '1px solid rgba(255,255,255,0.06)',
                  background: isActive ? 'rgba(201,165,77,0.12)' : 'transparent',
                  color: isActive ? 'var(--amber-gold)' : 'var(--slate)',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease',
                }}
              >
                <Icon size={12} /> {cat.label}
              </button>
            );
          })}
        </div>

        {/* Quick Chips */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {selectedCategory?.prompts.map((p, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(p.query)}
              disabled={isLoading}
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: '0.75rem',
                color: 'var(--ink)',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid var(--glass-border)',
                borderRadius: '6px',
                padding: '5px 11px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                textAlign: 'left',
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Input Box ────────────────────────────────────────────── */}
      <div
        style={{
          padding: '16px 20px',
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid var(--glass-border)',
          borderRadius: '0 0 12px 12px',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder={
              activeSymbol
                ? `Ask about ${activeSymbol} (e.g. RSI level, momentum, news)...`
                : 'Ask a financial question...'
            }
            disabled={isLoading}
            style={{
              flex: 1,
              background: 'rgba(0,0,0,0.4)',
              border: '1px solid var(--glass-border)',
              borderRadius: '8px',
              padding: '10px 14px',
              color: 'var(--ink)',
              fontSize: '0.85rem',
              fontFamily: "'Inter', sans-serif",
              outline: 'none',
            }}
          />

          <button
            onClick={() => handleSend()}
            disabled={isLoading || !input.trim()}
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              background: input.trim() && !isLoading ? 'var(--amber-gold)' : 'rgba(255,255,255,0.05)',
              border: 'none',
              color: input.trim() && !isLoading ? '#070A10' : 'var(--slate)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: input.trim() && !isLoading ? 'pointer' : 'default',
              transition: 'all 0.15s ease',
              flexShrink: 0,
            }}
          >
            <Send size={16} />
          </button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '0.65rem', color: 'var(--slate)', fontFamily: "'IBM Plex Mono', monospace" }}>
          <span>Press Enter to send</span>
          <span>For education only. Not investment advice.</span>
        </div>
      </div>
    </div>
  );
}
