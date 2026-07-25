import os
import uuid
import time
from pathlib import Path
from fastapi import UploadFile, HTTPException
from PIL import Image
import io

UPLOAD_DIR = Path("uploads/images")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_MIME_TYPES = {"image/png", "image/jpeg", "image/jpg", "image/webp"}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB
MAX_IMAGE_SIZE = 2048  # max width or height

async def process_and_save_image(file: UploadFile) -> dict:
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {file.content_type}")
    
    # Read file content
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail=f"File {file.filename} is too large (max 5MB)")

    try:
        # Open image using Pillow
        image = Image.open(io.BytesIO(contents))
        
        # Convert to RGB if necessary (e.g. RGBA for JPEG saving)
        if image.mode in ('RGBA', 'P') and file.content_type in ('image/jpeg', 'image/jpg'):
            image = image.convert('RGB')

        # Resize if too large
        if image.width > MAX_IMAGE_SIZE or image.height > MAX_IMAGE_SIZE:
            image.thumbnail((MAX_IMAGE_SIZE, MAX_IMAGE_SIZE), Image.Resampling.LANCZOS)
        
        # Save to disk
        file_id = str(uuid.uuid4())
        ext = ".webp" if file.content_type == "image/webp" else ".jpg" if file.content_type in ["image/jpeg", "image/jpg"] else ".png"
        safe_filename = f"{file_id}{ext}"
        
        file_path = UPLOAD_DIR / safe_filename
        
        # Save optimized
        image.save(file_path, optimize=True)

        return {
            "id": file_id,
            "filename": file.filename,
            "url": f"/uploads/images/{safe_filename}",
            "local_path": str(file_path)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process image: {str(e)}")

def get_image_path(url: str) -> str:
    filename = os.path.basename(url)
    # prevent path traversal
    if ".." in filename or "/" in filename or "\\" in filename:
        raise ValueError("Invalid filename")
    path = UPLOAD_DIR / filename
    if not path.exists():
        raise FileNotFoundError(f"Image not found: {filename}")
    return str(path)

def cleanup_unused_images():
    now = time.time()
    # Delete images older than 24 hours
    for filepath in UPLOAD_DIR.glob("*.*"):
        if now - filepath.stat().st_mtime > 86400:
            try:
                filepath.unlink()
            except Exception:
                pass
