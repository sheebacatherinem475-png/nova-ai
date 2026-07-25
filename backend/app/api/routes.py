from fastapi import APIRouter
from app.api.chat import router as chat_router
from app.api.documents import router as documents_router
from app.api.voice import router as voice_router
from app.api.images import router as images_router
from app.api.datasets import router as datasets_router
from app.api.data_analysis import router as data_analysis_router

router = APIRouter()

@router.get("/health")
async def health_check():
    return {"status": "ok"}

router.include_router(chat_router, prefix="/chat", tags=["chat"])
router.include_router(documents_router, prefix="/documents", tags=["documents"])
router.include_router(voice_router, prefix="/voice", tags=["voice"])
router.include_router(images_router, prefix="/images", tags=["images"])
router.include_router(datasets_router, prefix="/datasets", tags=["datasets"])
router.include_router(data_analysis_router, prefix="/data-analysis", tags=["data-analysis"])
