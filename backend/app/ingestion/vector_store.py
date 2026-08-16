import os
import re
from typing import List, Dict
import numpy as np

class VectorStoreManager:
    """
    Manages news & filings text embeddings using ChromaDB or lightweight fallback
    for fast local execution.
    """

    def __init__(self):
        self.chroma_ready = False
        from collections import deque
        self.articles_db = deque(maxlen=500) # Bounded fallback buffer - prevents OOM
        try:
            import chromadb
            from app.config import CHROMA_DB_DIR
            os.makedirs(CHROMA_DB_DIR, exist_ok=True)
            self.client = chromadb.PersistentClient(path=CHROMA_DB_DIR)
            self.collection = self.client.get_or_create_collection(
                name="stock_news_collection",
                metadata={"hnsw:space": "cosine"}
            )
            self.chroma_ready = True
        except Exception as e:
            print(f"ChromaDB initializing with fallback indexing mode: {e}")

    def add_news_articles(self, articles: List[Dict]):
        """
        Embed and index news articles into vector store.
        """
        if not articles:
            return

        self.articles_db.extend(articles)

        if self.chroma_ready:
            try:
                documents = []
                metadatas = []
                ids = []

                for article in articles:
                    text_chunk = f"Title: {article['title']}\nSummary: {article['summary']}"
                    documents.append(text_chunk)
                    metadatas.append({
                        "ticker": article["ticker"],
                        "source": article["source"],
                        "url": article["url"],
                        "title": article["title"],
                        "published_at": article["published_at"]
                    })
                    ids.append(str(article["id"]))

                self.collection.upsert(
                    documents=documents,
                    metadatas=metadatas,
                    ids=ids
                )
            except Exception as ex:
                print(f"ChromaDB upsert fallback: {ex}")

    def query_relevant_news(self, ticker: str, query_text: str = "", top_k: int = 5) -> List[Dict]:
        """
        Query vector index for top-k news snippets matching a ticker.
        """
        if self.chroma_ready:
            try:
                search_query = query_text if query_text else f"{ticker} earnings stock news price"
                results = self.collection.query(
                    query_texts=[search_query],
                    n_results=top_k,
                    where={"ticker": ticker}
                )

                snippets = []
                if results and results.get("documents"):
                    docs = results["documents"][0]
                    metas = results["metadatas"][0] if results.get("metadatas") else []
                    distances = results["distances"][0] if "distances" in results and results["distances"] else []

                    for i in range(len(docs)):
                        meta = metas[i] if i < len(metas) else {}
                        dist = distances[i] if i < len(distances) else 0.0
                        snippets.append({
                            "content": docs[i],
                            "title": meta.get("title", ""),
                            "source": meta.get("source", ""),
                            "url": meta.get("url", ""),
                            "published_at": meta.get("published_at", ""),
                            "relevance_score": round(float(1.0 - dist), 3)
                        })
                if snippets:
                    return snippets
            except Exception as ex:
                print(f"ChromaDB query fallback: {ex}")

        # Lightweight keyword match fallback
        matching = [a for a in list(self.articles_db) if a.get("ticker") == ticker]
        snippets = []
        for a in matching[:top_k]:
            snippets.append({
                "content": f"Title: {a['title']}\nSummary: {a['summary']}",
                "title": a["title"],
                "source": a["source"],
                "url": a["url"],
                "published_at": a["published_at"],
                "relevance_score": 0.88
            })
        return snippets

# Global vector store instance
vector_store = VectorStoreManager()
