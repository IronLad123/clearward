from typing import List, Dict
from app.ingestion.vector_store import vector_store
from app.ingestion.news_scraper import fetch_ticker_news_rss

def retrieve_grounded_news_snippets(symbol: str, company_name: str='', top_k: int=4) -> List[Dict]:
    """
    Fetches fresh RSS news, indexes them into vector store, and retrieves
    the top-k relevant news snippets for RAG explanation generation.
    """
    articles = fetch_ticker_news_rss(symbol, company_name)
    if articles:
        vector_store.add_news_articles(articles)
        query_text = f'{company_name or symbol} stock price earnings revenue market guidance quarter performance'
        snippets = vector_store.query_relevant_news(symbol, query_text=query_text, top_k=top_k)
        return snippets
