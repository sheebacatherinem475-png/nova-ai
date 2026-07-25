from fastapi import APIRouter
from app.api.chat import router as chat_router
from app.api.documents import router as documents_router
from app.api.voice import router as voice_router

router = APIRouter()

@router.get("/health")
async def health_check():
    return {"status": "ok"}

router.include_router(chat_router, prefix="/chat", tags=["chat"])
router.include_router(documents_router, prefix="/documents", tags=["documents"])
router.include_router(voice_router, prefix="/voice", tags=["voice"])
