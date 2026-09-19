"""Seed Manshok with the two household accounts and starter data.

Run: cd /app/backend && python seed.py
Idempotent per section. Set RESET=1 to wipe household data and reseed:
  cd /app/backend && RESET=1 python seed.py
"""

import asyncio
import os
from datetime import datetime, timedelta, timezone

from lib.db import db, ensure_indexes
from lib.dates import today_iso
from lib.session import hash_password

PASSWORD = "Manshok@1411"
MEMBERS = [
    {"name": "Ashok", "email": "ashokthulas@gmail.com", "password": PASSWORD},
    {"name": "Manasa", "email": "manasavenky29@gmail.com", "password": PASSWORD},
]

CARDS = [
    {"name": "HDFC Regalia", "bank": "HDFC Bank", "last4": "4412", "type": "credit", "owner": "Ashok"},
    {"name": "ICICI Amazon Pay", "bank": "ICICI Bank", "last4": "8830", "type": "credit", "owner": "Manasa"},
    {"name": "SBI Debit", "bank": "SBI", "last4": "2201", "type": "debit", "owner": "Common"},
    {"name": "Ashok UPI", "bank": "GPay", "last4": "", "type": "upi", "owner": "Ashok"},
    {"name": "Manasa UPI", "bank": "PhonePe", "last4": "", "type": "upi", "owner": "Manasa"},
    {"name": "Cash", "bank": "", "last4": "", "type": "cash", "owner": "Common"},
]

APPLIANCES = [
    {"name": "Geyser (Master bath)", "location": "Master bathroom", "service_interval_months": 12, "notes": "Racold 25L"},
    {"name": "Split AC (Bedroom)", "location": "Bedroom", "service_interval_months": 6, "notes": "Daikin 1.5T"},
    {"name": "Water Purifier", "location": "Kitchen", "service_interval_months": 4, "notes": "Kent RO — change filter"},
    {"name": "Washing Machine", "location": "Utility", "service_interval_months": 12, "notes": "IFB front load"},
    {"name": "Refrigerator", "location": "Kitchen", "service_interval_months": 12, "notes": "Samsung 253L"},
    {"name": "Chimney", "location": "Kitchen", "service_interval_months": 6, "notes": "Faber — deep clean"},
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
    {"title": "Water the plants", "assignee": "Common", "frequency": "Daily", "due_date": None, "area": "household"},
    {"title": "Pay electricity bill", "assignee": "Ashok", "frequency": "Monthly", "due_date": None, "area": "household"},
    {"title": "Grocery run", "assignee": "Manasa", "frequency": "Weekly", "due_date": None, "area": "household"},
    {"title": "Wash curtains", "assignee": "Common", "frequency": "Seasonal", "due_date": None, "area": "household"},
    {"title": "Prep breakfast batter", "assignee": "Manasa", "frequency": "Daily", "due_date": None, "area": "cooking"},
    {"title": "Clean the chimney filter", "assignee": "Ashok", "frequency": "Monthly", "due_date": None, "area": "cooking"},
    {"title": "Restock spice jars", "assignee": "Common", "frequency": "Weekly", "due_date": None, "area": "cooking"},
]


async def seed() -> None:
    await ensure_indexes()

    if os.environ.get("RESET") == "1":
        for coll in (
            "users", "sessions", "expenses", "incomes", "budgets", "allowances", "cards",
            "appliances", "service_records", "recipes", "menu_entries", "grocery_items",
            "chores", "copilot_messages",
        ):
            await db[coll].delete_many({})
        await ensure_indexes()
        print("reset: household data cleared")

    # --- drop any legacy demo accounts; the two real logins are canonical ---
    legacy = await db.users.delete_many(
        {"email": {"$nin": [m["email"] for m in MEMBERS]}}
    )
    if legacy.deleted_count:
        await db.sessions.delete_many({})
        print(f"removed {legacy.deleted_count} legacy account(s)")

    # --- members (upsert so the password is always the canonical one) ---
    for m in MEMBERS:
        await db.users.update_one(
            {"email": m["email"]},
            {
                "$set": {
                    "id": m["email"],
                    "name": m["name"],
                    "email": m["email"],
                    "password_hash": hash_password(m["password"]),
                }
            },
            upsert=True,
        )
    print(f"ensured {len(MEMBERS)} members")

    # --- payment sources ---
    if await db.cards.count_documents({}) == 0:
        now = datetime.now(timezone.utc)
        await db.cards.insert_many(
            [
                {**c, "id": f"card-{i}", "created_at": now + timedelta(seconds=i)}
                for i, c in enumerate(CARDS)
            ]
        )
        print(f"seeded {len(CARDS)} payment sources")

    # --- appliances ---
    if await db.appliances.count_documents({}) == 0:
        now = datetime.now(timezone.utc)
        today = today_iso()
        docs = []
        for i, a in enumerate(APPLIANCES):
            last = f"{int(today[:4]) - (1 if i % 2 else 0)}-{str(((i * 3) % 12) + 1).zfill(2)}-12"
            docs.append({**a, "id": f"appliance-{i}", "last_serviced_on": last, "created_at": now + timedelta(seconds=i)})
        await db.appliances.insert_many(docs)
        print(f"seeded {len(docs)} appliances")

    # --- recipes ---
    if await db.recipes.count_documents({}) == 0:
        now = datetime.now(timezone.utc)
        docs = []
        for r in RECIPES:
            doc = {**r}
            doc["id"] = doc["name"].lower().replace(" ", "-").replace("(", "").replace(")", "")
            doc["created_by"] = "Ashok"
            doc["created_at"] = now
            docs.append(doc)
        await db.recipes.insert_many(docs)
        print(f"seeded {len(docs)} recipes")

    month = today_iso()[:7]

    if await db.budgets.count_documents({}) == 0:
        await db.budgets.insert_one({"id": f"budget-{month}", "month": month, "amount": 60000.0})
        print("seeded budget")

    if await db.allowances.count_documents({}) == 0:
        await db.allowances.insert_one({"id": f"allowance-{month}", "month": month, "amount": 15000.0})
        print("seeded personal fund (₹15,000)")

    if await db.incomes.count_documents({}) == 0:
        now = datetime.now(timezone.utc)
        await db.incomes.insert_many(
            [
                {"id": "inc-ashok", "source": "Ashok — Salary", "source_type": "ashok", "amount": 145000.0, "date": f"{month}-01", "month": month, "created_at": now},
                {"id": "inc-manasa", "source": "Manasa — Salary", "source_type": "manasa", "amount": 98000.0, "date": f"{month}-01", "month": month, "created_at": now},
                {"id": "inc-rental", "source": "Flat rent", "source_type": "rental", "amount": 22000.0, "date": f"{month}-05", "month": month, "created_at": now},
                {"id": "inc-other", "source": "FD interest", "source_type": "other", "amount": 6500.0, "date": f"{month}-07", "month": month, "created_at": now},
            ]
        )
        print("seeded income (Ashok / Manasa / rental / other)")

    if await db.expenses.count_documents({}) == 0:
        today = today_iso()
        rows = [
            ("Groceries", 2480.0, "Weekly vegetable + provision run", "Manasa", "card-1", "ICICI Amazon Pay", False),
            ("Dining Out", 1450.0, "Saturday biryani night", "Ashok", "card-0", "HDFC Regalia", False),
            ("Utilities", 2100.0, "Electricity bill", "Ashok", "card-0", "HDFC Regalia", False),
            ("Transport", 650.0, "Auto + fuel", "Common", "card-3", "Ashok UPI", False),
            ("Groceries", 1320.0, "Milk, curd, paneer", "Manasa", "card-4", "Manasa UPI", False),
            ("Healthcare", 900.0, "Pharmacy", "Manasa", "card-2", "SBI Debit", False),
            ("Home Maintenance", 3200.0, "Plumber visit", "Ashok", "card-5", "Cash", False),
            ("Personal", 1800.0, "Ashok — books & coffee", "Ashok", "card-3", "Ashok UPI", True),
            ("Personal", 2400.0, "Manasa — salon", "Manasa", "card-4", "Manasa UPI", True),
            ("Kids", 1500.0, "Stationery", "Common", "card-1", "ICICI Amazon Pay", False),
        ]
        docs = []
        for i, (cat, amt, note, member, sid, slabel, personal) in enumerate(rows):
            date = min(today, f"{month}-{str(2 + i * 2).zfill(2)}")
            docs.append(
                {
                    "id": f"exp-seed-{i}",
                    "amount": amt,
                    "category": cat,
                    "note": note,
                    "date": date,
                    "month": month,
                    "member": member,
                    "source_id": sid,
                    "source_label": slabel,
                    "is_personal": personal,
                    "created_by": member,
                    "created_at": datetime.now(timezone.utc) + timedelta(minutes=i),
                }
            )
        await db.expenses.insert_many(docs)
        print(f"seeded {len(docs)} expenses")

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
            if not recipe:
                continue
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
        if docs:
            await db.menu_entries.insert_many(docs)
            print(f"seeded {len(docs)} menu entries")

    if await db.grocery_items.count_documents({}) == 0:
        now = datetime.now(timezone.utc)
        await db.grocery_items.insert_many(
            [
                {**g, "id": f"grocery-{i}", "checked": i % 2 == 0, "source": "manual", "created_at": now + timedelta(minutes=i)}
                for i, g in enumerate(GROCERY)
            ]
        )
        print("seeded grocery items")

    if await db.chores.count_documents({}) == 0:
        now = datetime.now(timezone.utc)
        await db.chores.insert_many(
            [
                {**c, "id": f"chore-{i}", "done": False, "created_at": now + timedelta(minutes=i)}
                for i, c in enumerate(CHORES)
            ]
        )
        print("seeded chores (cooking + household)")

    print("seed complete")


if __name__ == "__main__":
    asyncio.run(seed())
