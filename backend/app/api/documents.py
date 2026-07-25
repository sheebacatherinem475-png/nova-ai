import os
import uuid
from datetime import datetime
from fastapi import APIRouter, UploadFile, File, HTTPException
from typing import List

from app.core.database import add_document, get_all_documents, delete_document, get_document
from app.services.document_service import extract_text_from_file
from app.services.embedding_service import store_document_chunks, delete_document_chunks

router = APIRouter()

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), '..', '..', 'uploads')
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/upload")
async def upload_document(file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="Filename not provided.")
        
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ['.pdf', '.txt', '.docx']:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {ext}")
        
    doc_id = str(uuid.uuid4())
    file_path = os.path.join(UPLOAD_DIR, f"{doc_id}_{file.filename}")
    
    # Save file
    try:
        content = await file.read()
        size = len(content)
        with open(file_path, "wb") as f:
            f.write(content)
            
        # Extract text
        text = extract_text_from_file(file_path, file.filename)
        
        # Store in Vector DB
        store_document_chunks(doc_id, file.filename, text)
        
        # Add to SQL DB
        upload_time = datetime.utcnow().isoformat() + "Z"
        add_document(doc_id, file.filename, size, upload_time)
        
        return {"id": doc_id, "filename": file.filename, "size": size, "upload_time": upload_time}
    except Exception as e:
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@router.get("")
async def list_documents():
    docs = get_all_documents()
    return docs

@router.delete("/{doc_id}")
async def remove_document(doc_id: str):
    doc = get_document(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    # Delete from SQLite
    delete_document(doc_id)
    
    # Delete from ChromaDB
    delete_document_chunks(doc_id)
    
    # Delete physical file
    file_path = os.path.join(UPLOAD_DIR, f"{doc_id}_{doc['filename']}")
    if os.path.exists(file_path):
        os.remove(file_path)
        
    return {"status": "success"}
