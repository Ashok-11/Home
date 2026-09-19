from fastapi import APIRouter, Depends, HTTPException
from pymongo import DESCENDING

from lib.db import db
from lib.session import require_user
from models.recipes import Recipe, RecipeCreate

router = APIRouter(tags=["recipes"])


@router.get("/recipes", response_model=list[Recipe])
async def list_recipes(_: dict = Depends(require_user)):
    docs = await db.recipes.find().sort("created_at", DESCENDING).to_list(1000)
    return [Recipe(**d) for d in docs]


@router.get("/recipes/{recipe_id}", response_model=Recipe)
async def get_recipe(recipe_id: str, _: dict = Depends(require_user)):
    doc = await db.recipes.find_one({"id": recipe_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Recipe not found")
    return Recipe(**doc)


@router.post("/recipes", response_model=Recipe, status_code=201)
async def create_recipe(body: RecipeCreate, user: dict = Depends(require_user)):
    doc = Recipe(**body.model_dump(), created_by=user["name"])
    await db.recipes.insert_one(doc.model_dump())
    return doc


@router.put("/recipes/{recipe_id}", response_model=Recipe)
async def update_recipe(recipe_id: str, body: RecipeCreate, _: dict = Depends(require_user)):
    doc = await db.recipes.find_one({"id": recipe_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Recipe not found")
    updates = body.model_dump()
    await db.recipes.update_one({"id": recipe_id}, {"$set": updates})
    doc.update(updates)
    return Recipe(**doc)


@router.delete("/recipes/{recipe_id}", status_code=204)
async def delete_recipe(recipe_id: str, _: dict = Depends(require_user)):
    result = await db.recipes.delete_one({"id": recipe_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Recipe not found")
