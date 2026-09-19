"""Gemini-powered household intelligence using Google's official SDK.

- POST /ai/parse-expenses : natural-language text -> expense drafts (non-streaming JSON)
- POST /ai/recipe-ideas   : prompt -> recipe drafts for the vault (non-streaming JSON)
- POST /ai/plan-menu      : fill empty slots for a week from the recipe vault (non-streaming JSON)
- POST /ai/copilot        : kitchen copilot chat (SSE token stream, history in Mongo)
"""

import json
import os
import uuid
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
import google.generativeai as genai

from lib.db import db
from lib.dates import today_iso
from lib.session import require_user

router = APIRouter(prefix="/ai", tags=["ai"])

GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-2.0-flash-exp")

CATEGORIES = [
    "Groceries", "Utilities", "Maid/Cook Salary", "Dining Out", "Home Maintenance",
    "Kids", "Healthcare", "Transport", "Misc",
]


def _api_key() -> str:
    key = os.environ.get("GEMINI_API_KEY")
    if not key:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY is not configured")
    return key


def _get_model(system_message: str = None):
    """Get configured Gemini model"""
    genai.configure(api_key=_api_key())
    generation_config = {
        "temperature": 0.7,
        "top_p": 0.95,
        "top_k": 40,
        "max_output_tokens": 8192,
    }
    
    if system_message:
        return genai.GenerativeModel(
            model_name=GEMINI_MODEL,
            generation_config=generation_config,
            system_instruction=system_message
        )
    else:
        return genai.GenerativeModel(
            model_name=GEMINI_MODEL,
            generation_config=generation_config
        )


def _extract_json(raw: str) -> object:
    text = raw.strip()
    if text.startswith("```"):
        text = text.split("```", 2)[1]
        if text[:4].lower() == "json":
            text = text[4:]
    first = min((i for i in (text.find("["), text.find("{")) if i != -1), default=-1)
    if first == -1:
        raise HTTPException(status_code=502, detail="AI returned an unparseable response")
    last = max(text.rfind("]"), text.rfind("}"))
    try:
        return json.loads(text[first : last + 1])
    except json.JSONDecodeError:
        raise HTTPException(status_code=502, detail="AI returned an unparseable response")


# ---------- Smart expense entry ----------

class ParseExpensesRequest(BaseModel):
    text: str = Field(min_length=3)
    date: str = Field(pattern=r"^\d{4}-\d{2}-\d{2}$")


class ParsedExpense(BaseModel):
    amount: float = Field(gt=0)
    category: str
    note: str = ""
    date: str = Field(pattern=r"^\d{4}-\d{2}-\d{2}$")


@router.post("/parse-expenses", response_model=list[ParsedExpense])
async def parse_expenses(body: ParseExpensesRequest, _: dict = Depends(require_user)):
    system = (
        "You extract household expense entries from informal Indian-English text. "
        f"Allowed categories: {CATEGORIES}. "
        f"The entry date defaults to {body.date}. Each expense is an object with fields: "
        '\''amount'\'' (number, INR), '\''category'\'' (one of the allowed list), '\''note'\'' (short label, <=60 chars), '
        ''\''date'\'' (YYYY-MM-DD). Split multiple purchases into separate objects. '
        '\''Reply with ONLY a JSON array, no markdown, no commentary. If nothing is parseable reply [].'\''
    )
    model = _get_model(system)
    response = await model.generate_content_async(body.text)
    raw = response.text
    rows = _extract_json(raw)
    if not isinstance(rows, list):
        raise HTTPException(status_code=502, detail="AI returned an unexpected shape")
    parsed = []
    for row in rows[:20]:
        try:
            item = ParsedExpense(**row)
            if item.category not in CATEGORIES:
                item = item.model_copy(update={"category": "Misc"})
            parsed.append(item)
        except Exception:
            continue
    return parsed


# ---------- AI recipe ideas ----------

class RecipeIdeaRequest(BaseModel):
    prompt: str = ""
    count: int = Field(default=3, ge=1, le=5)


class IngredientDraft(BaseModel):
    qty: float = Field(gt=0)
    unit: str = "piece"
    name: str


class RecipeDraft(BaseModel):
    name: str
    description: str = ""
    category: str = "Main Course"
    base_servings: int = Field(default=2, ge=1)
    prep_minutes: int = Field(default=0, ge=0)
    cook_minutes: int = Field(default=0, ge=0)
    ingredients: List[IngredientDraft] = []
    steps: List[str] = []


@router.post("/recipe-ideas", response_model=list[RecipeDraft])
async def recipe_ideas(body: RecipeIdeaRequest, _: dict = Depends(require_user)):
    system = (
        "You create home-kitchen recipes for an Indian household. "
        '\''Each recipe: name, description (1 sentence), category (Breakfast, Main Course, Rice, Side, Dessert, Snack), '
        '\''base_servings (2-4), prep_minutes, cook_minutes, ingredients (objects: qty number, unit from g/ml/kg/l/tbsp/tsp/cup/piece/pinch), '
        '\''steps (4-6 short strings). Reply with ONLY a JSON array of recipes, no markdown.'\''
    )
    user_text = f"Give me {body.count} recipe ideas. {body.prompt}".strip()
    model = _get_model(system)
    response = await model.generate_content_async(user_text)
    raw = response.text
    drafts = _extract_json(raw)
    if not isinstance(drafts, list):
        raise HTTPException(status_code=502, detail="AI returned an unexpected shape")
    out = []
    for draft in drafts[: body.count]:
        try:
            out.append(RecipeDraft(**draft))
        except Exception:
            continue
    if not out:
        raise HTTPException(status_code=502, detail="AI returned no usable recipes — try again")
    return out


# ---------- AI week menu ----------

class PlanMenuRequest(BaseModel):
    start_date: str = Field(pattern=r"^\d{4}-\d{2}-\d{2}$")


@router.post("/plan-menu", response_model=dict)
async def plan_menu(body: PlanMenuRequest, _: dict = Depends(require_user)):
    from datetime import timedelta

    vault = await db.recipes.find().to_list(500)
    if not vault:
        raise HTTPException(status_code=400, detail="Add a few recipes to the vault first")
    names = [r["name"] for r in vault]
    dates = [(datetime.fromisoformat(body.start_date) + timedelta(days=i)).strftime("%Y-%m-%d") for i in range(7)]

    system = (
        "You plan a weekly home menu. Use ONLY these recipes: "
        f"{names}. Slots: breakfast, lunch, snacks, dinner. "
        '\''Reply with ONLY a JSON array of objects {date, slot, recipe_name} — 2 to 3 entries per day, '
        f"dates from this list: {dates}. No markdown.'\''
    )
    user_text = f"Plan the week starting {body.start_date}."
    model = _get_model(system)
    response = await model.generate_content_async(user_text)
    raw = response.text
    plans = _extract_json(raw)
    if not isinstance(plans, list):
        raise HTTPException(status_code=502, detail="AI returned an unexpected shape")

    by_name = {r["name"].lower(): r for r in vault}
    existing = await db.menu_entries.find({"date": {"$in": dates}}).to_list(1000)
    taken = {(e["date"], e["slot"]) for e in existing}
    created = 0
    now = datetime.now(timezone.utc)
    for plan in plans:
        try:
            date, slot, name = plan["date"], plan["slot"], plan["recipe_name"]
        except Exception:
            continue
        if date not in dates or slot not in ("breakfast", "lunch", "snacks", "dinner"):
            continue
        recipe = by_name.get(str(name).lower())
        if not recipe or (date, slot) in taken:
            continue
        taken.add((date, slot))
        doc = {
            "id": str(uuid.uuid4()),
            "date": date,
            "slot": slot,
            "recipe_id": recipe["id"],
            "recipe_name": recipe["name"],
            "servings": max(recipe.get("base_servings", 2), 2),
            "notes": "",
            "created_at": now,
        }
        await db.menu_entries.insert_one(doc)
        created += 1
    return {"created": created}


# ---------- Kitchen copilot (SSE streaming) ----------

class CopilotRequest(BaseModel):
    message: str = Field(min_length=1)


@router.get("/copilot/history", response_model=list[dict])
async def copilot_history(_: dict = Depends(require_user)):
    docs = await db.copilot_messages.find().sort("created_at", -1).to_list(50)
    return [{"role": d["role"], "content": d["content"], "created_at": d.get("created_at")} for d in reversed(docs)]


async def _household_context() -> str:
    month = today_iso()[:7]
    income_docs = await db.incomes.find({"month": month}).to_list(500)
    expense_docs = await db.expenses.find({"month": month}).to_list(5000)
    budget_doc = await db.budgets.find_one({"month": month})
    income_total = sum(i["amount"] for i in income_docs)
    expense_total = sum(e["amount"] for e in expense_docs)
    budget = budget_doc["amount"] if budget_doc else 0.0
    by_cat: dict[str, float] = {}
    for e in expense_docs:
        by_cat[e["category"]] = by_cat.get(e["category"], 0.0) + e["amount"]
    top = ", ".join(f"{c} ?{t:,.0f}" for c, t in sorted(by_cat.items(), key=lambda kv: -kv[1])[:5]) or "none yet"
    today = today_iso()
    menu = await db.menu_entries.find({"date": today}).to_list(50)
    menu_txt = "; ".join(f"{e['\''slot'\'']} {e['\''recipe_name'\'']} x{e['\''servings'\'']}" for e in menu) or "nothing planned"
    pending = await db.chores.count_documents({"done": False})
    return (
        f"Today is {today}. This month ({month}): income ?{income_total:,.0f}, spent ?{expense_total:,.0f}, "
        f"budget ?{budget:,.0f}. Top spend categories: {top}. Today'\''s menu: {menu_txt}. "
        f"{pending} chores pending."
    )


@router.post("/copilot")
async def copilot(body: CopilotRequest, user: dict = Depends(require_user)):
    context = await _household_context()
    system = (
        "You are HomeBoard'\''s copilot for a household in India. You answer questions about the family'\''s "
        "expenses, budget, menu, recipes, groceries and chores using ONLY the household data below — "
        "never invent numbers. Be warm, concise (<=120 words), and use ? with Indian digit grouping. "
        f"HOUSEHOLD DATA: {context}"
    )

    async def event_stream():
        yield f"data: {json.dumps({'\''delta'\'': '\'''\'})}\n\n"
        full: list[str] = []
        model = _get_model(system)
        try:
            response = model.generate_content(body.message, stream=True)
            for chunk in response:
                if chunk.text:
                    full.append(chunk.text)
                    yield f"data: {json.dumps({'\''delta'\'': chunk.text})}\n\n"
        except Exception as exc:
            yield f"data: {json.dumps({'\''error'\'': str(exc)})}\n\n"
        yield "data: [DONE]\n\n"
        stamp = datetime.now(timezone.utc)
        await db.copilot_messages.insert_many(
            [
                {"id": str(uuid.uuid4()), "role": "user", "content": body.message, "created_at": stamp},
                {"id": str(uuid.uuid4()), "role": "assistant", "content": "".join(full), "created_at": stamp},
            ]
        )

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
