from fastapi import APIRouter
from app.api.chat import router as chat_router
from app.api.documents import router as documents_router
from app.api.voice import router as voice_router
from app.api.images import router as images_router
from app.api.datasets import router as datasets_router
from app.api.data_analysis import router as data_analysis_router
from app.api.auth import router as auth_router
from fastapi import Depends
from app.api.dependencies import get_current_user

router = APIRouter()

@router.get("/health")
async def health_check():
    return {"status": "ok"}

router.include_router(auth_router, prefix="/auth", tags=["auth"])

protect = [Depends(get_current_user)]

router.include_router(chat_router, prefix="/chat", tags=["chat"], dependencies=protect)
router.include_router(documents_router, prefix="/documents", tags=["documents"], dependencies=protect)
router.include_router(voice_router, prefix="/voice", tags=["voice"], dependencies=protect)
router.include_router(images_router, prefix="/images", tags=["images"], dependencies=protect)
router.include_router(datasets_router, prefix="/datasets", tags=["datasets"], dependencies=protect)
router.include_router(data_analysis_router, prefix="/data-analysis", tags=["data-analysis"], dependencies=protect)
