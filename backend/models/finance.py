from datetime import datetime, timezone
from typing import List
import uuid

from pydantic import BaseModel, Field


def _uuid() -> str:
    return str(uuid.uuid4())


def _now() -> datetime:
    return datetime.now(timezone.utc)


# ---------- Expenses ----------

class ExpenseCreate(BaseModel):
    amount: float = Field(gt=0)
    category: str = Field(min_length=1)
    note: str = ""
    date: str = Field(pattern=r"^\d{4}-\d{2}-\d{2}$")
    member: str = "Shared"


class Expense(BaseModel):
    id: str = Field(default_factory=_uuid)
    amount: float
    category: str
    note: str = ""
    date: str
    month: str  # YYYY-MM, derived from date
    member: str = "Shared"
    created_by: str = ""
    created_at: datetime = Field(default_factory=_now)


# ---------- Income ----------

class IncomeCreate(BaseModel):
    source: str = Field(min_length=1)
    amount: float = Field(gt=0)
    date: str = Field(pattern=r"^\d{4}-\d{2}-\d{2}$")


class Income(BaseModel):
    id: str = Field(default_factory=_uuid)
    source: str
    amount: float
    date: str
    month: str
    created_at: datetime = Field(default_factory=_now)


# ---------- Budget ----------

class BudgetSet(BaseModel):
    month: str = Field(pattern=r"^\d{4}-\d{2}$")
    amount: float = Field(ge=0)


class Budget(BaseModel):
    id: str = Field(default_factory=_uuid)
    month: str
    amount: float


# ---------- Summary ----------

class CategoryTotal(BaseModel):
    category: str
    total: float


class FinanceSummary(BaseModel):
    month: str
    income_total: float
    expense_total: float
    budget: float
    remaining: float
    by_category: List[CategoryTotal]
    recent_expenses: List[Expense]
