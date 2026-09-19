from datetime import datetime, timezone
from typing import Optional
import uuid

from pydantic import BaseModel, Field


def _uuid() -> str:
    return str(uuid.uuid4())


def _now() -> datetime:
    return datetime.now(timezone.utc)


class GroceryItemCreate(BaseModel):
    name: str = Field(min_length=1)
    qty: Optional[float] = None
    unit: str = ""
    aisle: str = "Spices & Staples"


class GroceryGenerateRequest(BaseModel):
    start_date: str = Field(pattern=r"^\d{4}-\d{2}-\d{2}$")
    end_date: str = Field(pattern=r"^\d{4}-\d{2}-\d{2}$")


class GroceryItem(BaseModel):
    id: str = Field(default_factory=_uuid)
    name: str
    qty: Optional[float] = None
    unit: str = ""
    aisle: str = "Spices & Staples"
    checked: bool = False
    source: str = "manual"  # "menu" | "manual"
    created_at: datetime = Field(default_factory=_now)
