import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, APIRouter
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List
import uuid
from datetime import datetime


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
from lib.db import client, db, ensure_indexes
from routers.ai import router as ai_router
from routers.auth import router as auth_router
from routers.cards import router as cards_router
from routers.config import router as config_router
from routers.service import router as service_router
from routers.chores import router as chores_router
from routers.cook import router as cook_router
from routers.finance import router as finance_router
from routers.grocery import router as grocery_router
from routers.menu import router as menu_router
from routers.recipes import router as recipes_router


# Startup runs before the yield, shutdown after it. Add your own setup/teardown here.
@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.index_task = asyncio.create_task(ensure_indexes())  # background: a big index build must not block boot
    yield
    client.close()


# Create the main app without a prefix
app = FastAPI(lifespan=lifespan)

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Define Models
class StatusCheck(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class StatusCheckCreate(BaseModel):
    client_name: str

# Add your routes to the router instead of directly to app
@api_router.get("/")
async def root():
    return {"message": "Hello World"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.model_dump()
    status_obj = StatusCheck(**status_dict)
    _ = await db.status_checks.insert_one(status_obj.model_dump())
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find().to_list(1000)
    return [StatusCheck(**status_check) for status_check in status_checks]

# Feature routers (auth, finance, recipes, menu, public cook view, grocery, chores, AI)
api_router.include_router(auth_router)
api_router.include_router(finance_router)
api_router.include_router(recipes_router)
api_router.include_router(menu_router)
api_router.include_router(cook_router)
api_router.include_router(grocery_router)
api_router.include_router(chores_router)
api_router.include_router(cards_router)
api_router.include_router(config_router)
api_router.include_router(service_router)
api_router.include_router(ai_router)

# Include the router in the main app
app.include_router(api_router)


# Optional single-origin static hosting (e.g. Hostinger): SERVE_STATIC=1 plus a
# frontend build (cd frontend && yarn build) lets this one process serve both the
# app and the API. Unset in the pod — Vite dev stays on :3000 there.
_dist = ROOT_DIR.parent / "frontend" / "dist"
if os.environ.get("SERVE_STATIC") == "1" and _dist.is_dir():
    from fastapi.responses import FileResponse

    @app.get("/{full_path:path}", include_in_schema=False)
    async def spa(full_path: str):
        target = (_dist / full_path).resolve()
        if full_path and str(target).startswith(str(_dist.resolve())) and target.is_file():
            return FileResponse(target)
        return FileResponse(_dist / "index.html")

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)
