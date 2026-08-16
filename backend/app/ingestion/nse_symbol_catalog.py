import requests
import pandas as pd
import io
from typing import List, Dict
from sqlalchemy.orm import Session
from app.database.models import Stock

# Official NSE Equity URL & Backup Catalog
NSE_EQUITY_CSV_URL = "https://archives.nseindia.com/content/equities/EQUITY_L.csv"

def fetch_all_nse_symbols() -> List[Dict]:
    """
    Fetches the official complete list of all 2000+ NSE listed Indian stocks.
    """
    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
    }

    stocks_list = []

    try:
        response = requests.get(NSE_EQUITY_CSV_URL, headers=headers, timeout=10)
        if response.status_code == 200:
            df = pd.read_csv(io.StringIO(response.text))
            # Column headers in NSE EQUITY_L.csv: SYMBOL, NAME OF COMPANY, SERIES, DATE OF LISTING, PAID UP VALUE, MARKET LOT, ISIN NUMBER, FACE VALUE
            for _, row in df.iterrows():
                symbol_raw = str(row.get("SYMBOL", "")).strip()
                name_raw = str(row.get("NAME OF COMPANY", "")).strip()
                series = str(row.get("SERIES", "")).strip()

                # Filter for main equity series (EQ)
                if symbol_raw and series in ["EQ", "BE", "SM"]:
                    symbol_fmt = f"{symbol_raw}.NS"
                    stocks_list.append({
                        "symbol": symbol_fmt,
                        "name": name_raw or symbol_raw,
                        "exchange": "NSE",
                        "sector": "Equity"
                    })
    except Exception as e:
        print(f"Direct NSE CSV download fallback: {e}")

    # If network download was blocked or empty, fallback to comprehensive 500+ Indian stock catalog
    if not stocks_list:
        print("Using comprehensive Indian Equity symbol generator fallback...")
        stocks_list = get_fallback_comprehensive_catalog()

    return stocks_list

def get_fallback_comprehensive_catalog() -> List[Dict]:
    """Generates comprehensive list of top 500+ Indian equities across all sectors."""
    from app.config import DEFAULT_TICKERS
    base = list(DEFAULT_TICKERS)

    # Additional midcap & smallcap active NSE symbols
    extra_symbols = [
        "ABBOTINDIA", "ACC", "ADANIGREEN", "ADANIPOWER", "ADANITRANS", "ABCAPITAL", "ABFRL", "AIAENG",
        "APLLTD", "ALKEM", "ALOKINDS", "AMBUJACEM", "ANGELONE", "APARINDS", "APOLLOTYRE", "ASHOKLEY",
        "ASTRAL", "ATUL", "AUROPHARMA", "AVANTIFEED", "BALKRISIND", "BALRAMCHIN", "BANDHANBNK", "BATAINDIA",
        "BERGEPAINT", "BHARATFORG", "BHEL", "BIOCON", "BIRLACORPN", "BLSTARCO", "BLUESTARCO", "BOSCHLTD",
        "CESC", "CGPOWER", "CANFINHOME", "CAPLIPOINT", "CASTROLIND", "CENTRALBK", "CENTURYTEX", "CERA",
        "CHAMBLFERT", "CHEMCON", "COCHINSHIP", "CONCOR", "COROMANDEL", "CROMPTON", "CUMMINSIND", "CYIENT",
        "DCMSHRIRAM", "DEEPAKNTR", "DELHIVERY", "DEVYANI", "DIXON", "LALPATHLAB", "ECLERX", "EDELWEISS",
        "EMAMILTD", "ENDURANCE", "ENGINERSIN", "EQUITASBNK", "EXIDEIND", "FSL", "FACT", "FACT",
        "FINCABLES", "FINEORG", "FINPIPE", "FLUOROCHEM", "FORTIS", "GMRINFRA", "GLENMARK", "GODREJIND",
        "GODREJPROP", "GRANULES", "GREATEAST", "GNFC", "GUJGASLTD", "GSPL", "HEG", "HAPPSTMNDS",
        "HATHWAY", "HDFCAMC", "HEMIPROP", "HFCL", "HINDCOPPER", "HINDPETRO", "HINDZINC", "HOMEFIRST",
        "HONAUT", "HUDCO", "IDBI", "INDIAMART", "INDIANB", "IEX", "INDHOTEL", "INDIACEM",
        "INDIAGLYCO", "IPCALAB", "JBCHEPHARM", "JKCEMENT", "JKLAKSHMI", "JKTYRE", "JSL", "JSWENERGY",
        "JSWINFRA", "JUBLFOOD", "JUBLPHARMA", "JUSTDIAL", "JYOTHYLAB", "KEC", "KEI", "KPRMILL",
        "KALYANKJWR", "KOTAKBANK", "KPITTECH", "KRBL", "KSB", "KAJARIACER", "KALPATPOWR", "KANSAINER",
        "KARURVYSYA", "KEC", "KIRLOSENG", "KEC", "LICHSGFIN", "LTIM", "LTTS", "LAURUSLABS",
        "LEMONTREE", "LINDEINDIA", "LUPIN", "LUXIND", "MMTC", "MOIL", "MRPL", "MTARTECH",
        "MAGADSUGAR", "MAHABANK", "MAHLIFE", "MAHLOG", "MANAPPURAM", "MAPMYINDIA", "MARICO", "MASTEK",
        "MAXHEALTH", "MAZDOCK", "MEDPLUS", "METROPOLIS", "MINDACORP", "MSUMI", "NLCINDIA", "NMDC",
        "NSLNISP", "NATIONALUM", "NAVINFLUOR", "NAZARA", "NEWGEN", "NAM-INDIA", "NIPPON", "NUVAMA",
        "OBEROIRLTY", "ONGC", "OIL", "OLECTRA", "PAYTM", "PIIND", "PNB", "PNCINFRA",
        "PVRINOX", "PAGEIND", "PATANJALI", "PERSISTENT", "PETRONET", "PHOENIXLTD", "POLYCAB", "POLYMED",
        "POONAWALLA", "POWERGRID", "PRAJIND", "PRESTIGE", "PRINCEPIPE", "RAIN", "RAJESHEXPO", "RBLBANK",
        "RITES", "RCF", "RECLTD", "RHIM", "RPOWER", "RADICO", "RVNL", "RAILTEL",
        "RATNAMANI", "RAYMOND", "REDINGTON", "RELAXO", "ROSSARI", "ROUTE", "SBICARD", "SBILIFE",
        "SJVN", "SKFINDIA", "SRF", "SAFARI", "MOTHERSON", "SANGHIIND", "SAPPHIRE", "SAREGAMA",
        "SCHAEFFLER", "SHARDACROP", "SHOPERSTOP", "SHREECEM", "SHRIRAMFIN", "SOBHA", "SOLARINDS", "SONACOMS",
        "SONATSOFTW", "STARHEALTH", "SUMICHEM", "SUNDARMFIN", "SUNDRMFAST", "SUNTV", "SUPREMEIND", "SUZLON",
        "SYNGENE", "TATACHEM", "TATACOMM", "TATAELXSI", "TATAGEVAL", "TATAGLOBAL", "TATAMTRDVR", "TATAPOWER",
        "TATATECH", "TTML", "TEAMLEASE", "THERMAX", "THYROCARE", "TIINDIA", "TIMKEN", "TORNTPOWER",
        "TRIDENT", "TRIVENI", "TRITURBINE", "TI", "UCOBANK", "UNOMINDA", "UPL", "UTIAMC",
        "UJJIVANSFB", "UNIONBANK", "UBL", "MCDOWELL-N", "VGUARD", "VIPIND", "VAIBHAVGBL", "VAKRANGEE",
        "VARDMNPOLY", "VARUN", "VENKEYS", "VIJAYA", "VINATIORG", "VOLTAS", "WELCORP", "WELSPUNLIV",
        "WESTLIFE", "WHIRLPOOL", "WILLAMAGOR", "YESBANK", "ZEEL", "ZENSARTECH", "ZOMATO"
    ]

    for sym in extra_symbols:
        clean = sym.strip().upper()
        if not any(b["symbol"] == f"{clean}.NS" for b in base):
            base.append({
                "symbol": f"{clean}.NS",
                "name": clean,
                "exchange": "NSE",
                "sector": "Equity"
            })

    return base

def seed_all_nse_stocks_into_db(db: Session) -> int:
    """
    Seeds all 2000+ NSE listed Indian stocks into the SQLite Stock table.
    """
    all_stocks = fetch_all_nse_symbols()
    added_count = 0

    for item in all_stocks:
        existing = db.query(Stock).filter(Stock.symbol == item["symbol"]).first()
        if not existing:
            stock = Stock(
                symbol=item["symbol"],
                name=item["name"],
                exchange=item["exchange"],
                sector=item["sector"]
            )
            db.add(stock)
            added_count += 1

    db.commit()
    print(f" Seeded {added_count} new Indian stock symbols into SQLite database.")
    return len(all_stocks)
