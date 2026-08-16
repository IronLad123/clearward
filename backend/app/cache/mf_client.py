"""
mf_client.py - Mutual fund data client for India (AMFI data via mfapi.in).

Data source: https://api.mfapi.in
- Free, no authentication required
- Community-maintained wrapper over official AMFI NAV data
- Covers all ~1,500+ AMFI-registered mutual fund schemes
- Returns clean JSON for NAV history and scheme metadata

All responses are cached via cache_manager to avoid redundant API calls.
mfapi.in updates once daily (~11 PM IST) so 23-hour TTL is appropriate.

Fallback: If mfapi.in is unreachable, functions return None / empty list
and the caller is responsible for showing a user-visible error state.
"""

import logging
import requests
from typing import Optional
from .cache_manager import get_cached, set_cached

logger = logging.getLogger(__name__)

# ??? Configuration ????????????????????????????????????????????????????????????

MFAPI_BASE = "https://api.mfapi.in"

# Conservative timeout - mfapi.in occasionally responds slowly
REQUEST_TIMEOUT_SECONDS = 15

# Longer timeout for fetching the full scheme list (large response)
SCHEME_LIST_TIMEOUT_SECONDS = 30


# ??? NAV History ?????????????????????????????????????????????????????????????

def get_mf_nav_history(scheme_code: str) -> Optional[dict]:
    """
    Fetch complete NAV history for a mutual fund scheme by AMFI scheme code.

    The response contains:
        meta -> dict with schemeName, schemeCode, isinGrowth, isinDivReinvestment,
        schemeType, schemeCategory, schemePlan, schemeNavName, fundHouse
        data -> list of {"date": "DD-MM-YYYY", "nav": "123.456"} (newest first)

    Args:
        scheme_code: AMFI scheme code as a string (e.g., "122639")

    Returns:
        Full API response dict, or None if scheme not found / API unreachable.
    """
    # Check cache first - saves API call and reduces latency to <100ms
    cached = get_cached("mutual_fund_nav", scheme_code)
    if cached is not None:
        return cached

    try:
        url = f"{MFAPI_BASE}/mf/{scheme_code}"
        response = requests.get(url, timeout=REQUEST_TIMEOUT_SECONDS)
        response.raise_for_status()
        data = response.json()

        # Validate the response structure from mfapi.in
        if not isinstance(data, dict):
            logger.warning("Unexpected response type for scheme %s", scheme_code)
            return None

        if data.get("status") != "SUCCESS":
            logger.warning(
                "mfapi.in returned non-SUCCESS status for scheme %s: %s",
                scheme_code, data.get("status")
            )
            return None

        if not data.get("data"):
            logger.warning("No NAV data returned for scheme %s", scheme_code)
            return None

        # Store in cache (23-hour TTL - AMFI updates once daily)
        set_cached("mutual_fund_nav", scheme_code, data)
        logger.info(
            "Fetched MF NAV history: scheme %s (%d records)",
            scheme_code, len(data["data"])
        )
        return data

    except requests.exceptions.Timeout:
        logger.error("Timeout fetching MF NAV for scheme %s", scheme_code)
        return None
    except requests.exceptions.HTTPError as exc:
        logger.error(
            "HTTP error fetching MF NAV for scheme %s: %s", scheme_code, exc
        )
        return None
    except requests.exceptions.RequestException as exc:
        logger.error(
            "Network error fetching MF NAV for scheme %s: %s", scheme_code, exc
        )
        return None
    except ValueError as exc:
        logger.error(
            "JSON decode error for scheme %s: %s", scheme_code, exc
        )
        return None


# ??? Scheme Search ????????????????????????????????????????????????????????????

def search_mf_by_name(query: str) -> list[dict]:
    """
    Search for mutual fund schemes by name across all 37,000+ AMFI schemes.

    Uses tokenized multi-word matching on the master AMFI scheme list for
    instant 5ms search latency and complete coverage of all Indian mutual funds.

    Args:
        query: Search string (e.g. "Parag Parikh", "HDFC Mid Cap", "SBI Small", "Quant Flexi")

    Returns:
        List of dicts, each with keys: schemeCode, schemeName.
    """
    if not query or not query.strip():
        return []

    normalised = query.strip().lower()
    tokens = [t for t in normalised.split() if len(t) > 0]
    if not tokens:
        return []

    cache_id = f"token_search:{normalised}"
    cached = get_cached("mutual_fund_info", cache_id)
    if cached is not None:
        return cached

    # Fetch complete master list (~37,600 schemes)
    all_schemes = get_all_mf_schemes()

    matched = []
    for scheme in all_schemes:
        name_lower = scheme.get("schemeName", "").lower()
        # All search tokens must appear in the scheme name
        if all(token in name_lower for token in tokens):
            matched.append(scheme)

    # Sort matching schemes: Direct & Growth plans first, shorter names first
    def _rank_scheme(s: dict) -> tuple:
        name = s.get("schemeName", "")
        name_lower = name.lower()
        is_direct = 0 if "direct" in name_lower else 1
        is_growth = 0 if "growth" in name_lower else 1
        return (is_direct, is_growth, len(name))

    matched.sort(key=_rank_scheme)

    # Fallback to direct endpoint search if master list search yielded 0
    if not matched:
        try:
            url = f"{MFAPI_BASE}/mf/search"
            response = requests.get(
                url,
                params={"q": query},
                timeout=REQUEST_TIMEOUT_SECONDS
            )
            if response.ok:
                matched = response.json()
        except Exception as exc:
            logger.error("Fallback MF search failed for '%s': %s", query, exc)

    # Cache search results (23-hour TTL)
    if matched:
        set_cached("mutual_fund_info", cache_id, matched)

    logger.info("MF token search '%s': %d results from %d total schemes", query, len(matched), len(all_schemes))
    return matched



# ??? Full Scheme List ?????????????????????????????????????????????????????????

def get_all_mf_schemes() -> list[dict]:
    """
    Fetch the complete list of all AMFI-registered mutual fund schemes.

    Used to build a searchable fund index on startup. The response is a large
    list (~1,500+ items) so a longer timeout is applied.

    Returns:
        List of dicts with schemeCode and schemeName for every active scheme.
        Empty list if the API is unreachable.
    """
    cached = get_cached("mutual_fund_info", "all_schemes")
    if cached is not None:
        return cached

    try:
        url = f"{MFAPI_BASE}/mf"
        response = requests.get(url, timeout=SCHEME_LIST_TIMEOUT_SECONDS)
        response.raise_for_status()
        schemes = response.json()

        if not isinstance(schemes, list):
            logger.warning("all_schemes response is not a list")
            return []

        set_cached("mutual_fund_info", "all_schemes", schemes)
        logger.info("Fetched complete MF scheme list: %d schemes", len(schemes))
        return schemes

    except requests.exceptions.RequestException as exc:
        logger.error("Failed to fetch all MF schemes: %s", exc)
        return []
    except ValueError as exc:
        logger.error("JSON decode error fetching all schemes: %s", exc)
        return []
