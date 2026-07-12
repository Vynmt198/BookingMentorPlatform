"""
cache.py — File-based JSON cache cho CV/JD analysis.

Cache key = SHA256(normalized text inputs).
Lưu vào .cache/<key>.json, TTL 7 ngày.
Không cần Redis hay DB — đủ dùng cho workload 100 analyses/ngày.
"""

from __future__ import annotations
import hashlib
import json
import time
from pathlib import Path


def md5_of_bytes(data: bytes) -> str:
    """MD5 hash của file bytes — dùng làm cache key cho CV/JD file."""
    return hashlib.md5(data).hexdigest()

_CACHE_DIR = Path(__file__).parent / ".cache"
_TTL_SECONDS = 7 * 24 * 3600  # 7 ngày


def _key(*parts: str) -> str:
    combined = "\x00".join(p or "" for p in parts)
    return hashlib.sha256(combined.encode()).hexdigest()


def _path(key: str) -> Path:
    _CACHE_DIR.mkdir(exist_ok=True)
    return _CACHE_DIR / f"{key}.json"


def get(*parts: str) -> dict | None:
    """Trả về cached dict hoặc None nếu miss / hết hạn."""
    p = _path(_key(*parts))
    if not p.exists():
        return None
    try:
        data = json.loads(p.read_text(encoding="utf-8"))
        if time.time() - data.get("_cached_at", 0) > _TTL_SECONDS:
            p.unlink(missing_ok=True)
            return None
        return data.get("payload")
    except Exception:
        return None


def set(payload: dict, *parts: str) -> None:
    """Lưu payload vào cache."""
    p = _path(_key(*parts))
    try:
        p.write_text(
            json.dumps({"_cached_at": time.time(), "payload": payload}, ensure_ascii=False),
            encoding="utf-8",
        )
    except Exception:
        pass


def invalidate(*parts: str) -> None:
    """Xoá 1 cache entry."""
    _path(_key(*parts)).unlink(missing_ok=True)
