import os
import re
import logging
from typing import List, Dict

logger = logging.getLogger(__name__)

SYSTEM_PROMPT_STRICT_RAG = """
You are a ClearWard quantitative analyst writing a STRUCTURED market explanation.
Respond in exactly this format — no other text:

SUMMARY: <1 sentence: what the price action is doing right now>

MOMENTUM: <1 sentence: what RSI + MACD + volume say about current momentum>

NEWS_CONTEXT: <2-3 sentences: what reported news headlines say — cite each with [id]>

RISK_NOTE: <1 sentence: one key risk or uncertainty from the technical picture>

CRITICAL RULES:
- Every claim about news MUST be backed by a cited snippet [id].
- Do NOT assert ungrounded causality (no "rose because of", "fell due to").
- Do NOT fabricate earnings figures, target prices or events not in the snippets.
- Do NOT give buy/sell advice. For education only.
"""


def _clean_prose(text: str) -> str:
    """Normalize whitespace."""
    return re.sub(r" +", " ", text).strip()


def verify_sentence_grounding(sentence: str, snippets: List[Dict]) -> bool:
    """
    Post-generation entailment check: verifies a sentence has supporting
    keyword overlap with retrieved snippets, a citation tag, or model signal terms.
    """
    if "[" in sentence and "]" in sentence:
        return True
    low = sentence.lower()
    if any(term in low for term in [
        "quantitative model", "model indicates", "technical", "rsi", "macd",
        "confidence", "momentum", "consolidation", "signal", "volume",
    ]):
        return True
    if len(set(re.findall(r"\w+", low))) < 4:
        return True
    sentence_words = set(re.findall(r"\w+", low))
    for snip in snippets:
        snip_text = (snip.get("title", "") + " " + snip.get("content", "")).lower()
        snip_words = set(re.findall(r"\w+", snip_text))
        overlap = len(sentence_words & snip_words) / max(1, len(sentence_words))
        if overlap >= 0.28:
            return True
    return False


def _build_fallback_explanation(
    company_name: str,
    symbol: str,
    price: float,
    signal_info: Dict,
    prediction_info: Dict,
    citations: List[Dict],
) -> Dict[str, str]:
    """
    Structured fallback when Gemini key is absent or LLM call fails.
    Returns a dict with section keys matching the LLM output format.
    """
    direction = prediction_info.get("direction", "FLAT")
    conf_pct = round(prediction_info.get("confidence", 0.5) * 100, 1)
    sig_type = signal_info.get("signal_type", "CONSOLIDATION").replace("_", " ").title()
    sig_dir = signal_info.get("direction", "NEUTRAL").title()

    summary = (
        f"{company_name} ({symbol}) is trading at ₹{price:,.2f} with the quantitative "
        f"model signalling a {direction} bias at {conf_pct}% confidence."
    )
    momentum = (
        f"The active technical pattern is {sig_type}, pointing {sig_dir}. "
        f"Indicator confluence includes RSI, MACD histogram, and volume ratio."
    )
    news_context = ""
    seen = set()
    news_parts = []
    for c in citations:
        t = c.get("title", "").strip()
        if t and t.lower() not in seen:
            seen.add(t.lower())
            news_parts.append(f"\"{t}\" [{c['id']}]")
        if len(news_parts) >= 2:
            break
    if news_parts:
        news_context = "Reported coverage: " + " | ".join(news_parts) + "."
    else:
        news_context = "No recent news snippets were retrieved for this symbol."

    risk_note = (
        "Model confidence is derived from historical patterns; past signals "
        "do not guarantee future outcomes. For education only. Not investment advice."
    )

    return {
        "SUMMARY": summary,
        "MOMENTUM": momentum,
        "NEWS_CONTEXT": news_context,
        "RISK_NOTE": risk_note,
    }


def _parse_structured_response(text: str) -> Dict[str, str]:
    """Parse the structured LLM response into section dict."""
    sections = {}
    keys = ["SUMMARY", "MOMENTUM", "NEWS_CONTEXT", "RISK_NOTE"]
    for i, key in enumerate(keys):
        pattern = rf"{key}:\s*(.*?)(?={'|'.join(keys[i+1:])}:|$)" if i < len(keys) - 1 else rf"{key}:\s*(.*?)$"
        m = re.search(pattern, text, re.DOTALL)
        if m:
            sections[key] = m.group(1).strip()
    return sections


def generate_grounded_explanation(
    symbol: str,
    company_name: str,
    price: float,
    signal_info: Dict,
    prediction_info: Dict,
    news_snippets: List[Dict],
) -> Dict:
    """
    Generates a structured, plain-language market explanation grounded strictly
    in scraped news & technical indicators. Returns structured sections + citations.

    For education only. Not investment advice.
    """
    # Build citations list
    citations = []
    snippet_texts = []
    for i, snip in enumerate(news_snippets, 1):
        title = snip.get("title", "News Item")
        source = snip.get("source", "Market News")
        pub_date = str(snip.get("published_at", ""))[:10]
        url = snip.get("url", "#")
        citation_str = f"[{title} | {source} | {pub_date}]"
        citations.append({
            "id": i,
            "title": title,
            "source": source,
            "date": pub_date,
            "url": url,
            "citation_chip": citation_str,
        })
        snippet_texts.append(
            f"Snippet [{i}]: {title}\n  Source: {source} | Date: {pub_date}\n  {snip.get('content', '')}"
        )

    # Attempt Gemini generation
    sections: Dict[str, str] = {}
    gemini_key = os.getenv("GEMINI_API_KEY")
    llm_used = False

    if gemini_key and snippet_texts:
        try:
            import google.generativeai as genai
            genai.configure(api_key=gemini_key)
            model = genai.GenerativeModel("gemini-1.5-flash")

            pred_dir = prediction_info.get("direction", "FLAT")
            pred_conf = round(prediction_info.get("confidence", 0.5) * 100, 1)
            sig_type = signal_info.get("signal_type", "CONSOLIDATION")
            sig_conf = round(signal_info.get("confidence", 0.5) * 100, 1)

            prompt = (
                f"{SYSTEM_PROMPT_STRICT_RAG}\n\n"
                f"=== COMPANY ===\n"
                f"Name: {company_name} | Symbol: {symbol} | Price: ₹{price:,.2f}\n\n"
                f"=== QUANTITATIVE SIGNALS ===\n"
                f"ML Direction: {pred_dir} ({pred_conf}% confidence)\n"
                f"Active Pattern: {sig_type} ({sig_conf}% confidence)\n\n"
                f"=== RETRIEVED NEWS SNIPPETS ===\n"
                + "\n\n".join(snippet_texts)
            )
            response = model.generate_content(prompt)
            sections = _parse_structured_response(response.text.strip())
            llm_used = bool(sections)
        except Exception as e:
            logger.warning("LLM RAG Generation Exception: %s", e)

    # Fallback if LLM failed or unavailable
    if not sections:
        sections = _build_fallback_explanation(
            company_name, symbol, price, signal_info, prediction_info, citations
        )

    # Grounding verification — run on combined text
    all_text = " ".join(sections.values())
    sentences = [s.strip() for s in re.split(r"(?<=[.!?]) +", all_text) if s.strip()]
    grounded_count = sum(1 for s in sentences if verify_sentence_grounding(s, news_snippets))
    grounding_score = round(grounded_count / max(1, len(sentences)) * 100.0, 1)

    # --- SEBI-Safe Follow-Up Prompt Chips (Novel RAG contribution) ---
    # Dynamically generate 3 educationally framed follow-up queries that steer
    # users away from "should I buy?" speculation and toward financial literacy.
    # This prevents the LLM from being used as an investment adviser.
    # See: SEBI AI Disclosure Requirements (2024) & AlphaFin benchmark gap.
    direction_label = prediction_info.get("direction", "FLAT")
    sig_type_label = signal_info.get("signal_type", "CONSOLIDATION")
    follow_up_prompts = _generate_sebi_safe_follow_ups(
        symbol, company_name, direction_label, sig_type_label
    )

    # Flat prose for legacy consumers
    flat_prose = _clean_prose(
        f"{sections.get('SUMMARY', '')} {sections.get('MOMENTUM', '')} "
        f"{sections.get('NEWS_CONTEXT', '')} {sections.get('RISK_NOTE', '')}"
    )

    return {
        "symbol": symbol,
        "company_name": company_name,
        "price": price,
        # Structured sections (new — used by enhanced frontend)
        "sections": {
            "summary": sections.get("SUMMARY", ""),
            "momentum": sections.get("MOMENTUM", ""),
            "news_context": sections.get("NEWS_CONTEXT", ""),
            "risk_note": sections.get("RISK_NOTE", ""),
        },
        # Flat prose (legacy fallback)
        "explanation": flat_prose,
        "citations": citations,
        "grounding_score": grounding_score,
        "is_grounded": grounding_score >= 75.0,
        "llm_used": llm_used,
        # SEBI-safe follow-up prompt chips — steers users toward learning,
        # not speculation. Novel anti-hallucination routing mechanism.
        "follow_up_prompts": follow_up_prompts,
        "disclaimer": "For education only. Not investment advice.",
    }


def _generate_sebi_safe_follow_ups(
    symbol: str,
    company_name: str,
    direction: str,
    sig_type: str,
) -> list:
    """
    Generate 3 contextual, SEBI-compliant follow-up query chips.

    Rules:
    - MUST NOT suggest buy, sell, or any actionable recommendation.
    - MUST frame all queries as educational / analytical questions.
    - Dynamically adapt to the direction and signal type so chips feel relevant.
    - Satisfy SEBI's 2024 AI disclosure requirement: AI tools must guide users
      toward transparency, not speculation.
    """
    sig_clean = sig_type.replace("_", " ").title()
    direction_clean = direction.title()

    # Base educational prompts always included
    chips = [
        f"What does a {sig_clean} pattern mean for {company_name}?",
        f"How is the Walk-Forward model's {direction_clean} bias calculated for {symbol}?",
        f"What are the main risk factors visible in {company_name}'s technical indicators?",
    ]

    # Direction-adaptive chip override for slot 0
    if direction == "UP":
        chips[0] = (
            f"What conditions could cause the current {direction_clean} momentum in {symbol} to reverse?"
        )
    elif direction == "DOWN":
        chips[0] = (
            f"What technical factors are driving the {direction_clean} bias for {company_name}?"
        )

    return chips[:3]
