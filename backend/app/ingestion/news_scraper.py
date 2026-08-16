import feedparser
import urllib.parse
import re
from datetime import datetime
from typing import List, Dict
from bs4 import BeautifulSoup
import hashlib


def clean_html(raw_html: str) -> str:
    """Strip HTML tags from text."""
    if not raw_html:
        return ""
    soup = BeautifulSoup(raw_html, "html.parser")
    return soup.get_text(separator=" ", strip=True)


def _make_visitable_url(rss_url: str) -> str:
    """
    Convert a Google News RSS redirect URL into a directly visitable web URL.

    RSS format:  https://news.google.com/rss/articles/<id>
    Web format:  https://news.google.com/articles/<id>

    The web format opens correctly in any browser.
    """
    if not rss_url or rss_url == "#":
        return rss_url
    # Convert RSS article URL to web article URL
    visitable = rss_url.replace(
        "https://news.google.com/rss/articles/",
        "https://news.google.com/articles/"
    )
    return visitable


def fetch_ticker_news_rss(symbol: str, company_name: str = "") -> List[Dict]:
    """
    Fetch news for a stock symbol via Google News RSS.
    Converts Google News RSS redirect URLs to directly visitable web URLs.
    Respects RSS feed guidelines & robots.txt.
    """
    query_term = company_name if company_name else symbol.replace(".NS", "").replace(".BO", "")
    encoded_query = urllib.parse.quote(f"{query_term} stock")
    rss_url = f"https://news.google.com/rss/search?q={encoded_query}&hl=en-IN&gl=IN&ceid=IN:en"

    feed = feedparser.parse(rss_url)
    articles = []

    for entry in feed.entries[:12]:
        pub_date = None
        if hasattr(entry, "published_parsed") and entry.published_parsed:
            pub_date = datetime(*entry.published_parsed[:6])
        else:
            pub_date = datetime.utcnow()

        summary_text = clean_html(entry.get("summary", ""))
        raw_title = clean_html(entry.get("title", ""))

        # Strip " - Publisher Name" suffix Google appends to RSS titles
        title = re.sub(r"\s*[-–]\s*[^-–]{2,50}$", "", raw_title).strip() or raw_title

        raw_link = entry.get("link", "#")
        # Convert to a directly visitable Google News web URL
        visitable_url = _make_visitable_url(raw_link)

        source_name = entry.get("source", {}).get("title", "Financial News")

        articles.append({
            "ticker": symbol,
            "title": title,
            "summary": summary_text or title,
            "source": source_name,
            "url": visitable_url,
            "published_at": pub_date.isoformat(),
            "id": f"{symbol}_{entry.get('id') or hashlib.md5(title.encode('utf-8', errors='replace')).hexdigest()}",
        })

    return articles
