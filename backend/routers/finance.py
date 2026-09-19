"""Expenses, income, monthly budget and the household finance summary."""

import re
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pymongo import DESCENDING

from lib.db import db
from lib.dates import today_iso
from lib.session import require_user
from models.finance import (
    Budget,
    BudgetSet,
    Expense,
    ExpenseCreate,
    FinanceSummary,
    Income,
    IncomeCreate,
)

router = APIRouter(tags=["finance"])

DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def month_of(date: str) -> str:
    return date[:7]


# ---------- Expenses ----------

@router.get("/expenses", response_model=list[Expense])
async def list_expenses(
    month: Optional[str] = None,
    category: Optional[str] = None,
    member: Optional[str] = None,
    _: dict = Depends(require_user),
):
    query: dict = {"month": month or today_iso()[:7]}
    if category:
        query["category"] = category
    if member:
        query["member"] = member
    docs = await db.expenses.find(query).sort([("date", DESCENDING), ("created_at", DESCENDING)]).to_list(2000)
    return [Expense(**d) for d in docs]


@router.post("/expenses", response_model=Expense, status_code=201)
async def create_expense(body: ExpenseCreate, user: dict = Depends(require_user)):
    doc = Expense(
        **body.model_dump(),
        month=month_of(body.date),
        created_by=user["name"],
    )
    await db.expenses.insert_one(doc.model_dump())
    return doc


@router.patch("/expenses/{expense_id}", response_model=Expense)
async def update_expense(expense_id: str, body: dict, _: dict = Depends(require_user)):
    doc = await db.expenses.find_one({"id": expense_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Expense not found")
    updates = {}
    for field in ("amount", "category", "note", "member"):
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


# ---------- Budget ----------

@router.put("/budget", response_model=Budget)
async def set_budget(body: BudgetSet, _: dict = Depends(require_user)):
    existing = await db.budgets.find_one({"month": body.month})
    if existing:
        await db.budgets.update_one({"month": body.month}, {"$set": {"amount": body.amount}})
        return Budget(id=existing["id"], month=body.month, amount=body.amount)
    doc = Budget(month=body.month, amount=body.amount)
    await db.budgets.insert_one(doc.model_dump())
    return doc


# ---------- Summary ----------

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

    recent = sorted(expense_docs, key=lambda d: (d["date"], d.get("created_at", datetime.now(timezone.utc))), reverse=True)[:5]

    return FinanceSummary(
        month=month,
        income_total=round(income_total, 2),
        expense_total=round(expense_total, 2),
        budget=budget,
        remaining=round(budget - expense_total, 2),
        by_category=categories,
        recent_expenses=[Expense(**d) for d in recent],
    )
