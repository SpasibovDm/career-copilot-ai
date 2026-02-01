from __future__ import annotations

from fastapi import HTTPException, Request
from redis import Redis

from app.core.config import get_settings

settings = get_settings()


def rate_limit_public(request: Request) -> None:
    redis_conn = Redis.from_url(settings.redis_url)
    identifier = request.client.host if request.client else "unknown"
    key = f"rate_limit:public:{identifier}"
    count = redis_conn.incr(key)
    if count == 1:
        redis_conn.expire(key, 60)
    if count > settings.public_rate_limit_per_minute:
        raise HTTPException(status_code=429, detail="Rate limit exceeded")
