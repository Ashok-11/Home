"""Expenses, income, budget, personal fund, cards spend and the scoped dashboard.

Scopes: month (YYYY-MM), fy (Indian financial year Apr–Mar, key = start year),
cal (calendar year, key = YYYY).
"""

import re
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pymongo import DESCENDING

from lib.db import db
from lib.dates import today_iso
from lib.session import require_user
from models.finance import (
    Allowance,
    AllowanceSet,
    Budget,
    BudgetSet,
    CardSpend,
    DashboardData,
    Expense,
    ExpenseCreate,
    FinanceSummary,
    Income,
    IncomeBreakdown,
    IncomeCreate,
    PersonalFund,
)

router = APIRouter(tags=["finance"])

DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
DEFAULT_ALLOWANCE = 15000.0
MEMBERS = ("Ashok", "Manasa", "Common")


def month_of(date: str) -> str:
    return date[:7]


def months_in_scope(scope: str, key: str) -> list[str]:
    """Every YYYY-MM covered by a scope key."""
    if scope == "month":
        return [key]
    if scope == "fy":  # key = starting year, Apr(key) .. Mar(key+1)
        year = int(key)
        return [f"{year}-{m:02d}" for m in range(4, 13)] + [f"{year + 1}-{m:02d}" for m in range(1, 4)]
    if scope == "cal":
        return [f"{int(key)}-{m:02d}" for m in range(1, 13)]
    raise HTTPException(status_code=422, detail="scope must be month, fy or cal")


def scope_label(scope: str, key: str) -> str:
    if scope == "month":
        return datetime.strptime(key, "%Y-%m").strftime("%B %Y")
    if scope == "fy":
        return f"FY {key}-{str(int(key) + 1)[2:]}"
    return f"Year {key}"


# ---------- Expenses ----------

@router.get("/expenses", response_model=list[Expense])
async def list_expenses(
    month: Optional[str] = None,
    category: Optional[str] = None,
    member: Optional[str] = None,
    source_id: Optional[str] = None,
    _: dict = Depends(require_user),
):
    query: dict = {"month": month or today_iso()[:7]}
    if category:
        query["category"] = category
    if member:
        query["member"] = member
    if source_id:
        query["source_id"] = source_id
    docs = await db.expenses.find(query).sort([("date", DESCENDING), ("created_at", DESCENDING)]).to_list(5000)
    return [Expense(**d) for d in docs]


@router.post("/expenses", response_model=Expense, status_code=201)
async def create_expense(body: ExpenseCreate, user: dict = Depends(require_user)):
    doc = Expense(**body.model_dump(), month=month_of(body.date), created_by=user["name"])
    await db.expenses.insert_one(doc.model_dump())
    return doc


@router.patch("/expenses/{expense_id}", response_model=Expense)
async def update_expense(expense_id: str, body: dict, _: dict = Depends(require_user)):
    doc = await db.expenses.find_one({"id": expense_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Expense not found")
    updates: dict = {}
    for field in ("amount", "category", "note", "member", "source_id", "source_label", "is_personal"):
        if field in body and body[field] is not None:
            updates[field] = body[field]
    if body.get("date"):
        if not DATE_RE.match(body["date"]):
            raise HTTPException(status_code=422, detail="date must be YYYY-MM-DD")
        updates["date"] = body["date"]
        updates["month"] = month_of(body["date"])
    if updates:
        await db.expenses.update_one({"id": expense_id}, {"$set": updates})
        doc.update(updates)
    return Expense(**doc)


@router.delete("/expenses/{expense_id}", status_code=204)
async def delete_expense(expense_id: str, _: dict = Depends(require_user)):
    result = await db.expenses.delete_one({"id": expense_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Expense not found")


# ---------- Income ----------

@router.get("/incomes", response_model=list[Income])
async def list_incomes(month: Optional[str] = None, _: dict = Depends(require_user)):
    docs = await db.incomes.find({"month": month or today_iso()[:7]}).sort("created_at", DESCENDING).to_list(500)
    return [Income(**d) for d in docs]


@router.post("/incomes", response_model=Income, status_code=201)
async def create_income(body: IncomeCreate, _: dict = Depends(require_user)):
    doc = Income(**body.model_dump(), month=month_of(body.date))
    await db.incomes.insert_one(doc.model_dump())
    return doc


@router.delete("/incomes/{income_id}", status_code=204)
async def delete_income(income_id: str, _: dict = Depends(require_user)):
    result = await db.incomes.delete_one({"id": income_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Income entry not found")


# ---------- Budget & personal allowance ----------

@router.put("/budget", response_model=Budget)
async def set_budget(body: BudgetSet, _: dict = Depends(require_user)):
    existing = await db.budgets.find_one({"month": body.month})
    if existing:
        await db.budgets.update_one({"month": body.month}, {"$set": {"amount": body.amount}})
        return Budget(id=existing["id"], month=body.month, amount=body.amount)
    doc = Budget(month=body.month, amount=body.amount)
    await db.budgets.insert_one(doc.model_dump())
    return doc


@router.get("/allowance", response_model=Allowance)
async def get_allowance(month: Optional[str] = None, _: dict = Depends(require_user)):
    month = month or today_iso()[:7]
    doc = await db.allowances.find_one({"month": month})
    if doc:
        return Allowance(**doc)
    return Allowance(id=f"default-{month}", month=month, amount=DEFAULT_ALLOWANCE)


@router.put("/allowance", response_model=Allowance)
async def set_allowance(body: AllowanceSet, _: dict = Depends(require_user)):
    existing = await db.allowances.find_one({"month": body.month})
    if existing:
        await db.allowances.update_one({"month": body.month}, {"$set": {"amount": body.amount}})
        return Allowance(id=existing["id"], month=body.month, amount=body.amount)
    doc = Allowance(month=body.month, amount=body.amount)
    await db.allowances.insert_one(doc.model_dump())
    return doc


# ---------- Legacy monthly summary (kept for the budget page) ----------

@router.get("/summary", response_model=FinanceSummary)
async def finance_summary(month: Optional[str] = None, _: dict = Depends(require_user)):
    month = month or today_iso()[:7]
    income_docs = await db.incomes.find({"month": month}).to_list(500)
    expense_docs = await db.expenses.find({"month": month}).to_list(5000)
    budget_doc = await db.budgets.find_one({"month": month})

    income_total = sum(i["amount"] for i in income_docs)
    expense_total = sum(e["amount"] for e in expense_docs)
    budget = budget_doc["amount"] if budget_doc else 0.0

    by_category: dict[str, float] = {}
    for e in expense_docs:
        by_category[e["category"]] = by_category.get(e["category"], 0.0) + e["amount"]
    categories = sorted(
        ({"category": c, "total": round(t, 2)} for c, t in by_category.items()),
        key=lambda row: row["total"],
        reverse=True,
    )
    recent = sorted(
        expense_docs,
        key=lambda d: (d["date"], d.get("created_at", datetime.now(timezone.utc))),
        reverse=True,
    )[:5]

    return FinanceSummary(
        month=month,
        income_total=round(income_total, 2),
        expense_total=round(expense_total, 2),
        budget=budget,
        remaining=round(budget - expense_total, 2),
        by_category=categories,
        recent_expenses=[Expense(**d) for d in recent],
    )


# ---------- Scoped dashboard ----------

@router.get("/dashboard", response_model=DashboardData)
async def dashboard(scope: str = "month", key: Optional[str] = None, _: dict = Depends(require_user)):
    today = today_iso()
    if not key:
        if scope == "month":
            key = today[:7]
        elif scope == "fy":
            year = int(today[:4])
            key = str(year if int(today[5:7]) >= 4 else year - 1)
        else:
            key = today[:4]
    months = months_in_scope(scope, key)

    income_docs = await db.incomes.find({"month": {"$in": months}}).to_list(2000)
    expense_docs = await db.expenses.find({"month": {"$in": months}}).to_list(20000)
    budget_docs = await db.budgets.find({"month": {"$in": months}}).to_list(200)
    allowance_docs = await db.allowances.find({"month": {"$in": months}}).to_list(200)
    card_docs = await db.cards.find().to_list(200)

    # income split by earner
    income = IncomeBreakdown()
    for i in income_docs:
        kind = i.get("source_type", "other")
        amount = i["amount"]
        if kind == "ashok":
            income.ashok += amount
        elif kind == "manasa":
            income.manasa += amount
        elif kind == "rental":
            income.rental += amount
        else:
            income.other += amount
    income.total = round(income.ashok + income.manasa + income.rental + income.other, 2)
    for field in ("ashok", "manasa", "rental", "other"):
        setattr(income, field, round(getattr(income, field), 2))

    expense_total = round(sum(e["amount"] for e in expense_docs), 2)
    budget = round(sum(b["amount"] for b in budget_docs), 2)

    # personal fund: per-member allowance for every month in scope (default 15k each)
    set_by_month = {a["month"]: a["amount"] for a in allowance_docs}
    allowance_total = round(sum(set_by_month.get(m, DEFAULT_ALLOWANCE) for m in months), 2)
    personal = PersonalFund(allowance=allowance_total)
    for e in expense_docs:
        if not e.get("is_personal"):
            continue
        if e.get("member") == "Ashok":
            personal.ashok_used += e["amount"]
        elif e.get("member") == "Manasa":
            personal.manasa_used += e["amount"]
    personal.ashok_used = round(personal.ashok_used, 2)
    personal.manasa_used = round(personal.manasa_used, 2)

    by_category_map: dict[str, float] = {}
    for e in expense_docs:
        by_category_map[e["category"]] = by_category_map.get(e["category"], 0.0) + e["amount"]
    by_category = sorted(
        ({"category": c, "total": round(t, 2)} for c, t in by_category_map.items()),
        key=lambda row: row["total"],
        reverse=True,
    )

    # spend per payment source, split by who spent it
    cards_by_id = {c["id"]: c for c in card_docs}
    spend: dict[str, CardSpend] = {}
    for e in expense_docs:
        sid = e.get("source_id") or "unassigned"
        if sid not in spend:
            card = cards_by_id.get(sid)
            spend[sid] = CardSpend(
                card_id=None if sid == "unassigned" else sid,
                name=card["name"] if card else (e.get("source_label") or "Unassigned"),
                bank=card.get("bank", "") if card else "",
                last4=card.get("last4", "") if card else "",
                type=card.get("type", "") if card else "",
                owner=card.get("owner", "") if card else "",
                total=0.0,
                by_member={m: 0.0 for m in MEMBERS},
            )
        row = spend[sid]
        row.total = round(row.total + e["amount"], 2)
        member = e.get("member", "Common")
        row.by_member[member] = round(row.by_member.get(member, 0.0) + e["amount"], 2)

    # include cards with no spend in scope so the user still sees them
    for card in card_docs:
        if card["id"] not in spend:
            spend[card["id"]] = CardSpend(
                card_id=card["id"],
                name=card["name"],
                bank=card.get("bank", ""),
                last4=card.get("last4", ""),
                type=card.get("type", ""),
                owner=card.get("owner", ""),
                total=0.0,
                by_member={m: 0.0 for m in MEMBERS},
            )

    recent = sorted(
        expense_docs,
        key=lambda d: (d["date"], d.get("created_at", datetime.now(timezone.utc))),
        reverse=True,
    )[:8]

    return DashboardData(
        scope=scope,
        key=key,
        label=scope_label(scope, key),
        income=income,
        expense_total=expense_total,
        budget=budget,
        remaining=round(budget - expense_total, 2),
        by_category=by_category,
        personal=personal,
        cards=sorted(spend.values(), key=lambda c: -c.total),
        recent_expenses=[Expense(**d) for d in recent],
    )
