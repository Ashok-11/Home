"""User-configurable lists: spending categories, grocery aisles, meal timings, houses."""

from datetime import datetime, timezone
import uuid

from pydantic import BaseModel, Field


def _uuid() -> str:
    return str(uuid.uuid4())


def _now() -> datetime:
    return datetime.now(timezone.utc)


class NamedCreate(BaseModel):
    name: str = Field(min_length=1)


class Category(BaseModel):
    id: str = Field(default_factory=_uuid)
    name: str
    created_at: datetime = Field(default_factory=_now)


class Aisle(BaseModel):
    id: str = Field(default_factory=_uuid)
    name: str
    created_at: datetime = Field(default_factory=_now)


class TimingCreate(BaseModel):
    name: str = Field(min_length=1)
    order: int = 0


class Timing(BaseModel):
    id: str = Field(default_factory=_uuid)
    name: str
    order: int = 0
    created_at: datetime = Field(default_factory=_now)


class HouseCreate(BaseModel):
    name: str = Field(min_length=1)
    address: str = ""
    is_default: bool = False


class House(BaseModel):
    id: str = Field(default_factory=_uuid)
    name: str
    address: str = ""
    is_default: bool = False
    created_at: datetime = Field(default_factory=_now)
