from datetime import datetime, timedelta
from typing import Optional

from jose import jwt
from passlib.context import CryptContext

from app.config import get_settings


settings = get_settings()
password_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return password_context.hash(password)


def verify_password(password: str, hashed_password: str) -> bool:
    return password_context.verify(password, hashed_password)


def create_token(subject: str, expires_delta: timedelta, token_type: str) -> str:
    payload = {
        "sub": subject,
        "type": token_type,
        "exp": datetime.utcnow() + expires_delta,
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def create_access_token(subject: str) -> str:
    return create_token(
        subject,
        timedelta(minutes=settings.access_token_expire_minutes),
        "access",
    )


def create_refresh_token(subject: str) -> str:
    return create_token(
        subject,
        timedelta(minutes=settings.refresh_token_expire_minutes),
        "refresh",
    )


def decode_token(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except Exception:
        return None
