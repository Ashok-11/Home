"""Household chore tracker."""

from fastapi import APIRouter, Depends, HTTPException

from lib.db import db
from lib.session import require_user
from models.chores import Chore, ChoreCreate, ChoreUpdate

router = APIRouter(tags=["chores"])


@router.get("/chores", response_model=list[Chore])
async def list_chores(done: str | None = None, area: str | None = None, _: dict = Depends(require_user)):
    query: dict = {}
    if done == "true":
        query["done"] = True
    elif done == "false":
        query["done"] = False
    if area:
        query["area"] = area
    docs = await db.chores.find(query).sort([("done", 1), ("due_date", 1)]).to_list(1000)
    return [Chore(**{**d, "area": d.get("area", "household")}) for d in docs]


@router.post("/chores", response_model=Chore, status_code=201)
async def create_chore(body: ChoreCreate, _: dict = Depends(require_user)):
    doc = Chore(**body.model_dump())
    await db.chores.insert_one(doc.model_dump())
    return doc


@router.patch("/chores/{chore_id}", response_model=Chore)
async def update_chore(chore_id: str, body: ChoreUpdate, _: dict = Depends(require_user)):
    doc = await db.chores.find_one({"id": chore_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Chore not found")
    updates = {k: v for k, v in body.model_dump(exclude_none=True).items()}
    if updates:
        await db.chores.update_one({"id": chore_id}, {"$set": updates})
        doc.update(updates)
    return Chore(**{**doc, "area": doc.get("area", "household")})


@router.delete("/chores/{chore_id}", status_code=204)
async def delete_chore(chore_id: str, _: dict = Depends(require_user)):
    result = await db.chores.delete_one({"id": chore_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Chore not found")
