"""CRUD for the configurable lists: categories, aisles, meal timings, houses."""

from fastapi import APIRouter, Depends, HTTPException
from pymongo import ASCENDING

from lib.db import db
from lib.session import require_user
from models.config import (
    Aisle,
    Category,
    House,
    HouseCreate,
    NamedCreate,
    Timing,
    TimingCreate,
)

router = APIRouter(tags=["config"])


# ---------- spending categories ----------

@router.get("/categories", response_model=list[Category])
async def list_categories(_: dict = Depends(require_user)):
    docs = await db.categories.find().sort([("name", ASCENDING)]).to_list(300)
    return [Category(**d) for d in docs]


@router.post("/categories", response_model=Category, status_code=201)
async def create_category(body: NamedCreate, _: dict = Depends(require_user)):
    name = body.name.strip()
    if await db.categories.find_one({"name": name}):
        raise HTTPException(status_code=409, detail="That category already exists")
    doc = Category(name=name)
    await db.categories.insert_one(doc.model_dump())
    return doc


@router.put("/categories/{category_id}", response_model=Category)
async def update_category(category_id: str, body: NamedCreate, _: dict = Depends(require_user)):
    doc = await db.categories.find_one({"id": category_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Category not found")
    new_name = body.name.strip()
    await db.categories.update_one({"id": category_id}, {"$set": {"name": new_name}})
    # keep existing expenses pointing at the renamed category
    await db.expenses.update_many({"category": doc["name"]}, {"$set": {"category": new_name}})
    doc["name"] = new_name
    return Category(**doc)


@router.delete("/categories/{category_id}", status_code=204)
async def delete_category(category_id: str, _: dict = Depends(require_user)):
    result = await db.categories.delete_one({"id": category_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")


# ---------- grocery aisles ----------

@router.get("/aisles", response_model=list[Aisle])
async def list_aisles(_: dict = Depends(require_user)):
    docs = await db.aisles.find().sort([("name", ASCENDING)]).to_list(300)
    return [Aisle(**d) for d in docs]


@router.post("/aisles", response_model=Aisle, status_code=201)
async def create_aisle(body: NamedCreate, _: dict = Depends(require_user)):
    name = body.name.strip()
    if await db.aisles.find_one({"name": name}):
        raise HTTPException(status_code=409, detail="That aisle already exists")
    doc = Aisle(name=name)
    await db.aisles.insert_one(doc.model_dump())
    return doc


@router.put("/aisles/{aisle_id}", response_model=Aisle)
async def update_aisle(aisle_id: str, body: NamedCreate, _: dict = Depends(require_user)):
    doc = await db.aisles.find_one({"id": aisle_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Aisle not found")
    new_name = body.name.strip()
    await db.aisles.update_one({"id": aisle_id}, {"$set": {"name": new_name}})
    await db.grocery_items.update_many({"aisle": doc["name"]}, {"$set": {"aisle": new_name}})
    doc["name"] = new_name
    return Aisle(**doc)


@router.delete("/aisles/{aisle_id}", status_code=204)
async def delete_aisle(aisle_id: str, _: dict = Depends(require_user)):
    result = await db.aisles.delete_one({"id": aisle_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Aisle not found")


# ---------- meal timings (breakfast, lunch, …) — PUBLIC read for the cook pages ----------

@router.get("/timings", response_model=list[Timing])
async def list_timings():
    docs = await db.timings.find().sort([("order", ASCENDING), ("name", ASCENDING)]).to_list(100)
    return [Timing(**d) for d in docs]


@router.post("/timings", response_model=Timing, status_code=201)
async def create_timing(body: TimingCreate, _: dict = Depends(require_user)):
    name = body.name.strip()
    if await db.timings.find_one({"name": name}):
        raise HTTPException(status_code=409, detail="That timing already exists")
    doc = Timing(name=name, order=body.order)
    await db.timings.insert_one(doc.model_dump())
    return doc


@router.put("/timings/{timing_id}", response_model=Timing)
async def update_timing(timing_id: str, body: TimingCreate, _: dict = Depends(require_user)):
    doc = await db.timings.find_one({"id": timing_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Timing not found")
    updates = {"name": body.name.strip(), "order": body.order}
    await db.timings.update_one({"id": timing_id}, {"$set": updates})
    await db.menu_entries.update_many({"timing_id": timing_id}, {"$set": {"timing_label": updates["name"]}})
    doc.update(updates)
    return Timing(**doc)


@router.delete("/timings/{timing_id}", status_code=204)
async def delete_timing(timing_id: str, _: dict = Depends(require_user)):
    result = await db.timings.delete_one({"id": timing_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Timing not found")


# ---------- houses ----------

@router.get("/houses", response_model=list[House])
async def list_houses(_: dict = Depends(require_user)):
    docs = await db.houses.find().sort([("created_at", ASCENDING)]).to_list(100)
    return [House(**d) for d in docs]


async def _clear_defaults() -> None:
    await db.houses.update_many({"is_default": True}, {"$set": {"is_default": False}})


@router.post("/houses", response_model=House, status_code=201)
async def create_house(body: HouseCreate, _: dict = Depends(require_user)):
    first = await db.houses.count_documents({}) == 0
    make_default = body.is_default or first
    if make_default:
        await _clear_defaults()
    doc = House(name=body.name.strip(), address=body.address, is_default=make_default)
    await db.houses.insert_one(doc.model_dump())
    return doc


@router.put("/houses/{house_id}", response_model=House)
async def update_house(house_id: str, body: HouseCreate, _: dict = Depends(require_user)):
    doc = await db.houses.find_one({"id": house_id})
    if not doc:
        raise HTTPException(status_code=404, detail="House not found")
    if body.is_default:
        await _clear_defaults()
    updates = {"name": body.name.strip(), "address": body.address, "is_default": body.is_default}
    await db.houses.update_one({"id": house_id}, {"$set": updates})
    doc.update(updates)
    return House(**doc)


@router.post("/houses/{house_id}/default", response_model=House)
async def set_default_house(house_id: str, _: dict = Depends(require_user)):
    doc = await db.houses.find_one({"id": house_id})
    if not doc:
        raise HTTPException(status_code=404, detail="House not found")
    await _clear_defaults()
    await db.houses.update_one({"id": house_id}, {"$set": {"is_default": True}})
    doc["is_default"] = True
    return House(**doc)


@router.delete("/houses/{house_id}", status_code=204)
async def delete_house(house_id: str, _: dict = Depends(require_user)):
    result = await db.houses.delete_one({"id": house_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="House not found")
    await db.appliances.update_many({"house_id": house_id}, {"$set": {"house_id": None}})
