"""Request-scoped authentication and authorisation.

Every protected route depends on one of these. The proxy/redirect layer in the client is
cosmetic — authorisation happens here, on the server, every time.
"""
from __future__ import annotations

from fastapi import Depends, HTTPException, Request, Response

from . import security, store
from .store import User

COOKIE = "lattice_session"


def set_session_cookie(response: Response, user_id: str) -> None:
    response.set_cookie(
        COOKIE,
        security.issue_token(user_id),
        max_age=security.SESSION_TTL,
        httponly=True,
        samesite="lax",
        # Secure is set by the deployment, not here: forcing it on would break http://localhost.
        secure=False,
        path="/",
    )


def clear_session_cookie(response: Response) -> None:
    response.delete_cookie(COOKIE, path="/")


def optional_user(request: Request) -> User | None:
    """The signed-in user, or None. Used by routes that also serve anonymous visitors."""
    token = request.cookies.get(COOKIE)
    if not token:
        return None
    user_id = security.read_token(token)
    return store.user_by_id(user_id) if user_id else None


def current_user(user: User | None = Depends(optional_user)) -> User:
    if user is None:
        raise HTTPException(status_code=401, detail="Sign in to continue.")
    return user


def teacher(user: User = Depends(current_user)) -> User:
    if not user.is_teacher:
        raise HTTPException(status_code=403, detail="That is a teacher action.")
    return user


def admin(user: User = Depends(current_user)) -> User:
    if not user.is_admin:
        raise HTTPException(status_code=403, detail="That is an administrator action.")
    if not user.school_id:
        raise HTTPException(status_code=403, detail="This account is not attached to a school.")
    return user
