"""Payment sources — credit/debit cards, UPI handles, cash."""

from fastapi import APIRouter, Depends, HTTPException
from pymongo import ASCENDING

from lib.db import db
from lib.session import require_user
from models.cards import Card, CardCreate

router = APIRouter(tags=["cards"])


@router.get("/cards", response_model=list[Card])
async def list_cards(_: dict = Depends(require_user)):
    docs = await db.cards.find().sort([("created_at", ASCENDING)]).to_list(200)
    return [Card(**d) for d in docs]


@router.post("/cards", response_model=Card, status_code=201)
async def create_card(body: CardCreate, _: dict = Depends(require_user)):
    doc = Card(**body.model_dump())
    await db.cards.insert_one(doc.model_dump())
    return doc


@router.put("/cards/{card_id}", response_model=Card)
async def update_card(card_id: str, body: CardCreate, _: dict = Depends(require_user)):
    doc = await db.cards.find_one({"id": card_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Card not found")
    updates = body.model_dump()
    await db.cards.update_one({"id": card_id}, {"$set": updates})
    doc.update(updates)
    return Card(**doc)


@router.delete("/cards/{card_id}", status_code=204)
async def delete_card(card_id: str, _: dict = Depends(require_user)):
    result = await db.cards.delete_one({"id": card_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Card not found")
