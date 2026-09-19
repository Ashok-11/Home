"""Public cook view — NO auth. This is the link shared with the cook/maid:
dishes for a day with servings and ingredient amounts scaled per servings."""

from fastapi import APIRouter, HTTPException
from pymongo import ASCENDING

from lib.db import db
from lib.dates import today_iso
from models.menu import SLOTS, CookEntry, CookMenu, CookRecipe

router = APIRouter(tags=["cook"])

SLOT_RANK = {slot: i for i, slot in enumerate(SLOTS)}


async def build_cook_menu(date: str) -> CookMenu:
    entries = await db.menu_entries.find({"date": date}).sort([("created_at", ASCENDING)]).to_list(200)
    entries.sort(key=lambda d: (SLOT_RANK.get(d["slot"], 99), d.get("created_at")))
    recipe_ids = list({e["recipe_id"] for e in entries})
    recipes: dict[str, dict] = {}
    if recipe_ids:
        async for r in db.recipes.find({"id": {"$in": recipe_ids}}):
            recipes[r["id"]] = r
    out = []
    for e in entries:
        r = recipes.get(e["recipe_id"])
        out.append(
            CookEntry(
                id=e["id"],
                slot=e["slot"],
                servings=e["servings"],
                notes=e.get("notes", ""),
                recipe=CookRecipe(**r) if r else None,
            )
        )
    return CookMenu(date=date, entries=out)


@router.get("/cook/today", response_model=CookMenu)
async def cook_today():
    return await build_cook_menu(today_iso())


@router.get("/cook/{date}", response_model=CookMenu)
async def cook_by_date(date: str):
    if len(date) != 10 or not date.startswith("2"):
        raise HTTPException(status_code=400, detail="date must be YYYY-MM-DD (or use /cook/today)")
    return await build_cook_menu(date)
