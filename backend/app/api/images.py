import os
import json
from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional
from google import genai
from google.genai import types
from app.core.config import settings
from app.services.image_service import process_and_save_image, get_image_path, cleanup_unused_images

router = APIRouter()

class ImageAttachment(BaseModel):
    id: str
    url: str
    filename: str

class ImageAnalyzeRequest(BaseModel):
    message: str
    history: Optional[List[dict]] = []
    images: Optional[List[ImageAttachment]] = []

@router.post("/upload")
async def upload_images(files: List[UploadFile] = File(...)):
    if len(files) > 5:
        raise HTTPException(status_code=400, detail="Maximum 5 images allowed per request.")
    
    # Run cleanup in background or sync (it's fast enough)
    try:
        cleanup_unused_images()
    except:
        pass

    results = []
    for file in files:
        result = await process_and_save_image(file)
        results.append(result)
        
    return results

@router.post("/analyze")
async def analyze_images(request: ImageAnalyzeRequest):
    if not settings.GEMINI_API_KEY or settings.GEMINI_API_KEY == "placeholder_key_replace_me":
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY is not configured on the server.")
        
    try:
        client = genai.Client(api_key=settings.GEMINI_API_KEY)
        
        system_instruction = "You are a helpful multimodal AI assistant. You can analyze images, extract text (OCR), explain diagrams, charts, graphs, and compare multiple images. Respond comprehensively to the user."

        contents = []
        
        # We need to parse history. If history has images, we should load them.
        for msg in request.history:
            role = "user" if msg.get("role") == "user" else "model"
            parts = []
            if msg.get("content"):
                parts.append(types.Part.from_text(text=msg.get("content", "")))
            
            # If the user message had images in history, load them
            if role == "user" and msg.get("images"):
                for img in msg["images"]:
                    try:
                        local_path = get_image_path(img["url"])
                        with open(local_path, "rb") as f:
                            data = f.read()
                        
                        ext = os.path.splitext(local_path)[1].lower()
                        mime_type = "image/webp" if ext == ".webp" else "image/png" if ext == ".png" else "image/jpeg"
                        
                        parts.append(types.Part.from_bytes(data=data, mime_type=mime_type))
                    except Exception as e:
                        print(f"Failed to load historical image {img.get('url')}: {e}")
                        
            contents.append(types.Content(role=role, parts=parts))

        # Add the current message
        current_parts = []
        if request.message:
            current_parts.append(types.Part.from_text(text=request.message))
            
        for img in request.images:
            try:
                local_path = get_image_path(img.url)
                with open(local_path, "rb") as f:
                    data = f.read()
                
                ext = os.path.splitext(local_path)[1].lower()
                mime_type = "image/webp" if ext == ".webp" else "image/png" if ext == ".png" else "image/jpeg"
                
                current_parts.append(types.Part.from_bytes(data=data, mime_type=mime_type))
            except Exception as e:
                print(f"Failed to load image {img.url}: {e}")
                
        contents.append(types.Content(role="user", parts=current_parts))

        def generate():
            try:
                # Use gemini-2.5-flash as it supports multimodal tasks efficiently
                response = client.models.generate_content_stream(
                    model='gemini-2.5-flash',
                    contents=contents,
                    config=types.GenerateContentConfig(
                        system_instruction=system_instruction,
                    )
                )
                
                for chunk in response:
                    if chunk.text:
                        yield f"data: {json.dumps({'chunk': chunk.text})}\n\n"
                        
            except Exception as e:
                yield f"data: {json.dumps({'error': str(e)})}\n\n"
                
        return StreamingResponse(generate(), media_type="text/event-stream")
            
    except Exception as e:
        print(f"Error in image analyze endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))
