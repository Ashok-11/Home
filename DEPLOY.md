# Deploying HomeBoard (Hostinger) & running locally

## Run locally (your device)
Requirements: Python 3.11+, Node 20+, MongoDB running on localhost:27017.

```bash
# backend
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env 2>/dev/null || true   # needs MONGO_URL, DB_NAME, CORS_ORIGINS, EMERGENT_LLM_KEY
uvicorn server:app --port 8001 --reload

# frontend (second terminal)
cd frontend
yarn install
yarn dev          # http://localhost:3000, /api proxied to :8001

# seed demo data + the two member logins
cd ../backend && python seed.py
```

Logins: husband@homeboard.app / kitchen123 (or wife@…). Public cook view: /cook.

## Hostinger (VPS, Ubuntu) — single-origin production setup
Hostinger VPS gives full root — run Mongo, the API and the static frontend on one box.

1. Install: `sudo apt install -y python3-venv nodejs npm mongodb-org` (add
   mongodb.org's apt repo; Node 20 via NodeSource).
2. Push the code, then:
   ```bash
   cd frontend && yarn install && yarn build          # produces frontend/dist
   cd ../backend && python -m venv .venv && .venv/bin/pip install -r requirements.txt
   ```
3. `backend/.env`:
   ```
   MONGO_URL="mongodb://localhost:27017"
   DB_NAME="app"
   CORS_ORIGINS="https://your-domain.com"
   EMERGENT_LLM_KEY="<your universal key>"
   SERVE_STATIC="1"          # one process serves the app AND the API
   ```
   With `SERVE_STATIC=1` the FastAPI app serves `frontend/dist` and the SPA fallback,
   so the browser and `/api` share one origin — no CORS pain, cookies just work.
4. Systemd unit `/etc/systemd/system/homeboard.service`:
   ```ini
   [Service]
   WorkingDirectory=/opt/homeboard/backend
   Environment=SERVE_STATIC=1
   ExecStart=/opt/homeboard/backend/.venv/bin/uvicorn server:app --host 0.0.0.0 --port 8001
   Restart=always
   ```
5. Seed once: `cd backend && .venv/bin/python seed.py`.
6. Hostinger/nginx reverse-proxy `your-domain.com` → `127.0.0.1:8001`
   (enable SSL in hPanel). Share `https://your-domain/cook` with the cook — it needs
   no login. For SSE (AI Copilot) disable proxy buffering: `proxy_buffering off;`.

Notes
- The AI features need `EMERGENT_LLM_KEY` (or swap in your own Gemini key by editing
  `routers/ai.py`'s `_api_key()` / set `GEMINI_MODEL`).
- On shared (non-VPS) Hostinger plans you cannot run FastAPI/Mongo — use the VPS.
