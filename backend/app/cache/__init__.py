"""
cache — SQLite TTL & LRU cache module for external API responses.

Public API:
from app.cache import get_cached, set_cached, invalidate_cached
from app.cache import invalidate_category, purge_expired, get_cache_stats
from app.cache import evict_least_recently_used_stocks, get_recently_peeked_stocks
from app.cache.mf_client import get_mf_nav_history, search_mf_by_name
"""
from .cache_manager import get_cached, set_cached, invalidate_cached, invalidate_category, purge_expired, get_cache_stats, evict_least_recently_used_stocks, get_recently_peeked_stocks, CACHE_TTL
__all__ = ['get_cached', 'set_cached', 'invalidate_cached', 'invalidate_category', 'purge_expired', 'get_cache_stats', 'evict_least_recently_used_stocks', 'get_recently_peeked_stocks', 'CACHE_TTL']
