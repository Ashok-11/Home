"""Appliance/electronics service tracker — geyser, AC, purifier, fridge…"""

from datetime import datetime, timezone
from typing import List, Optional
import uuid

from pydantic import BaseModel, Field


def _uuid() -> str:
    return str(uuid.uuid4())


def _now() -> datetime:
    return datetime.now(timezone.utc)


class ApplianceCreate(BaseModel):
    name: str = Field(min_length=1)
    location: str = ""
    service_interval_months: int = Field(default=6, ge=1)
    last_serviced_on: Optional[str] = Field(default=None, pattern=r"^\d{4}-\d{2}-\d{2}$")
    notes: str = ""


class Appliance(BaseModel):
    id: str = Field(default_factory=_uuid)
    name: str
    location: str = ""
    service_interval_months: int = 6
    last_serviced_on: Optional[str] = None
    notes: str = ""
    created_at: datetime = Field(default_factory=_now)


class ServiceRecordCreate(BaseModel):
    date: str = Field(pattern=r"^\d{4}-\d{2}-\d{2}$")
    vendor: str = ""
    cost: float = Field(default=0, ge=0)
    notes: str = ""


class ServiceRecord(BaseModel):
    id: str = Field(default_factory=_uuid)
    appliance_id: str
    date: str
    vendor: str = ""
    cost: float = 0
    notes: str = ""
    created_at: datetime = Field(default_factory=_now)


class ApplianceWithStatus(Appliance):
    next_due: Optional[str] = None
    overdue: bool = False
    records: List[ServiceRecord] = []
