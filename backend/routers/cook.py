"""PUBLIC station pages — /cook (main cook) and /salad (salad cook).

Each station sees ONLY the dishes assigned to it, for ONE given day.
"""

from fastapi import APIRouter, HTTPException
from pymongo import ASCENDING

from lib.db import db
from lib.dates import today_iso
from models.menu import CookEntry, CookMenu, CookRecipe

router = APIRouter(tags=["cook"])

STATIONS = ("cook", "salad")


async def build_station_menu(date: str, station: str) -> CookMenu:
    entries = await db.menu_entries.find({"date": date}).sort([("created_at", ASCENDING)]).to_list(300)
    recipe_ids = list({e["recipe_id"] for e in entries})
    recipes: dict[str, dict] = {}
    if recipe_ids:
        async for r in db.recipes.find({"id": {"$in": recipe_ids}}):
            recipes[r["id"]] = r

    out: list[CookEntry] = []
    for e in entries:
        r = recipes.get(e["recipe_id"])
        entry_station = (r or {}).get("station") or e.get("station") or "cook"
        if entry_station != station:
            continue
        out.append(
            CookEntry(
                id=e["id"],
                timing_id=e.get("timing_id", ""),
                timing_label=e.get("timing_label", ""),
                timing_order=e.get("timing_order", 0),
                servings=e["servings"],
                notes=e.get("notes", ""),
                recipe=CookRecipe(**r) if r else None,
            )
        )
    out.sort(key=lambda c: (c.timing_order, c.timing_label))
    return CookMenu(date=date, station=station, entries=out)


def _check(station: str, date: str | None = None) -> None:
    if station not in STATIONS:
        raise HTTPException(status_code=404, detail=f"station must be one of {STATIONS}")
    if date is not None and (len(date) != 10 or date[4] != "-"):
        raise HTTPException(status_code=400, detail="date must be YYYY-MM-DD")


@router.get("/station/{station}/today", response_model=CookMenu)
async def station_today(station: str):
    _check(station)
    return await build_station_menu(today_iso(), station)


@router.get("/station/{station}/{date}", response_model=CookMenu)
async def station_by_date(station: str, date: str):
    _check(station, date)
    return await build_station_menu(date, station)


# --- legacy aliases so existing links keep working ---

@router.get("/cook/today", response_model=CookMenu)
async def cook_today():
    return await build_station_menu(today_iso(), "cook")


@router.get("/cook/{date}", response_model=CookMenu)
async def cook_by_date(date: str):
    _check("cook", date)
    return await build_station_menu(date, "cook")
