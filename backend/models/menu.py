from datetime import datetime, timezone
from typing import List, Optional
import uuid

from pydantic import BaseModel, Field

from models.recipes import Ingredient

SLOTS = ["breakfast", "lunch", "snacks", "dinner"]


def _uuid() -> str:
    return str(uuid.uuid4())


def _now() -> datetime:
    return datetime.now(timezone.utc)


class MenuEntryCreate(BaseModel):
    date: str = Field(pattern=r"^\d{4}-\d{2}-\d{2}$")
    timing_id: str
    recipe_id: str
    servings: int = Field(default=2, ge=1)
    notes: str = ""


class MenuEntryUpdate(BaseModel):
    date: Optional[str] = Field(default=None, pattern=r"^\d{4}-\d{2}-\d{2}$")
    timing_id: Optional[str] = None
    servings: Optional[int] = Field(default=None, ge=1)
    notes: Optional[str] = None


class MenuEntry(BaseModel):
    id: str = Field(default_factory=_uuid)
    date: str
    timing_id: str = ""
    timing_label: str = ""
    timing_order: int = 0
    station: str = "cook"
    recipe_id: str
    recipe_name: str  # denormalised so the cook view survives a deleted recipe
    servings: int
    notes: str = ""
    created_at: datetime = Field(default_factory=_now)


# ---------- Public cook view ----------

class CookRecipe(BaseModel):
    id: str
    name: str
    image_url: str = ""
    station: str = "cook"
    description: str = ""
    category: str = ""
    base_servings: int
    prep_minutes: int = 0
    cook_minutes: int = 0
    ingredients: List[Ingredient] = []
    steps: List[str] = []


class CookEntry(BaseModel):
    id: str
    timing_id: str = ""
    timing_label: str = ""
    timing_order: int = 0
    servings: int
    notes: str = ""
    recipe: Optional[CookRecipe] = None


class CookMenu(BaseModel):
    date: str
    station: str = "cook"
    entries: List[CookEntry]
