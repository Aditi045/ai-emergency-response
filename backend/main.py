import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from backend.core.config import settings
from backend.core.database import init_db
from backend.core.seed import seed_database
from backend.core.websocket_manager import ws_manager

from backend.api.routes.auth import router as auth_router
from backend.api.routes.incidents import router as incidents_router
from backend.api.routes.reports import router as reports_router
from backend.api.routes.ai import router as ai_router
from backend.api.routes.resources import router as resources_router
from backend.api.routes.responders import router as responders_router
from backend.api.routes.map_routes import router as map_router
from backend.api.routes.notifications import router as notifications_router
from backend.api.routes.sync import router as sync_router
from backend.api.routes.datasets import router as datasets_router
from backend.api.routes.admin import router as admin_router
from backend.api.routes.health import router as health_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB tables & seed demo data
    await init_db()
    await seed_database()
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.PROJECT_VERSION,
    description="ResQIntel AI: Multimodal, multi-agent AI emergency response intelligence and decision-support platform.",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static Storage for media uploads and reports
app.mount("/storage", StaticFiles(directory=settings.STORAGE_DIR), name="storage")

# Include API Routers under /api
app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(incidents_router, prefix=settings.API_V1_STR)
app.include_router(reports_router, prefix=settings.API_V1_STR)
app.include_router(ai_router, prefix=settings.API_V1_STR)
app.include_router(resources_router, prefix=settings.API_V1_STR)
app.include_router(responders_router, prefix=settings.API_V1_STR)
app.include_router(map_router, prefix=settings.API_V1_STR)
app.include_router(notifications_router, prefix=settings.API_V1_STR)
app.include_router(sync_router, prefix=settings.API_V1_STR)
app.include_router(datasets_router, prefix=settings.API_V1_STR)
app.include_router(admin_router, prefix=settings.API_V1_STR)
app.include_router(health_router, prefix=settings.API_V1_STR)

# Real-time WebSocket Endpoint
@app.websocket("/api/ws")
async def websocket_endpoint(websocket: WebSocket, role: str = "CITIZEN", user_id: str = None):
    await ws_manager.connect(websocket, user_id=user_id, role=role.upper())
    try:
        while True:
            data = await websocket.receive_text()
            # Echo ping/pong for keepalive
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, user_id=user_id, role=role.upper())

@app.get("/")
async def root():
    return {
        "app": settings.PROJECT_NAME,
        "tagline": settings.TAGLINE,
        "version": settings.PROJECT_VERSION,
        "status": "OPERATIONAL",
        "api_docs": "/docs",
        "health_check": "/api/health"
    }
