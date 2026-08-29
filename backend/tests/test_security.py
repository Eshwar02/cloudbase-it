import pytest
from jose import JWTError

from app.core.security import (
    create_access_token,
    decode_token,
    hash_password,
    verify_password,
)


def test_password_roundtrip():
    h = hash_password("hunter2")
    assert h != "hunter2"
    assert verify_password("hunter2", h)
    assert not verify_password("wrong", h)


def test_access_token_roundtrip():
    tok = create_access_token("user-123")
    claims = decode_token(tok)
    assert claims["sub"] == "user-123"
    assert claims["type"] == "access"


def test_decode_rejects_garbage():
    with pytest.raises(JWTError):
        decode_token("not.a.token")
