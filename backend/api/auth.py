"""Accounts, sessions, schools and invitations.

Three ways in, deliberately:

  * a student or an independent teacher signs themselves up;
  * an administrator registers a school and becomes its first admin;
  * a teacher or student arrives through a single-use invitation link.

What is *not* here: any route that generates a password for somebody else. The handoff
flags Savitrix's plaintext temporary passwords as its highest-priority defect; the
invitation flow below is the replacement, and no password for another person ever exists in
this system in readable form.
"""
from __future__ import annotations

import re

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, Field, field_validator

from .. import security, store
from ..deps import admin, clear_session_cookie, current_user, set_session_cookie, teacher
from ..store import User

router = APIRouter(prefix="/api/auth", tags=["auth"])

MIN_PASSWORD = 8
PLAN_SEATS = {"trial": 5, "starter": 10, "professional": 50, "enterprise": None}

# Deliberately permissive, and not a dependency. Full RFC 5322 validation is a package we do
# not need: the only thing that actually proves an address works is sending mail to it.
_EMAIL = re.compile(r"^[^@\s]+@[^@\s]+\.[A-Za-z]{2,}$")


class _WithEmail(BaseModel):
    """Normalises the address so `alex@x.com` and `Alex@X.com ` are one account."""

    # check_fields=False: the field is declared by the subclasses, not here.
    @field_validator("email", mode="before", check_fields=False)
    @classmethod
    def _clean_email(cls, v: object) -> str:
        text = str(v or "").strip().lower()
        if not _EMAIL.fullmatch(text):
            raise ValueError("that does not look like an email address")
        return text


def _check_password(password: str) -> None:
    if len(password) < MIN_PASSWORD:
        raise HTTPException(
            status_code=422, detail=f"Use at least {MIN_PASSWORD} characters for your password."
        )


def _taken(email: str) -> None:
    if store.user_by_email(email):
        raise HTTPException(status_code=409, detail="There is already an account with that email.")


class SchoolFields(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    type: str | None = None
    city: str | None = None
    country: str | None = None
    plan: str = "trial"


class SignupRequest(_WithEmail):
    name: str = Field(min_length=1, max_length=80)
    email: str
    password: str
    role: str = Field(default="student", pattern="^(student|teacher)$")
    school: SchoolFields | None = None


class LoginRequest(_WithEmail):
    email: str
    password: str


@router.post("/signup")
def signup(req: SignupRequest, response: Response) -> dict:
    """Individual signup. A student or an independent teacher; no school required.

    Passing `school` registers a school and makes this account its administrator — the
    school and the admin commit in one transaction, so a failure cannot leave an orphan
    school behind.
    """
    _check_password(req.password)
    _taken(req.email)
    pw = security.hash_password(req.password)

    if req.school:
        if req.school.plan not in PLAN_SEATS:
            raise HTTPException(status_code=422, detail="Unknown plan.")
        user = store.register_school_admin(
            req.school.name,
            {"name": req.name, "email": req.email, "password_hash": pw},
            req.school.model_dump(exclude={"name"}),
        )
    else:
        user = store.create_user(req.name, req.email, pw, req.role)

    set_session_cookie(response, user.id)
    return {"user": user.public(), "school": store.get_school(user.school_id)}


@router.post("/login")
def login(req: LoginRequest, response: Response) -> dict:
    row = store.user_by_email(req.email)
    # One message for both causes, so this cannot be used to enumerate accounts.
    if not row or not security.verify_password(req.password, row["password_hash"]):
        raise HTTPException(status_code=401, detail="That email and password do not match.")
    set_session_cookie(response, row["id"])
    user = store.user_by_id(row["id"])
    assert user is not None
    return {"user": user.public(), "school": store.get_school(user.school_id)}


@router.post("/logout")
def logout(response: Response) -> dict:
    clear_session_cookie(response)
    return {"ok": True}


@router.get("/me")
def me(user: User = Depends(current_user)) -> dict:
    school = store.get_school(user.school_id)
    out = {"user": user.public(), "school": school}
    if school and user.is_admin:
        seats = PLAN_SEATS.get(school["plan"])
        used = len(store.users_in_school(school["id"], "teacher"))
        out["seats"] = {"limit": seats, "used": used}
    return out


# ------------------------------------------------------------------ invitations

class InviteRequest(_WithEmail):
    email: str
    role: str = Field(default="teacher", pattern="^(student|teacher)$")
    class_id: str | None = None


@router.post("/invitations")
def create_invitation(req: InviteRequest, request: Request, user: User = Depends(teacher)) -> dict:
    """Issue a single-use invitation. Returns a link for the inviter to pass on.

    The token is returned exactly once, here, to the person who created it. Only its SHA-256
    hash is stored, so a copy of the database cannot be replayed into somebody's account.
    """
    if req.role == "teacher":
        if not user.is_admin:
            raise HTTPException(
                status_code=403, detail="Only an administrator can invite teachers."
            )
        school = store.get_school(user.school_id)
        assert school is not None
        limit = PLAN_SEATS.get(school["plan"])
        if limit is not None:
            used = len(store.users_in_school(school["id"], "teacher"))
            pending = len([i for i in store.pending_invitations(school["id"]) if i["role"] == "teacher"])
            if used + pending >= limit:
                raise HTTPException(
                    status_code=409,
                    detail=(
                        f"The {school['plan']} plan covers {limit} teacher seats, and "
                        f"{used} are in use with {pending} invitation(s) outstanding."
                    ),
                )
    if req.class_id and not store.teaches(user, req.class_id):
        raise HTTPException(status_code=403, detail="That is not your class.")
    if store.user_by_email(req.email):
        raise HTTPException(
            status_code=409,
            detail="That person already has an account — add them to a class instead.",
        )

    token, token_hash = security.new_invite_token()
    invite = store.create_invitation(
        token_hash,
        req.email,
        req.role,
        created_by=user.id,
        school_id=user.school_id if req.role == "teacher" else None,
        class_id=req.class_id,
    )
    base = str(request.base_url).rstrip("/")
    return {**invite, "url": f"{base}/invite/{token}"}


@router.get("/invitations/{token}")
def read_invitation(token: str) -> dict:
    """What an invitation is for, so the accept screen can say who invited you to what.
    Never reveals anything that is not already in the link the person is holding."""
    invite = store.invitation_by_hash(security.hash_token(token))
    if not invite:
        raise HTTPException(
            status_code=404, detail="That invitation has expired or has already been used."
        )
    school = store.get_school(invite["school_id"])
    klass = store.class_by_id(invite["class_id"]) if invite["class_id"] else None
    return {
        "email": invite["email"],
        "role": invite["role"],
        "school": school["name"] if school else None,
        "className": klass["name"] if klass else None,
    }


class AcceptRequest(BaseModel):
    token: str
    name: str = Field(min_length=1, max_length=80)
    password: str


@router.post("/invitations/accept")
def accept_invitation(req: AcceptRequest, response: Response) -> dict:
    """The invited person sets their own password. That is the whole point."""
    _check_password(req.password)
    invite = store.invitation_by_hash(security.hash_token(req.token))
    if not invite:
        raise HTTPException(
            status_code=404, detail="That invitation has expired or has already been used."
        )
    _taken(invite["email"])

    try:
        user = store.create_user(
            req.name,
            invite["email"],
            security.hash_password(req.password),
            invite["role"],
            invite["school_id"],
        )
        if invite["class_id"]:
            store.add_member(invite["class_id"], user.id)
        store.accept_invitation(invite["id"])
    except Exception:
        raise

    set_session_cookie(response, user.id)
    return {"user": user.public(), "school": store.get_school(user.school_id)}


# --------------------------------------------------------------------- teachers

@router.get("/teachers")
def list_teachers(user: User = Depends(admin)) -> dict:
    assert user.school_id
    school = store.get_school(user.school_id)
    assert school is not None
    teachers = store.users_in_school(user.school_id, "teacher")
    return {
        "teachers": teachers,
        "pending": store.pending_invitations(user.school_id),
        "plan": school["plan"],
        "seats": {"limit": PLAN_SEATS.get(school["plan"]), "used": len(teachers)},
    }


@router.delete("/teachers/{teacher_id}")
def remove_teacher(teacher_id: str, user: User = Depends(admin)) -> dict:
    assert user.school_id
    if not re.fullmatch(r"[0-9a-f]{8,32}", teacher_id):
        raise HTTPException(status_code=404, detail="No such teacher.")
    if not store.delete_user(teacher_id, user.school_id):
        raise HTTPException(status_code=404, detail="No such teacher in this school.")
    return {"ok": True}
