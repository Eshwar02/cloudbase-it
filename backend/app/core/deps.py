from uuid import UUID

from fastapi import Depends, HTTPException, Request, status
from jose import JWTError
from sqlmodel import Session

from app.core.db import get_session
from app.core.security import decode_token
from app.models.tables import User


def get_current_user(
    request: Request, session: Session = Depends(get_session)
) -> User:
    token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated")
    try:
        claims = decode_token(token)
        if claims.get("type") != "access":
            raise JWTError("wrong token type")
    except JWTError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid token")
    user = session.get(User, UUID(claims["sub"]))
    if not user:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User not found")
    return user
