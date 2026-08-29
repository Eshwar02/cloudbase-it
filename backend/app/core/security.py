from datetime import datetime, timedelta, timezone

from jose import jwt
from passlib.context import CryptContext

from app.core.config import get_settings

_pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")
_ALGO = "HS256"


def hash_password(pw: str) -> str:
    return _pwd.hash(pw)


def verify_password(pw: str, hashed: str) -> bool:
    return _pwd.verify(pw, hashed)


def _make_token(sub: str, token_type: str, expires: timedelta) -> str:
    s = get_settings()
    now = datetime.now(timezone.utc)
    payload = {"sub": sub, "type": token_type, "iat": now, "exp": now + expires}
    return jwt.encode(payload, s.jwt_secret, algorithm=_ALGO)


def create_access_token(sub: str) -> str:
    s = get_settings()
    return _make_token(sub, "access", timedelta(minutes=s.jwt_access_ttl_min))


def create_refresh_token(sub: str) -> str:
    s = get_settings()
    return _make_token(sub, "refresh", timedelta(days=s.jwt_refresh_ttl_days))


def decode_token(token: str) -> dict:
    return jwt.decode(token, get_settings().jwt_secret, algorithms=[_ALGO])
