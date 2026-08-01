import os
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.staticfiles import StaticFiles
import logging

from app.core.config import settings
from app.api.routes import router as api_router
from app.core.db_sqlalchemy import engine, Base

# Create tables automatically for Render deployments
Base.metadata.create_all(bind=engine)

# Configure structured logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

app = FastAPI(title=settings.PROJECT_NAME)

# Exception handlers
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error. Please try again later."},
    )

origins = [
    settings.FRONTEND_URL,
    "http://127.0.0.1:3000",
    "http://localhost:3000",
]

app.add_middleware(
    TrustedHostMiddleware, allowed_hosts=["*"]  # Set to specific domains in prod via env vars
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api")

@app.get("/health")
def health_check():
    return {"status": "ok", "message": "Service is running"}

from pathlib import Path

upload_dir = Path(settings.UPLOAD_DIR)
upload_dir.mkdir(parents=True, exist_ok=True)
images_dir = upload_dir / "images"
images_dir.mkdir(parents=True, exist_ok=True)

app.mount("/uploads/images", StaticFiles(directory=str(images_dir)), name="images")
