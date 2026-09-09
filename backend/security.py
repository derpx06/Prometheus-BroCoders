"""Passwords and session tokens, standard library only.

No bcrypt, no jose. `hashlib.scrypt` is memory-hard and ships with Python; HMAC-SHA256
over a compact payload gives us a signed session token without a JWT dependency.

The rule this module exists to enforce: a password is hashed the moment it arrives and is
never stored, logged, or returned in any form. Teacher onboarding goes through single-use
invitation tokens (hashed at rest) rather than a temporary password someone can read.
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import secrets
import time

# scrypt at these parameters is ~100ms and ~16 MB per hash on a laptop: slow enough to make
# offline cracking expensive, fast enough for an interactive login.
_N, _R, _P, _DKLEN = 2**14, 8, 1, 32
SESSION_TTL = 7 * 24 * 3600

_DEV_SECRET = "lattice-dev-secret-not-for-production"


def secret() -> bytes:
    """Signing key. Falls back to a fixed development value with a warning rather than
    refusing to boot, so `npm run dev` works out of the box."""
    raw = os.environ.get("SESSION_SECRET") or os.environ.get("LATTICE_SECRET")
    if not raw:
        raw = _DEV_SECRET
    return raw.encode()


def is_dev_secret() -> bool:
    return not (os.environ.get("SESSION_SECRET") or os.environ.get("LATTICE_SECRET"))


def _b64e(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).decode().rstrip("=")


def _b64d(text: str) -> bytes:
    return base64.urlsafe_b64decode(text + "=" * (-len(text) % 4))


# ------------------------------------------------------------------ passwords

def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    dk = hashlib.scrypt(password.encode(), salt=salt, n=_N, r=_R, p=_P, dklen=_DKLEN)
    return f"scrypt${_N}${_R}${_P}${_b64e(salt)}${_b64e(dk)}"


def verify_password(password: str, stored: str) -> bool:
    try:
        scheme, n, r, p, salt, dk = stored.split("$")
        if scheme != "scrypt":
            return False
        got = hashlib.scrypt(
            password.encode(), salt=_b64d(salt), n=int(n), r=int(r), p=int(p), dklen=_DKLEN
        )
    except Exception:
        return False
    return hmac.compare_digest(got, _b64d(dk))


# ------------------------------------------------------------- session tokens

def issue_token(user_id: str, ttl: int = SESSION_TTL) -> str:
    payload = _b64e(json.dumps({"sub": user_id, "exp": int(time.time()) + ttl}).encode())
    sig = _b64e(hmac.new(secret(), payload.encode(), hashlib.sha256).digest())
    return f"{payload}.{sig}"


def read_token(token: str) -> str | None:
    """The user id inside a valid, unexpired token, or None. Never raises."""
    try:
        payload, sig = token.split(".")
        expected = hmac.new(secret(), payload.encode(), hashlib.sha256).digest()
        if not hmac.compare_digest(_b64d(sig), expected):
            return None
        body = json.loads(_b64d(payload))
    except Exception:
        return None
    if not isinstance(body.get("sub"), str) or float(body.get("exp", 0)) < time.time():
        return None
    return body["sub"]


# ---------------------------------------------------------- invitation tokens

def new_invite_token() -> tuple[str, str]:
    """(token to put in the link, hash to store). The plaintext is never persisted, so a
    database leak cannot be replayed into an account."""
    token = secrets.token_urlsafe(32)
    return token, hash_token(token)


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def new_join_code() -> str:
    """Class join code. Ambiguous glyphs (0/O, 1/I) are excluded because these get read
    aloud in a classroom and typed by hand."""
    alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    return "".join(secrets.choice(alphabet) for _ in range(6))
