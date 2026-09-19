"""Menu planner (auth) — entries pair a recipe with a date, meal slot and servings."""

from fastapi import APIRouter, Depends, HTTPException
from pymongo import ASCENDING

from lib.db import db
from lib.session import require_user
from models.menu import MenuEntry, MenuEntryCreate, MenuEntryUpdate

router = APIRouter(tags=["menu"])


def _sort_key(doc: dict) -> tuple:
    return (doc["date"], doc.get("timing_order", 99), doc.get("created_at"))


@router.get("/menu", response_model=list[MenuEntry])
async def list_menu(start: str | None = None, end: str | None = None, _: dict = Depends(require_user)):
    query: dict = {}
    if start or end:
        date_q: dict = {}
        if start:
            date_q["$gte"] = start
        if end:
            date_q["$lte"] = end
        query["date"] = date_q
    docs = await db.menu_entries.find(query).sort([("date", ASCENDING)]).to_list(1000)
    docs.sort(key=_sort_key)
    return [MenuEntry(**d) for d in docs]


@router.post("/menu", response_model=MenuEntry, status_code=201)
async def create_menu_entry(body: MenuEntryCreate, _: dict = Depends(require_user)):
    timing = await db.timings.find_one({"id": body.timing_id})
    if not timing:
        raise HTTPException(status_code=404, detail="Meal timing not found")
    recipe = await db.recipes.find_one({"id": body.recipe_id})
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    doc = MenuEntry(
        date=body.date,
        timing_id=timing["id"],
        timing_label=timing["name"],
        timing_order=timing.get("order", 0),
        station=recipe.get("station", "cook"),
        recipe_id=body.recipe_id,
        recipe_name=recipe["name"],
        servings=body.servings,
        notes=body.notes,
    )
    await db.menu_entries.insert_one(doc.model_dump())
    return doc


@router.patch("/menu/{entry_id}", response_model=MenuEntry)
async def update_menu_entry(entry_id: str, body: MenuEntryUpdate, _: dict = Depends(require_user)):
    doc = await db.menu_entries.find_one({"id": entry_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Menu entry not found")
    updates = {k: v for k, v in body.model_dump(exclude_none=True).items()}
    if "timing_id" in updates:
        timing = await db.timings.find_one({"id": updates["timing_id"]})
        if not timing:
            raise HTTPException(status_code=404, detail="Meal timing not found")
        updates["timing_label"] = timing["name"]
        updates["timing_order"] = timing.get("order", 0)
    if updates:
        await db.menu_entries.update_one({"id": entry_id}, {"$set": updates})
        doc.update(updates)
    return MenuEntry(**doc)


@router.delete("/menu/{entry_id}", status_code=204)
async def delete_menu_entry(entry_id: str, _: dict = Depends(require_user)):
    result = await db.menu_entries.delete_one({"id": entry_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Menu entry not found")
