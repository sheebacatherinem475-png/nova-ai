from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import edge_tts

router = APIRouter()

class TTSRequest(BaseModel):
    text: str
    voice: str = "en-US-JennyNeural"
    rate: str = "+0%"

@router.post("/tts")
async def generate_tts(request: TTSRequest):
    try:
        async def stream_audio():
            communicate = edge_tts.Communicate(request.text, request.voice, rate=request.rate)
            async for chunk in communicate.stream():
                if chunk["type"] == "audio":
                    yield chunk["data"]

        return StreamingResponse(stream_audio(), media_type="audio/mpeg")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/voices")
async def list_voices():
    try:
        voices = await edge_tts.list_voices()
        # Filter for some common high quality English voices to avoid sending huge payload
        common = [v for v in voices if v["Locale"].startswith("en-")][:20]
        return common
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
