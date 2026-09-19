# HomeBoard — Living Spec

A warm, high-graphics household manager for a two-member family (husband + wife) with a
public cook view. Currency INR (₹, en-IN grouping). Dates as `YYYY-MM-DD` strings;
"today" anchored server-side via `lib/dates.py`.

## Auth
- Email + password, httpOnly cookie sessions (`hb_session`, 30d, `/api/auth/*`).
- Invite-only: max 2 users (seeded: `husband@homeboard.app` / `wife@homeboard.app`,
  password `kitchen123`). Signup returns 403 once 2 exist.
- Protected routes use the `require_user` FastAPI dependency. `/cook/**` is PUBLIC.

## Data model (Mongo, string uuid `id`s, no ObjectId)
- `users` (name, email unique, password_hash) · `sessions` (token, user_id, expires_at TTL)
- `expenses` (amount, category, note, date, month, member, created_by) — categories:
  Groceries, Utilities, Maid/Cook Salary, Dining Out, Home Maintenance, Kids, Healthcare,
  Transport, Misc
- `incomes` (source, amount, date, month) · `budgets` (month unique, amount)
- `recipes` (name, category, base_servings, prep/cook_minutes, ingredients[{qty,unit,name}], steps[])
- `menu_entries` (date, slot breakfast|lunch|snacks|dinner, recipe_id, recipe_name denormalised,
  servings, notes) — ingredient scaling: qty × servings / base_servings
- `grocery_items` (name, qty, unit, aisle, checked, source menu|manual)
- `chores` (title, assignee, frequency, due_date, done) · `copilot_messages` (role, content)

## Key flows
- Dashboard `/dashboard`: month summary (income/spent/remaining), donut by category,
  today's menu, recent expenses, pending chores.
- Expenses `/expenses`: month nav, category/member filters, add/edit dialog, delete.
  **AI smart entry**: free text → `POST /api/ai/parse-expenses` → editable drafts → save all.
- Budget `/budget`: set monthly budget (`PUT /api/budget`), income entries, progress bar,
  net savings, category bars.
- Menu planner `/menu`: week grid × 4 slots, picker dialog (recipe/servings/notes),
  **AI week menu** (`POST /api/ai/plan-menu` fills empty slots from the vault),
  **Generate grocery list** (`POST /api/grocery/generate` aggregates scaled ingredients,
  replaces unchecked auto items — idempotent).
- Recipes `/recipes`: cards, create/edit sheet (dynamic ingredient rows + steps), detail
  dialog with servings scaler, **AI ideas** (`POST /api/ai/recipe-ideas` → save to vault).
- Grocery `/grocery`: aisle-grouped checklist, manual add, toggle, clear checked.
- Chores `/chores`: cards with assignee/frequency/due (overdue tint), toggle, delete.
- Copilot `/copilot`: streaming chat (`POST /api/ai/copilot`, SSE) grounded in the live
  household context (month summary + today's menu + pending chores); history in Mongo.
- Cook view `/cook` (+ `/cook/:date`): PUBLIC — hero header, day nav, servings stepper
  scaling ingredients, tap-to-check steps, print. Link to share with the cook.

## AI (Gemini via Emergent universal key)
- `routers/ai.py`, model `gemini-3.8-flash` (env `GEMINI_MODEL`), key `EMERGENT_LLM_KEY`
  in `backend/.env`. Structured tasks use `send_message` (JSON); copilot streams SSE.

## Deploy (Hostinger) & local run
See `/app/DEPLOY.md`. Single-origin option: `SERVE_STATIC=1` + `frontend/dist` build →
one uvicorn serves app + API. All frontend calls are relative `/api`.

## Verification status (tier 1, all clean)
- curl smoke: login, summary, cook/today (both origins), expenses/incomes/budget,
  menu POST, grocery generate (31 items), AI plan-menu (15 meals), recipes, chores,
  negatives 401 (no cookie / wrong password).
- `yarn typecheck` clean; browser journey login → add expense → AI parse → cook view clean.
