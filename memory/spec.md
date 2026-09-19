# Manshok — Living Spec

**Manshok** (Manasa + Ashok) is a high-graphics, installable (PWA) household command
centre for a two-person family. Currency INR (₹, en-IN grouping). Dates are
`YYYY-MM-DD` strings; "today" is anchored server-side via `lib/dates.py`.

Brand: deep forest green `#14261B`, terracotta `#D0663C`, gold `#E4B45A`, cream
`#FAF6EE`; Lora serif headings, DM Sans body, JetBrains Mono for figures. The
monogram (`ManshokMark` in `components/decor.tsx`) is SVG; PWA icons in `public/`.

## Auth
- Email + password, httpOnly cookie sessions (`hb_session`, 30d) under `/api/auth/*`.
- **Exactly two accounts** (see `memory/test_credentials.md`): Ashok and Manasa.
  `MAX_MEMBERS = 2` in `lib/session.py`, so signup 403s. Email validation is a local
  regex (not `EmailStr`, which rejects some domains).
- Protected routes use the `require_user` dependency. `/cook/**` is PUBLIC.

## PWA
- `public/manifest.webmanifest` (standalone, start_url `/dashboard`, icons 192/512 +
  maskable), `public/sw.js`, registered from `src/lib/pwa.ts`.
- **Critical**: the SW never caches HTML documents or JS/CSS modules (only
  icons/manifest/images), and it is registered **only in production builds** — in dev
  `setupPwa()` unregisters workers and purges caches. Caching the shell/dev modules
  previously caused a blank preview screen.

## Data model (Mongo, string uuid `id`s)
- `users`, `sessions` (TTL on `expires_at`)
- `expenses` — amount, category, note, date, month, **member** (Ashok|Manasa|Common),
  **source_id/source_label** (which card/UPI/cash), **is_personal** (counts against the
  personal fund), created_by
- `incomes` — source, **source_type** (`ashok`|`manasa`|`rental`|`other`), amount, date, month
- `budgets` (month unique), `allowances` (month unique — personal fund per person,
  default ₹15,000)
- `cards` — name, bank, last4, type (credit|debit|upi|cash), owner
- `appliances` — name, location, service_interval_months, last_serviced_on, notes;
  `service_records` — appliance_id, date, vendor, cost, notes
- `recipes`, `menu_entries` (date, slot, recipe_id, recipe_name, servings, notes),
  `grocery_items`, `chores` (+ **area**: `household` | `cooking`), `copilot_messages`

## Key flows
- **Dashboard** `/dashboard` — period scoping via `GET /api/dashboard?scope=month|fy|cal&key=…`
  (month picker, FY Apr–Mar selector, calendar-year selector). Shows Ashok's income,
  Manasa's income, rental income, other sources, totals, budget ring, personal-fund ring
  with per-person burn (editable per month), **spend per card/source with a per-member
  split**, category donut, recent expenses, and shortcuts to chores/kitchen/copilot.
- **Expenses** `/expenses` — month nav, filters, table with a **Source** column and
  `personal` tag; add/edit dialog captures money source + who spent + personal flag;
  AI smart entry parses free text into draft rows.
- **Budget & Income** `/budget` — monthly budget, income entries (typed by earner), bars.
- **Cards** `/cards` — gradient card tiles, add/delete sources, this month's spend and
  per-member split on each.
- **Kitchen board** `/kitchen` — today's menu, cooking-area chores, recipe/grocery links.
- **Menu planner** `/menu`, **Recipes** `/recipes`, **Grocery** `/grocery` (auto-built
  from the menu's scaled ingredients).
- **Chores & Service** `/chores` — tabs: household chores (frequency + weekday/month-date
  schedule chips) and **service history** (appliances with last-serviced, next-due,
  overdue flag, cost log).
- **Copilot** `/copilot` — SSE streaming chat grounded in live household data.
- **Cook view** `/cook` (+ `/cook/:date`) — PUBLIC, servings scaler, tap-to-check steps.

## AI (Gemini via Emergent universal key)
`routers/ai.py`, model `gemini-3.8-flash` (`GEMINI_MODEL`), key `EMERGENT_LLM_KEY` in
`backend/.env`. Structured endpoints return JSON; the copilot streams SSE.

## Deploy / local
See `DEPLOY.md` — Hostinger VPS single-origin (`SERVE_STATIC=1` + `frontend/dist`) and
local dev steps.

## Verification
Tier-1 curl smoke + testing-subagent run (9/9 checks) green: both logins, negative
auth, all three dashboard scopes, cards CRUD, appliance service logging, cooking-chore
filter, allowance, PWA assets, public cook view, and the blank-screen regression
(repeat reloads, zero SW registrations in dev).
