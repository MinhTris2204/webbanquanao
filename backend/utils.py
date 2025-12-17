# utils.py - Helper functions for VNPay integration
import hmac
import hashlib
from urllib.parse import quote


def hmac_sha512(key: str, data: str) -> str:
    """Generate HMAC SHA512 hash"""
    if not key:
        return ""
    return hmac.new(
        key.encode('utf-8'),
        data.encode('utf-8'),
        hashlib.sha512
    ).hexdigest()


def sort_and_query(params: dict) -> str:
    """Sort params alphabetically and create query string"""
    sorted_params = sorted(params.items())
    return "&".join(
        f"{k}={quote(str(v), safe='')}" 
        for k, v in sorted_params 
        if v is not None and v != ""
    )
