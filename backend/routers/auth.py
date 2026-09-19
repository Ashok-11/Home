from fastapi import APIRouter, HTTPException, Request, Response

from lib.db import db
from lib.session import (
    MAX_MEMBERS,
    create_session,
    destroy_session,
    get_current_user,
    hash_password,
    verify_password,
)
from models.auth import LoginRequest, SignupRequest, UserPublic

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=UserPublic)
async def login(body: LoginRequest, response: Response):
    user = await db.users.find_one({"email": body.email.lower()})
    if not user or not verify_password(body.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    await create_session(response, user["id"])
    return UserPublic(id=user["id"], name=user["name"], email=user["email"])


@router.post("/logout")
async def logout(request: Request, response: Response):
    await destroy_session(request, response)
    return {"ok": True}


@router.get("/me", response_model=UserPublic)
async def me(request: Request):
    user = await get_current_user(request)
    if user is None:
        raise HTTPException(status_code=401, detail="Not logged in")
    return UserPublic(id=user["id"], name=user["name"], email=user["email"])


@router.post("/signup", response_model=UserPublic, status_code=201)
async def signup(body: SignupRequest, response: Response):
    # Invite-only household: at most MAX_MEMBERS accounts, ever.
    count = await db.users.count_documents({})
    if count >= MAX_MEMBERS:
        raise HTTPException(status_code=403, detail="This household is full — signups are invite-only.")
    if await db.users.find_one({"email": body.email.lower()}):
        raise HTTPException(status_code=409, detail="An account with this email already exists")
    doc = {
        "id": body.email.lower(),  # stable per-email id
        "name": body.name.strip(),
        "email": body.email.lower(),
        "password_hash": hash_password(body.password),
    }
    await db.users.insert_one(doc)
    await create_session(response, doc["id"])
    return UserPublic(id=doc["id"], name=doc["name"], email=doc["email"])
