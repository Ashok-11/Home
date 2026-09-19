from datetime import datetime, timezone
from typing import List
import uuid

from pydantic import BaseModel, Field


def _uuid() -> str:
    return str(uuid.uuid4())


def _now() -> datetime:
    return datetime.now(timezone.utc)


class Ingredient(BaseModel):
    qty: float = Field(gt=0)
    unit: str = "piece"
    name: str = Field(min_length=1)


class RecipeBase(BaseModel):
    name: str = Field(min_length=1)
    description: str = ""
    category: str = "Main Course"
    base_servings: int = Field(default=2, ge=1)
    prep_minutes: int = Field(default=0, ge=0)
    cook_minutes: int = Field(default=0, ge=0)
    ingredients: List[Ingredient] = []
    steps: List[str] = []
    image_url: str = ""          # photo of the finished dish for the cook
    station: str = "cook"        # cook | salad — which helper prepares it


class RecipeCreate(RecipeBase):
    pass


class Recipe(RecipeBase):
    id: str = Field(default_factory=_uuid)
    created_by: str = ""
    created_at: datetime = Field(default_factory=_now)
