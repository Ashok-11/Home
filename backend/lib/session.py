"""Cookie sessions + password hashing. Auth routes live under /api/auth/*; every
protected router uses `require_user` as a dependency."""

import uuid
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, Request, Response
from passlib.context import CryptContext

from lib.db import db

COOKIE_NAME = "hb_session"
SESSION_TTL_DAYS = 30
MAX_MEMBERS = 2  # invite-only household: husband + wife

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(password: str, hashed: str) -> bool:
    return pwd_context.verify(password, hashed)


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


async def create_session(response: Response, user_id: str) -> None:
    token = str(uuid.uuid4())
    expires_at = now_utc() + timedelta(days=SESSION_TTL_DAYS)
    await db.sessions.insert_one({"token": token, "user_id": user_id, "expires_at": expires_at})
    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        httponly=True,
        samesite="lax",
        max_age=SESSION_TTL_DAYS * 24 * 3600,
        path="/",
    )


async def destroy_session(request: Request, response: Response) -> None:
    token = request.cookies.get(COOKIE_NAME)
    if token:
        await db.sessions.delete_one({"token": token})
    response.delete_cookie(COOKIE_NAME, path="/")


async def get_current_user(request: Request) -> dict | None:
    """The user doc (sans hash) for the session cookie, or None."""
    token = request.cookies.get(COOKIE_NAME)
    if not token:
        return None
    # The $gt comparison runs inside MongoDB (BSON) — never compare datetimes in Python.
    session = await db.sessions.find_one({"token": token, "expires_at": {"$gt": now_utc()}})
    if not session:
        return None
    user = await db.users.find_one({"id": session["user_id"]})
    if not user:
        return None
    user.pop("password_hash", None)
    return user


async def require_user(request: Request) -> dict:
    user = await get_current_user(request)
    if user is None:
        raise HTTPException(status_code=401, detail="Not logged in")
    return user
