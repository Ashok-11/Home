from datetime import datetime, timezone
from typing import Optional
import uuid

from pydantic import BaseModel, Field


def _uuid() -> str:
    return str(uuid.uuid4())


def _now() -> datetime:
    return datetime.now(timezone.utc)


class ChoreCreate(BaseModel):
    title: str = Field(min_length=1)
    assignee: str = "Shared"  # Husband | Wife | Shared
    frequency: str = "Daily"  # Daily | Weekly | Monthly | Seasonal
    due_date: Optional[str] = Field(default=None, pattern=r"^\d{4}-\d{2}-\d{2}$")


class ChoreUpdate(BaseModel):
    title: Optional[str] = None
    assignee: Optional[str] = None
    frequency: Optional[str] = None
    due_date: Optional[str] = Field(default=None, pattern=r"^\d{4}-\d{2}-\d{2}$")
    done: Optional[bool] = None


class Chore(BaseModel):
    id: str = Field(default_factory=_uuid)
    title: str
    assignee: str = "Shared"
    frequency: str = "Daily"
    due_date: Optional[str] = None
    done: bool = False
    created_at: datetime = Field(default_factory=_now)
