"""Grocery list — manual items plus auto-aggregation from the menu planner."""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pymongo import ASCENDING, DESCENDING

from lib.db import db
from lib.session import require_user
from models.grocery import GroceryGenerateRequest, GroceryItem, GroceryItemCreate

router = APIRouter(tags=["grocery"])

AISLE_KEYWORDS: dict[str, tuple] = {
    "Vegetables & Greens": (
        "onion", "tomato", "potato", "carrot", "bean", "spinach", "palak", "coriander",
        "capsicum", "cabbage", "cauliflower", "pea", "brinjal", "okra", "lady finger",
        "cucumber", "beet", "greens", "chilli", "garlic", "ginger", "lemon", "methi",
        "leaf", "vegetable", "radish", "gourd", "banana raw", "capsicum",
    ),
    "Dairy": ("milk", "curd", "yogurt", "paneer", "butter", "cheese", "cream", "ghee", "khoya", "buttermilk"),
    "Household & Cleaning": ("soap", "detergent", "cleaner", "phenyl", "brush", "mop", "tissue", "foil", "shampoo", "dish wash", "floor"),
}


def guess_aisle(name: str) -> str:
    low = name.lower()
    for aisle, keywords in AISLE_KEYWORDS.items():
        if any(k in low for k in keywords):
            return aisle
    return "Spices & Staples"


def _sort_docs(docs: list[dict]) -> list[dict]:
    return sorted(docs, key=lambda d: (d.get("aisle", ""), d.get("created_at")))


@router.get("/grocery", response_model=list[GroceryItem])
async def list_grocery(_: dict = Depends(require_user)):
    docs = await db.grocery_items.find().sort([("created_at", ASCENDING)]).to_list(1000)
    return [GroceryItem(**d) for d in _sort_docs(docs)]


@router.post("/grocery", response_model=GroceryItem, status_code=201)
async def create_grocery_item(body: GroceryItemCreate, _: dict = Depends(require_user)):
    doc = GroceryItem(name=body.name.strip(), qty=body.qty, unit=body.unit, aisle=body.aisle, source="manual")
    await db.grocery_items.insert_one(doc.model_dump())
    return doc


@router.patch("/grocery/{item_id}", response_model=GroceryItem)
async def update_grocery_item(item_id: str, body: dict, _: dict = Depends(require_user)):
    doc = await db.grocery_items.find_one({"id": item_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Grocery item not found")
    updates = {}
    if "checked" in body and isinstance(body["checked"], bool):
        updates["checked"] = body["checked"]
    if body.get("name"):
        updates["name"] = str(body["name"]).strip()
    if updates:
        await db.grocery_items.update_one({"id": item_id}, {"$set": updates})
        doc.update(updates)
    return GroceryItem(**doc)


@router.delete("/grocery/{item_id}", status_code=204)
async def delete_grocery_item(item_id: str, _: dict = Depends(require_user)):
    result = await db.grocery_items.delete_one({"id": item_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Grocery item not found")


@router.post("/grocery/clear-checked", status_code=204)
async def clear_checked(_: dict = Depends(require_user)):
    await db.grocery_items.delete_many({"checked": True})


@router.post("/grocery/generate", response_model=dict)
async def generate_from_menu(body: GroceryGenerateRequest, _: dict = Depends(require_user)):
    """Aggregate the scaled ingredients of every menu entry in the date range into
    one list. Replaces previous *unchecked* auto items so regenerating is idempotent."""
    if body.end_date < body.start_date:
        raise HTTPException(status_code=422, detail="end_date must be on or after start_date")

    entries = (
        await db.menu_entries.find({"date": {"$gte": body.start_date, "$lte": body.end_date}})
        .to_list(1000)
    )
    recipe_ids = list({e["recipe_id"] for e in entries})
    recipes: dict[str, dict] = {}
    if recipe_ids:
        async for r in db.recipes.find({"id": {"$in": recipe_ids}}):
            recipes[r["id"]] = r

    merged: dict[tuple[str, str], float] = {}
    for e in entries:
        recipe = recipes.get(e["recipe_id"])
        if not recipe:
            continue
        factor = e["servings"] / max(recipe.get("base_servings", 1), 1)
        for ing in recipe.get("ingredients", []):
            key = (ing["name"].strip().lower(), ing.get("unit", ""))
            merged[key] = merged.get(key, 0.0) + ing["qty"] * factor

    await db.grocery_items.delete_many({"source": "menu", "checked": False})
    docs = []
    for (name, unit), qty in merged.items():
        docs.append(
            GroceryItem(
                name=name,
                qty=round(qty, 2),
                unit=unit,
                aisle=guess_aisle(name),
                source="menu",
            ).model_dump()
        )
    if docs:
        await db.grocery_items.insert_many(docs)
    return {"created": len(docs), "range": [body.start_date, body.end_date]}
