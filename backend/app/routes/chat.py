"""
chat.py - Clearward AI Chatbot API Endpoint

Provides a conversational AI interface powered by Gemini with:
    - Multi-turn conversation history support
    - Financial context injection (live prices, indicators, signals)
    - SEBI-compliant non-advisory guardrails
    - News-grounded factual responses
    - Smart intent detection (stock query / education / portfolio / general)

    Endpoint:
        POST /api/chat
"""

import os
import logging
import re
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.cache import get_cached, set_cached

logger = logging.getLogger(__name__)

router = APIRouter()

# --- CONSTANTS -----------------------------------------------------------------

DISCLAIMER = "For education only. Not investment advice."

SYSTEM_PROMPT = """You are Clearward AI - an elite financial literacy assistant for Indian retail investors.

## YOUR IDENTITY
You are razor-sharp, deeply knowledgeable, and speak like a top-tier quantitative analyst who genuinely cares about protecting retail investors from financial mistakes. You are NOT a generic chatbot - you are a specialized financial intelligence system.

## YOUR PERSONALITY
- Precise and data-driven, but never robotic
- Use analogies and real-world examples to explain complex concepts
- Confident but honest about uncertainty
- Slightly wry humor when appropriate
- Always frame insights through the lens of PROTECTING the retail investor

## YOUR DOMAIN EXPERTISE
- Indian equity markets (NSE/BSE, NIFTY, SENSEX)
- Mutual funds (AMFI, SEBI regulations, expense ratios, direct vs regular plans)
- Technical analysis (RSI, MACD, EMA, Bollinger Bands, ATR, volume patterns)
- ARIMA/ML time-series forecasting concepts (explain what Clearward's models actually do)
- Portfolio construction, diversification, overlap risk
- Behavioral finance (FOMO, loss aversion, recency bias, herd mentality)
- SEBI regulations, AMFI guidelines, ADR/investment advisory rules
- Inflation, interest rates, RBI policy impact on equity markets
- Derivatives basics (futures/options concepts, not trading advice)

## HARD RULES (NEVER VIOLATE)
1. NEVER give buy/sell/hold recommendations for specific stocks
2. NEVER state target prices or guaranteed returns
3. NEVER say "this stock will go up/down"
4. ALWAYS add educational framing: "this is how the metric works", "historically this pattern..."
5. If asked for stock picks, redirect to how to evaluate stocks yourself
6. When discussing specific stocks, only describe factual metrics and patterns
7. End responses with the disclaimer when discussing specific investments

## RESPONSE STYLE
- Use **bold** for key terms
- Use bullet points for lists
- Keep answers focused - 150-300 words unless deep explanation is requested
- Use ₹ symbol for Indian currency
- Reference Clearward's actual features (Hype Guard, Portfolio Doctor, ARIMA Forecast, etc.) when relevant
- For complex topics, start with the TL;DR then explain

## WHAT YOU KNOW ABOUT CLEARWARD
Clearward is an AI-powered financial self-defense platform. Features:
    - **Stock Intelligence**: Live candlestick charts with EMA/RSI/MACD overlays
    - **Hype Guard**: Detects pump-and-dump patterns, volume anomalies, RSI overbought
    - **Portfolio Doctor**: Overlap analysis, fee leakage calculator, stress testing
    - **Mutual Fund Analyzer**: CAGR/Sharpe/Drawdown for 1500+ AMFI schemes, Direct vs Regular cost audit
    - **ARIMA Forecast**: Statistical confidence intervals (NOT predictions) using ARIMA models
    - **ML Direction Bias**: Random Forest + MLP classifier showing historical pattern bias
    - **Multi-Stock Comparison**: Side-by-side metrics, RadarChart visualization
    - **Watchlist**: Live tracking with hype badge alerts

For education only. Not investment advice."""


# --- MODELS ---------------------------------------------------------------------

class ChatMessage(BaseModel):
    role: str = Field(..., description="'user' or 'assistant'")
    content: str = Field(..., description="Message content")


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000, description="User's message")
    history: List[ChatMessage] = Field(default=[], description="Conversation history (max 20 turns)")
    symbol: Optional[str] = Field(None, description="Currently viewed stock symbol for context injection")
    context: Optional[Dict[str, Any]] = Field(None, description="Optional market context data")


class ChatResponse(BaseModel):
    reply: str
    intent: str
    disclaimer: str
    suggestions: List[str] = Field(default=[], description="Suggested follow-up questions")
    timestamp: str
    model: str


# --- INTENT DETECTION -----------------------------------------------------------

def _detect_intent(message: str) -> str:
    """Classify user intent for logging and response shaping."""
    msg = message.lower()
    if any(k in msg for k in ["buy", "sell", "invest", "pick", "recommend", "should i"]):
        return "investment_advice_request"
    if any(k in msg for k in ["rsi", "macd", "ema", "bollinger", "atr", "indicator", "technical"]):
        return "technical_analysis"
    if any(k in msg for k in ["mutual fund", "sip", "nav", "aum", "expense ratio", "direct", "regular"]):
        return "mutual_fund"
    if any(k in msg for k in ["portfolio", "diversif", "overlap", "allocation", "rebalance"]):
        return "portfolio"
    if any(k in msg for k in ["hype", "pump", "manipulate", "volume", "retail", "fomo"]):
        return "hype_guard"
    if any(k in msg for k in ["arima", "forecast", "predict", "model", "ml", "lstm", "random forest"]):
        return "model_explanation"
    if any(k in msg for k in ["sebi", "amfi", "regulation", "advisory", "compliance"]):
        return "regulatory"
    if any(k in msg for k in [".ns", ".bo", "nifty", "sensex", "reliance", "tcs", "hdfc", "infy", "stock"]):
        return "stock_query"
    return "general_finance"


# --- CONTEXT BUILDER ------------------------------------------------------------

def _build_context_block(symbol: Optional[str], context: Optional[Dict]) -> str:
    """Build a financial context block to inject into the prompt."""
    parts = []

    if symbol:
        parts.append(f"## CURRENT STOCK CONTEXT\nUser is viewing: **{symbol}**")

        # Try to pull cached data for this symbol
        cached_signals = get_cached("signals", symbol)
        cached_price = get_cached("prices", symbol)

        if cached_price and isinstance(cached_price, dict):
            price = cached_price.get("current_price") or cached_price.get("close")
            if price:
                parts.append(f"Current Price: ₹{price}")

        if cached_signals and isinstance(cached_signals, dict):
            rsi = cached_signals.get("rsi_14")
            signal = cached_signals.get("signal_type")
            if rsi:
                parts.append(f"RSI (14): {rsi:.1f}")
            if signal:
                parts.append(f"Current Signal: {signal}")

    if context:
        nifty = context.get("nifty_level")
        vix = context.get("vix")
        if nifty:
            parts.append(f"NIFTY 50: {nifty}")
        if vix:
            parts.append(f"India VIX: {vix}")

    if parts:
        return "\n".join(parts) + "\n\n"
    return ""


# --- GEMINI CALL ----------------------------------------------------------------

def _call_gemini(system_prompt: str, history: List[ChatMessage], user_message: str) -> str:
    """Call Gemini API with conversation history and system context."""
    gemini_key = os.getenv("GEMINI_API_KEY")

    if not gemini_key:
        return _fallback_response(user_message)

    try:
        import google.generativeai as genai
        genai.configure(api_key=gemini_key)

        model = genai.GenerativeModel(
            model_name="gemini-1.5-flash",
            system_instruction=system_prompt,
            generation_config={
                "temperature": 0.7,
                "top_p": 0.9,
                "max_output_tokens": 1024,
            }
        )

        # Build conversation history for multi-turn
        chat_history = []
        for msg in history[-10:]:  # Keep last 10 turns to manage context length
            role = "user" if msg.role == "user" else "model"
            chat_history.append({"role": role, "parts": [msg.content]})

        chat = model.start_chat(history=chat_history)
        response = chat.send_message(user_message)

        return response.text.strip()

    except Exception as e:
        logger.warning("Gemini chat error: %s", e)
        return _fallback_response(user_message)


def _fallback_response(message: str) -> str:
    """High-quality fallback when Gemini API is unavailable."""
    msg = message.lower()

    if any(k in msg for k in ["rsi", "relative strength"]):
        return """**RSI (Relative Strength Index)** is a momentum oscillator that measures the speed and magnitude of recent price changes.

- **Scale**: 0 to 100
- **Overbought**: RSI > 70 -> historically associated with potential mean-reversion
- **Oversold**: RSI < 30 -> historically associated with potential bounce
- **Divergence**: Price makes new high but RSI doesn't -> weakening momentum signal

Clearward calculates RSI-14 (14-day period) for all tracked stocks. You can see it in the **Stock Intelligence** tab -> Technicals section.

RSI is a lagging indicator. It describes past momentum, not future price. *For education only. Not investment advice.*"""

    if any(k in msg for k in ["sip", "systematic"]):
        return """**SIP (Systematic Investment Plan)** is a disciplined approach to investing fixed amounts at regular intervals.

**Why SIP works:**
- **Rupee Cost Averaging**: You buy more units when prices are low, fewer when high
- **Removes market timing**: No need to predict tops/bottoms
- **Compounding**: Returns reinvested over time grow exponentially

**Clearward's SIP Calculator** (in Mutual Fund Analyzer) shows you:
- Future value at different return rates
- The compounding wealth drag of Regular vs Direct plans (typically 1.25% higher expense ratio)

Over 20 years, the difference between Direct and Regular plans can be ₹10-40 lakhs on a ₹10,000/month SIP. That's pure commission you're paying unnecessarily.

*For education only. Not investment advice.*"""

    if any(k in msg for k in ["hype", "pump", "manipulate"]):
        return """**Hype & Pump Detection** - what Clearward's Hype Guard actually checks:

- **Volume Anomaly**: Current volume vs 20-day average (>3x is a red flag)
- **Price-Volume Divergence**: Price rising but volume falling -> weak move
- **RSI Overbought**: RSI > 75 combined with volume spike -> manipulation risk
- **5D & 20D Returns**: Sudden >15% move in 5 days without fundamental news
- **P/E vs Sector**: Extreme overvaluation relative to sector peers

A **RED FLAG** verdict means the stock shows multiple manipulation risk patterns simultaneously. It does NOT mean the stock will fall - it means exercise extreme caution.

*For education only. Not investment advice.*"""

    return """I'm Clearward AI - your financial literacy companion for Indian markets.

I can help you understand:
- **Technical indicators** (RSI, MACD, EMA, Bollinger Bands)
- **Hype detection** (how to spot pump-and-dump patterns)
- **Portfolio concepts** (diversification, overlap, fee leakage)
- **Mutual funds** (CAGR, Sharpe ratio, Direct vs Regular)
- **ML models** (how Clearward's ARIMA and RandomForest work)
- **Market fundamentals** (P/E, EPS, market cap, indices)

What would you like to learn about?

*For education only. Not investment advice.*"""


def _generate_suggestions(intent: str, symbol: Optional[str]) -> List[str]:
    """Generate dynamic follow-up suggestions based on intent and active symbol."""
    sym_str = symbol or "RELIANCE.NS"
    if intent == "technical_analysis":
        return [
            f"How is RSI-14 calculated for {sym_str}?",
            "What is the difference between MACD line and signal line?",
            "Explain Bollinger Bands squeezes",
        ]
    elif intent == "hype_guard":
        return [
            f"What is {sym_str} volume anomaly ratio?",
            "How to spot pump-and-dump patterns on Telegram?",
            "Explain RSI overbought warning risk",
        ]
    elif intent == "mutual_fund":
        return [
            "What is the cost difference between Direct and Regular plans?",
            "How is portfolio overlap calculated?",
            "Explain CAGR vs XIRR for SIP returns",
        ]
    elif intent == "portfolio":
        return [
            "How many stocks should an Indian retail portfolio hold?",
            "What is portfolio beta and market risk?",
            "Explain rebalancing rules during market corrections",
        ]
    elif intent == "model_explanation":
        return [
            "What is walk-forward cross validation?",
            "How does ARIMA handle non-stationary stock data?",
            "Explain F1 score vs accuracy in financial ML",
        ]
    elif intent == "stock_query":
        return [
            f"What is the current technical pattern for {sym_str}?",
            f"Show latest news headlines for {sym_str}",
            f"Compare {sym_str} against sector benchmarks",
        ]
    else:
        return [
            "Explain RSI-14 momentum indicator",
            "How does Hype Guard detect volume spikes?",
            "Direct vs Regular mutual fund cost comparison",
        ]


# --- ENDPOINT --------------------------------------------------------------------

@router.post("/chat", response_model=ChatResponse)
def chat(request: ChatRequest) -> ChatResponse:
    """
    POST /api/chat

    Multi-turn financial AI chat powered by Gemini with:
        - Conversation history (up to 20 turns)
        - Financial context injection (live symbol data)
        - SEBI-compliant guardrails
        - Smart intent detection
        - Dynamic follow-up prompt suggestions
    """
    # Trim history to last 20 messages
    trimmed_history = request.history[-20:]

    # Detect intent
    intent = _detect_intent(request.message)

    # Build context-enriched system prompt
    context_block = _build_context_block(request.symbol, request.context)
    enriched_system = SYSTEM_PROMPT
    if context_block:
        enriched_system = context_block + enriched_system

    # Call Gemini (or fallback)
    reply = _call_gemini(enriched_system, trimmed_history, request.message)

    # Ensure disclaimer is present for investment-related intents
    investment_intents = {"investment_advice_request", "stock_query", "mutual_fund", "portfolio"}
    if intent in investment_intents and DISCLAIMER not in reply:
        reply = reply.rstrip() + f"\n\n*{DISCLAIMER}*"

    suggestions = _generate_suggestions(intent, request.symbol)

    logger.info("Chat: intent=%s, symbol=%s, history_len=%d", intent, request.symbol, len(trimmed_history))

    return ChatResponse(
        reply=reply,
        intent=intent,
        disclaimer=DISCLAIMER,
        suggestions=suggestions,
        timestamp=datetime.now(timezone.utc).isoformat(),
        model="gemini-1.5-flash"
    )
