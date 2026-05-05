"""
Redis Cache Configuration
Cấu hình caching cho API responses và database queries
"""
from flask_caching import Cache
from functools import wraps
from flask import request
import hashlib
import json

# Khởi tạo cache
cache = Cache()

def init_cache(app):
    """Initialize cache with app"""
    cache.init_app(app, config={
        'CACHE_TYPE': 'simple',  # Dùng 'redis' khi có Redis server
        # 'CACHE_REDIS_URL': 'redis://localhost:6379/0',
        'CACHE_DEFAULT_TIMEOUT': 300,  # 5 phút
        'CACHE_KEY_PREFIX': 'clothesshop_'
    })
    return cache

def make_cache_key(*args, **kwargs):
    """Tạo cache key từ request parameters"""
    path = request.path
    args_str = str(request.args.to_dict())
    key_str = f"{path}:{args_str}"
    return hashlib.md5(key_str.encode()).hexdigest()

def cached_route(timeout=300):
    """
    Decorator để cache API responses
    Usage:
        @cached_route(timeout=600)
        def get_products():
            ...
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            cache_key = make_cache_key()
            cached_response = cache.get(cache_key)
            
            if cached_response is not None:
                return cached_response
            
            response = f(*args, **kwargs)
            cache.set(cache_key, response, timeout=timeout)
            return response
        
        return decorated_function
    return decorator

def invalidate_product_cache():
    """Xóa cache liên quan đến products khi có update"""
    cache.delete_memoized('get_products_cached')
    cache.delete_memoized('get_best_sellers_cached')
    # Xóa tất cả cache keys có prefix 'products'
    # cache.delete_many(*cache.cache._cache.keys('*products*'))

def invalidate_review_cache(product_id):
    """Xóa cache reviews khi có update"""
    cache_key = f'reviews_product_{product_id}'
    cache.delete(cache_key)
