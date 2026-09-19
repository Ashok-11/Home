from datetime import datetime, timezone
import uuid

from pydantic import BaseModel, Field


def _uuid() -> str:
    return str(uuid.uuid4())


def _now() -> datetime:
    return datetime.now(timezone.utc)


class CardCreate(BaseModel):
    name: str = Field(min_length=1)
    bank: str = ""
    last4: str = Field(default="", pattern=r"^\d{0,4}$")
    type: str = "credit"  # credit | debit | upi | cash
    owner: str = "Common"  # Ashok | Manasa | Common


class Card(BaseModel):
    id: str = Field(default_factory=_uuid)
    name: str
    bank: str = ""
    last4: str = ""
    type: str = "credit"
    owner: str = "Common"
    created_at: datetime = Field(default_factory=_now)
