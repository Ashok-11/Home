"""Seed HomeBoard with the household accounts and starter data.

Run: cd /app/backend && python seed.py
Idempotent — every section skips itself if its data already exists.
"""

import asyncio
from datetime import datetime, timedelta, timezone

from lib.db import db, ensure_indexes
from lib.dates import today_iso
from lib.session import hash_password

MEMBERS = [
    {"name": "Husband", "email": "husband@homeboard.app", "password": "kitchen123"},
    {"name": "Wife", "email": "wife@homeboard.app", "password": "kitchen123"},
]

RECIPES = [
    {
        "name": "Paneer Butter Masala",
        "description": "Rich, creamy tomato gravy with soft paneer cubes — the weekend favourite.",
        "category": "Main Course",
        "base_servings": 2,
        "prep_minutes": 15,
        "cook_minutes": 30,
        "ingredients": [
            {"qty": 200, "unit": "g", "name": "Paneer"},
            {"qty": 300, "unit": "g", "name": "Tomato"},
            {"qty": 2, "unit": "tbsp", "name": "Butter"},
            {"qty": 1, "unit": "tbsp", "name": "Cream"},
            {"qty": 1, "unit": "tsp", "name": "Kashmiri chilli powder"},
            {"qty": 50, "unit": "g", "name": "Onion"},
            {"qty": 1, "unit": "tsp", "name": "Ginger garlic paste"},
        ],
        "steps": [
            "Blanch tomatoes and blend into a smooth puree.",
            "Saute onion in butter, add ginger garlic paste and puree; cook 10 minutes.",
            "Add chilli powder, cream and paneer cubes; simmer 5 minutes.",
            "Finish with a knob of butter and serve hot with naan or rice.",
        ],
    },
    {
        "name": "Vegetable Biryani",
        "description": "Fragrant basmati layered with spiced vegetables and saffron.",
        "category": "Rice",
        "base_servings": 4,
        "prep_minutes": 25,
        "cook_minutes": 45,
        "ingredients": [
            {"qty": 400, "unit": "g", "name": "Basmati rice"},
            {"qty": 200, "unit": "g", "name": "Mixed vegetables"},
            {"qty": 150, "unit": "g", "name": "Onion"},
            {"qty": 100, "unit": "g", "name": "Curd"},
            {"qty": 2, "unit": "tbsp", "name": "Biryani masala"},
            {"qty": 1, "unit": "pinch", "name": "Saffron"},
            {"qty": 3, "unit": "tbsp", "name": "Ghee"},
        ],
        "steps": [
            "Soak the rice 20 minutes; parboil with whole spices.",
            "Fry onions till golden; add vegetables, curd and biryani masala; cook till tender.",
            "Layer rice and gravy in a heavy pot; drizzle saffron milk and ghee.",
            "Seal and dum on low heat 15 minutes; rest before opening.",
        ],
    },
    {
        "name": "Dal Tadka",
        "description": "Comforting yellow dal with a ghee-garlic tempering.",
        "category": "Main Course",
        "base_servings": 3,
        "prep_minutes": 10,
        "cook_minutes": 25,
        "ingredients": [
            {"qty": 200, "unit": "g", "name": "Toor dal"},
            {"qty": 1, "unit": "tsp", "name": "Turmeric powder"},
            {"qty": 2, "unit": "tbsp", "name": "Ghee"},
            {"qty": 4, "unit": "piece", "name": "Garlic clove"},
            {"qty": 1, "unit": "tsp", "name": "Cumin seeds"},
            {"qty": 2, "unit": "piece", "name": "Dried red chilli"},
            {"qty": 50, "unit": "g", "name": "Tomato"},
        ],
        "steps": [
            "Pressure-cook dal with turmeric and water until soft.",
            "Whisk smooth; simmer with salt and chopped tomato.",
            "Heat ghee; crackle cumin, garlic and red chilli.",
            "Pour the tadka over the dal and serve with rice.",
        ],
    },
    {
        "name": "Aloo Paratha",
        "description": "Flaky whole-wheat flatbreads stuffed with spiced potato mash.",
        "category": "Breakfast",
        "base_servings": 2,
        "prep_minutes": 20,
        "cook_minutes": 20,
        "ingredients": [
            {"qty": 250, "unit": "g", "name": "Whole wheat flour"},
            {"qty": 200, "unit": "g", "name": "Potato"},
            {"qty": 1, "unit": "tsp", "name": "Ajwain"},
            {"qty": 1, "unit": "tsp", "name": "Red chilli powder"},
            {"qty": 2, "unit": "tbsp", "name": "Coriander leaves"},
            {"qty": 3, "unit": "tbsp", "name": "Ghee"},
        ],
        "steps": [
            "Knead a soft dough and rest 15 minutes.",
            "Mix mashed potato with spices and coriander.",
            "Stuff, roll gently and roast on tawa with ghee till golden spots appear.",
        ],
    },
    {
        "name": "Chicken Curry",
        "description": "Weeknight chicken in an onion-tomato gravy, medium spice.",
        "category": "Main Course",
        "base_servings": 3,
        "prep_minutes": 15,
        "cook_minutes": 35,
        "ingredients": [
            {"qty": 500, "unit": "g", "name": "Chicken"},
            {"qty": 150, "unit": "g", "name": "Onion"},
            {"qty": 150, "unit": "g", "name": "Tomato"},
            {"qty": 1, "unit": "tbsp", "name": "Ginger garlic paste"},
            {"qty": 1, "unit": "tbsp", "name": "Coriander powder"},
            {"qty": 2, "unit": "tbsp", "name": "Oil"},
            {"qty": 100, "unit": "g", "name": "Curd"},
        ],
        "steps": [
            "Marinate chicken in curd and spices for 20 minutes.",
            "Brown onions, add ginger garlic paste and tomato; cook till oil separates.",
            "Add chicken; sear then simmer covered 20 minutes.",
            "Rest 5 minutes, garnish with coriander and serve.",
        ],
    },
    {
        "name": "Rava Upma",
        "description": "Quick savoury semolina breakfast with vegetables and curry leaves.",
        "category": "Breakfast",
        "base_servings": 2,
        "prep_minutes": 10,
        "cook_minutes": 15,
        "ingredients": [
            {"qty": 150, "unit": "g", "name": "Rava (semolina)"},
            {"qty": 50, "unit": "g", "name": "Mixed vegetables"},
            {"qty": 1, "unit": "tsp", "name": "Mustard seeds"},
            {"qty": 2, "unit": "piece", "name": "Curry leaves"},
            {"qty": 1, "unit": "piece", "name": "Green chilli"},
            {"qty": 1, "unit": "tbsp", "name": "Oil"},
        ],
        "steps": [
            "Dry-roast rava till nutty; set aside.",
            "Temper mustard, curry leaves and chilli in oil; saute vegetables.",
            "Add water (2.5x rava), salt; rain in rava stirring continuously.",
            "Cover 3 minutes, fluff and serve with chutney.",
        ],
    },
]

GROCERY = [
    {"name": "milk", "qty": 2, "unit": "l", "aisle": "Dairy"},
    {"name": "tomato", "qty": 1, "unit": "kg", "aisle": "Vegetables & Greens"},
    {"name": "basmati rice", "qty": 1, "unit": "kg", "aisle": "Spices & Staples"},
    {"name": "dish wash bar", "qty": 2, "unit": "piece", "aisle": "Household & Cleaning"},
]

CHORES = [
    {"title": "Water the plants", "assignee": "Shared", "frequency": "Daily", "due_date": None},
    {"title": "Pay electricity bill", "assignee": "Husband", "frequency": "Monthly", "due_date": None},
    {"title": "Grocery run", "assignee": "Wife", "frequency": "Weekly", "due_date": None},
    {"title": "Wash curtains", "assignee": "Shared", "frequency": "Seasonal", "due_date": None},
]


async def seed() -> None:
    await ensure_indexes()

    # --- one-time migration: reserved-domain .local emails broke login validation ---
    old = await db.users.delete_many({"email": {"$in": ["husband@homeboard.local", "wife@homeboard.local"]}})
    if old.deleted_count:
        await db.sessions.delete_many({})  # sessions referenced the old user ids

    # --- members (skip if any user exists) ---
    if await db.users.count_documents({}) == 0:
        for m in MEMBERS:
            await db.users.insert_one(
                {
                    "id": m["email"],
                    "name": m["name"],
                    "email": m["email"],
                    "password_hash": hash_password(m["password"]),
                }
            )
        print(f"seeded {len(MEMBERS)} members")

    # --- recipes ---
    if await db.recipes.count_documents({}) == 0:
        now = datetime.now(timezone.utc)
        docs = []
        for r in RECIPES:
            doc = {**r}
            doc["id"] = doc["name"].lower().replace(" ", "-").replace("(", "").replace(")", "")
            doc["created_by"] = "Husband"
            doc["created_at"] = now
            docs.append(doc)
        await db.recipes.insert_many(docs)
        print(f"seeded {len(docs)} recipes")

    # --- budget + income + expenses for the current month ---
    month = today_iso()[:7]
    if await db.budgets.count_documents({}) == 0:
        await db.budgets.insert_one({"id": f"budget-{month}", "month": month, "amount": 60000.0})
        print("seeded budget")

    if await db.incomes.count_documents({}) == 0:
        await db.incomes.insert_many(
            [
                {"id": "inc-salary-1", "source": "Salary (Husband)", "amount": 120000.0, "date": f"{month}-01", "month": month, "created_at": datetime.now(timezone.utc)},
                {"id": "inc-salary-2", "source": "Salary (Wife)", "amount": 85000.0, "date": f"{month}-01", "month": month, "created_at": datetime.now(timezone.utc)},
                {"id": "inc-rental", "source": "Rental income", "amount": 15000.0, "date": f"{month}-05", "month": month, "created_at": datetime.now(timezone.utc)},
            ]
        )
        print("seeded income")

    if await db.expenses.count_documents({}) == 0:
        today = today_iso()
        rows = [
            ("Groceries", 2480.0, "Weekly vegetable + provision run", "Wife"),
            ("Dining Out", 1450.0, "Saturday biryani night", "Husband"),
            ("Utilities", 2100.0, "Electricity bill", "Husband"),
            ("Transport", 650.0, "Auto + fuel", "Shared"),
            ("Groceries", 1320.0, "Milk, curd, paneer", "Wife"),
            ("Healthcare", 900.0, "Pharmacy", "Wife"),
            ("Home Maintenance", 3200.0, "Plumber visit", "Husband"),
            ("Misc", 400.0, "Temple offering", "Shared"),
        ]
        docs = []
        for i, (cat, amt, note, member) in enumerate(rows):
            date = min(today, f"{month}-{str(3 + i * 3).zfill(2)}")
            docs.append(
                {
                    "id": f"exp-seed-{i}",
                    "amount": amt,
                    "category": cat,
                    "note": note,
                    "date": date,
                    "month": month,
                    "member": member,
                    "created_by": member,
                    "created_at": datetime.now(timezone.utc) + timedelta(minutes=i),
                }
            )
        await db.expenses.insert_many(docs)
        print(f"seeded {len(docs)} expenses")

    # --- menu for today + tomorrow ---
    if await db.menu_entries.count_documents({}) == 0:
        today = today_iso()
        tomorrow = (datetime.now(timezone.utc) + timedelta(days=1)).strftime("%Y-%m-%d")
        entries = [
            ("breakfast", "aloo-paratha", 2, today, "With fresh curd"),
            ("lunch", "dal-tadka", 3, today, ""),
            ("dinner", "paneer-butter-masala", 2, today, "Less spicy"),
            ("breakfast", "rava-upma", 2, tomorrow, ""),
            ("lunch", "vegetable-biryani", 4, tomorrow, "Raita on the side"),
            ("dinner", "chicken-curry", 3, tomorrow, ""),
        ]
        docs = []
        now = datetime.now(timezone.utc)
        for i, (slot, recipe_id, servings, date, notes) in enumerate(entries):
            recipe = await db.recipes.find_one({"id": recipe_id})
            docs.append(
                {
                    "id": f"menu-{i}-{date}",
                    "date": date,
                    "slot": slot,
                    "recipe_id": recipe_id,
                    "recipe_name": recipe["name"],
                    "servings": servings,
                    "notes": notes,
                    "created_at": now + timedelta(minutes=i),
                }
            )
        await db.menu_entries.insert_many(docs)
        print(f"seeded {len(docs)} menu entries")

    # --- grocery items ---
    if await db.grocery_items.count_documents({}) == 0:
        now = datetime.now(timezone.utc)
        await db.grocery_items.insert_many(
            [
                {**g, "id": f"grocery-{i}", "checked": i % 2 == 0, "source": "manual", "created_at": now + timedelta(minutes=i)}
                for i, g in enumerate(GROCERY)
            ]
        )
        print("seeded grocery items")

    # --- chores ---
    if await db.chores.count_documents({}) == 0:
        now = datetime.now(timezone.utc)
        await db.chores.insert_many(
            [
                {**c, "id": f"chore-{i}", "done": False, "created_at": now + timedelta(minutes=i)}
                for i, c in enumerate(CHORES)
            ]
        )
        print("seeded chores")

    print("seed complete")


if __name__ == "__main__":
    asyncio.run(seed())
