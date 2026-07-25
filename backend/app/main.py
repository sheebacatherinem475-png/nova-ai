from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.routes import router as api_router
from app.core.database import init_db

app = FastAPI(title=settings.PROJECT_NAME)

@app.on_event("startup")
def startup_event():
    init_db()

origins = [
    settings.FRONTEND_URL,
    "http://127.0.0.1:3000", # local dev helper
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api")
