from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from jose import JWTError
from sqlmodel import Session, select

from app.core.config import get_settings
from app.core.db import get_session
from app.core.deps import get_current_user
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.core.ratelimit import limiter
from app.models.tables import User
from app.schemas.auth import LoginIn, RegisterIn, UserOut

# Precomputed dummy hash for timing equalization in login
_DUMMY_PASSWORD_HASH = hash_password("dummy-password-for-timing-equalization")

router = APIRouter(prefix="/auth", tags=["auth"])


def _set_auth_cookies(resp: Response, user_id: str) -> None:
    s = get_settings()
    resp.set_cookie(
        "access_token", create_access_token(user_id), httponly=True,
        samesite="lax", max_age=s.jwt_access_ttl_min * 60, path="/",
    )
    resp.set_cookie(
        "refresh_token", create_refresh_token(user_id), httponly=True,
        samesite="lax", max_age=s.jwt_refresh_ttl_days * 86400, path="/",
    )


@router.post("/register", response_model=UserOut, status_code=201)
@limiter.limit("20/minute")
def register(request: Request, body: RegisterIn,
             session: Session = Depends(get_session)):
    exists = session.exec(select(User).where(User.email == body.email)).first()
    if exists:
        raise HTTPException(status.HTTP_409_CONFLICT, "Email already registered")
    user = User(
        email=body.email,
        password_hash=hash_password(body.password),
        display_name=body.display_name,
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


@router.post("/login", response_model=UserOut)
@limiter.limit("20/minute")
def login(request: Request, body: LoginIn, response: Response,
          session: Session = Depends(get_session)):
    user = session.exec(select(User).where(User.email == body.email)).first()
    target_hash = user.password_hash if user else _DUMMY_PASSWORD_HASH
    password_ok = verify_password(body.password, target_hash)
    if not user or not password_ok:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid credentials")
    _set_auth_cookies(response, str(user.id))
    return user


@router.post("/refresh")
def refresh(request: Request, response: Response):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "No refresh token")
    try:
        claims = decode_token(token)
        if claims.get("type") != "refresh":
            raise JWTError("wrong token type")
    except JWTError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid refresh token")
    _set_auth_cookies(response, claims["sub"])
    return {"status": "refreshed"}


@router.post("/logout")
def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    return {"status": "logged out"}


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return user
