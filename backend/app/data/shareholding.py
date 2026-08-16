"""
app/data/shareholding.py
Fetches real promoter/FII/DII/Public shareholding data for NSE stocks.
Sources: NSE India API (SEBI filing data) → yfinance fallback.
For education only. Not investment advice.
"""
import logging, time, requests, yfinance as yf
from datetime import date

logger = logging.getLogger(__name__)

NSE_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://www.nseindia.com/",
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-origin",
}
NSE_BASE = "https://www.nseindia.com"

def _get_nse_session():
    session = requests.Session()
    session.headers.update(NSE_HEADERS)
    try:
        session.get(NSE_BASE, timeout=10)
        time.sleep(0.5)
        session.get(f"{NSE_BASE}/api/market-status", timeout=8)
        time.sleep(0.3)
    except Exception as e:
        logger.warning("NSE session warmup: %s", e)
    return session

def _strip_ns(symbol):
    return symbol.upper().replace(".NS","").replace(".BO","")

def _pct(val):
    try:
        return round(float(str(val).replace(",","").replace("%","")), 2)
    except Exception:
        return None

def fetch_shareholding_nse(symbol):
    session = _get_nse_session()
    try:
        url = f"{NSE_BASE}/api/shareholding-patterns?symbol={_strip_ns(symbol)}&series=EQ"
        resp = session.get(url, timeout=12)
        if resp.status_code != 200:
            return None
        data = resp.json()
        records = data if isinstance(data, list) else data.get("data", [])
        if not records:
            return None
        latest = records[0]
        prev   = records[1] if len(records) > 1 else None
        promoter = _pct(latest.get("promoter") or latest.get("promoterAndPromoterGroup"))
        fii      = _pct(latest.get("fii") or latest.get("foreignInstitutional"))
        dii      = _pct(latest.get("dii") or latest.get("domesticInstitutional") or latest.get("mutualFunds"))
        public   = _pct(latest.get("public") or latest.get("publicShareholding"))
        others   = _pct(latest.get("others") or latest.get("otherInstitutions"))
        pledged  = _pct(latest.get("pledgedPercent") or latest.get("pledged") or latest.get("promoterPledgedPercent"))
        quarter  = latest.get("date") or latest.get("quarter") or str(date.today())
        prom_chg = fii_chg = None
        if prev:
            pp = _pct(prev.get("promoter") or prev.get("promoterAndPromoterGroup"))
            pf = _pct(prev.get("fii") or prev.get("foreignInstitutional"))
            if promoter is not None and pp is not None:
                prom_chg = round(promoter - pp, 2)
            if fii is not None and pf is not None:
                fii_chg = round(fii - pf, 2)
        return {
            "promoters": promoter, "fii": fii, "dii": dii, "public": public,
            "others": others, "promoter_pledged_pct": pledged,
            "promoter_change_qoq": prom_chg, "fii_change_qoq": fii_chg,
            "as_of_date": str(quarter), "quarter": str(quarter),
            "source": "NSE-SEBI Filing", "is_estimated": False,
        }
    except Exception as e:
        logger.warning("NSE shareholding failed for %s: %s", symbol, e)
        return None

def fetch_shareholding_yfinance(symbol):
    try:
        info = yf.Ticker(symbol).info or {}
        insider = info.get("heldPercentInsiders")
        inst    = info.get("heldPercentInstitutions")
        shares  = info.get("sharesOutstanding")
        flt     = info.get("floatShares")
        prom    = round(insider * 100, 2) if insider else None
        inst_v  = round(inst * 100, 2)    if inst    else None
        fii     = round(inst_v * 0.60, 2) if inst_v else None
        dii     = round(inst_v * 0.40, 2) if inst_v else None
        known   = (prom or 0) + (inst_v or 0)
        public  = round(max(0, 100 - known), 2)
        float_r = round(flt / shares * 100, 2) if shares and flt and shares > 0 else None
        return {
            "promoters": prom, "fii": fii, "dii": dii, "public": public, "others": None,
            "promoter_pledged_pct": None, "promoter_change_qoq": None, "fii_change_qoq": None,
            "float_ratio": float_r, "shares_outstanding": shares,
            "as_of_date": str(date.today()), "quarter": "Latest (estimated)",
            "source": "yfinance (estimated — insider + institutional %)",
            "is_estimated": True,
        }
    except Exception as e:
        logger.warning("yfinance shareholding failed for %s: %s", symbol, e)
        return {"promoters": None, "fii": None, "dii": None, "public": None,
                "others": None, "promoter_pledged_pct": None,
                "promoter_change_qoq": None, "fii_change_qoq": None,
                "as_of_date": None, "quarter": None, "source": "unavailable", "is_estimated": True}

def get_shareholding(symbol):
    """Main entry — NSE first, yfinance fallback. Never raises. For education only."""
    nse = fetch_shareholding_nse(symbol)
    if nse and nse.get("promoters") is not None:
        return nse
    return fetch_shareholding_yfinance(symbol)
