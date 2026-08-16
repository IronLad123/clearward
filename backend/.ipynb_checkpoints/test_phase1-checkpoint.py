import sys
from pathlib import Path
sys.path.append(str(Path(__file__).resolve().parent))
from app.database.db import init_db, SessionLocal
from app.ingestion.price_ingestion import seed_default_stocks, fetch_and_store_price_history, get_price_history_dataframe
from app.ingestion.news_scraper import fetch_ticker_news_rss
from app.ingestion.vector_store import vector_store

def run_phase1_test():
    print('=' * 60)
    print('RUNNING PHASE 1 TEST: DATA INGESTION & STORAGE')
    print('=' * 60)
    init_db()
    db = SessionLocal()
    seed_default_stocks(db)
    print(' SQLite Database initialized and seeded with default stocks.')
    test_ticker = 'RELIANCE.NS'
    print(f'\nFetching price history for {test_ticker}...')
    records_count = fetch_and_store_price_history(test_ticker, db, period='6mo')
    print(f' Stored/Updated {records_count} price history records for {test_ticker}.')
    df = get_price_history_dataframe(test_ticker, db)
    print(f' Retrieved DataFrame from SQLite: {len(df)} rows.')
    print(df.tail(3))
    print(f'\nFetching news & announcements for {test_ticker}...')
    articles = fetch_ticker_news_rss(test_ticker, company_name='Reliance Industries')
    print(f' Scraped {len(articles)} news items.')
    for art in articles[:2]:
        print(f" - [{art['source']}] {art['title']}")
        print(f'\nIndexing news articles into ChromaDB Vector Store...')
        vector_store.add_news_articles(articles)
        print(' Articles indexed into ChromaDB.')
        print(f'\nQuerying top relevant news snippets from Vector Store...')
        snippets = vector_store.query_relevant_news(test_ticker, query_text='quarterly profits revenue earnings growth', top_k=2)
        print(f' Retrieved {len(snippets)} vector snippets.')
        for snip in snippets:
            print(f" - Score: {snip['relevance_score']:.3f} | Title: {snip['title']}")
            db.close()
            print('\n' + '=' * 60)
            print('PHASE 1 VERIFICATION COMPLETED SUCCESSFULLY!')
            print('=' * 60)
            if __name__ == '__main__':
                run_phase1_test()
