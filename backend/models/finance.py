from datetime import datetime, timezone
from typing import List, Optional
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
    member: str = "Common"  # Ashok | Manasa | Common
    source_id: Optional[str] = None  # card id | upi-ashok | upi-manasa | cash
    source_label: str = ""
    is_personal: bool = False  # counts against the month's personal fund


class Expense(BaseModel):
    id: str = Field(default_factory=_uuid)
    amount: float
    category: str
    note: str = ""
    date: str
    month: str  # YYYY-MM, derived from date
    member: str = "Common"
    source_id: Optional[str] = None
    source_label: str = ""
    is_personal: bool = False
    created_by: str = ""
    created_at: datetime = Field(default_factory=_now)


# ---------- Income ----------

class IncomeCreate(BaseModel):
    source: str = Field(min_length=1)
    source_type: str = "other"  # ashok | manasa | rental | other
    amount: float = Field(gt=0)
    date: str = Field(pattern=r"^\d{4}-\d{2}-\d{2}$")


class Income(BaseModel):
    id: str = Field(default_factory=_uuid)
    source: str
    source_type: str = "other"
    amount: float
    date: str
    month: str
    created_at: datetime = Field(default_factory=_now)


# ---------- Budget & allowance ----------

class BudgetSet(BaseModel):
    month: str = Field(pattern=r"^\d{4}-\d{2}$")
    amount: float = Field(ge=0)
    member: str = "Common"  # Ashok | Manasa | Common — a budget per person per month


class Budget(BaseModel):
    id: str = Field(default_factory=_uuid)
    month: str
    amount: float
    member: str = "Common"


class AllowanceSet(BaseModel):
    month: str = Field(pattern=r"^\d{4}-\d{2}$")
    amount: float = Field(ge=0)
    member: str = "Common"


class Allowance(BaseModel):
    id: str = Field(default_factory=_uuid)
    month: str
    amount: float
    member: str = "Common"


# ---------- Summary / dashboard ----------

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


class IncomeBreakdown(BaseModel):
    ashok: float = 0.0
    manasa: float = 0.0
    rental: float = 0.0
    other: float = 0.0
    total: float = 0.0


class PersonalFund(BaseModel):
    allowance: float  # total fund across the scope (per member when scope=month)
    ashok_used: float = 0.0
    manasa_used: float = 0.0


class CardSpend(BaseModel):
    card_id: Optional[str] = None
    name: str
    bank: str = ""
    last4: str = ""
    type: str = ""
    owner: str = ""
    total: float = 0.0
    by_member: dict[str, float] = {}


class DashboardData(BaseModel):
    scope: str  # month | fy | cal
    key: str
    label: str
    view: str = "combined"  # personal | combined
    budget_by_member: dict[str, float] = {}
    income_by_source: List["IncomeSourceTotal"] = []
    income: IncomeBreakdown
    expense_total: float = 0.0
    budget: float = 0.0
    remaining: float = 0.0
    by_category: List[CategoryTotal] = []
    personal: PersonalFund
    cards: List[CardSpend] = []
    recent_expenses: List[Expense] = []


class IncomeSourceTotal(BaseModel):
    source: str
    source_type: str
    total: float


DashboardData.model_rebuild()
