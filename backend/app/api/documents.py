import os
import uuid
from datetime import datetime
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from typing import List

from sqlalchemy.orm import Session
from app.api.dependencies import get_current_user
from app.core.db_sqlalchemy import get_db
from app.models.document import Document
from app.services.document_service import extract_text_from_file
from app.services.embedding_service import store_document_chunks, delete_document_chunks
from app.services.storage_service import storage_service

router = APIRouter()

ALLOWED_EXTENSIONS = {".txt", ".pdf", ".md", ".csv"}

@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="Filename not provided.")
        
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {ext}")
        
    doc_id = str(uuid.uuid4())
    
    # Save file
    try:
        content = await file.read()
        size = len(content)
        # Save to storage service
        file_path = await storage_service.save_file("documents", f"{doc_id}_{file.filename}", content)
            
        # Extract text
        text = extract_text_from_file(file_path, file.filename)
        
        # Store in Vector DB
        store_document_chunks(doc_id, file.filename, text)
        
        # Add to SQL DB
        upload_time = datetime.utcnow().isoformat() + "Z"
        new_doc = Document(id=doc_id, filename=file.filename, size=size, upload_time=upload_time)
        db.add(new_doc)
        db.commit()
        
        return {"id": doc_id, "filename": file.filename, "size": size, "upload_time": upload_time}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@router.get("")
async def list_documents(db: Session = Depends(get_db)):
    docs = db.query(Document).order_by(Document.upload_time.desc()).all()
    return [{"id": d.id, "filename": d.filename, "size": d.size, "upload_time": d.upload_time} for d in docs]

@router.delete("/{doc_id}")
async def remove_document(doc_id: str, db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    filename = doc.filename
    # Delete from SQLite
    db.delete(doc)
    db.commit()
    
    # Delete from ChromaDB
    delete_document_chunks(doc_id)
    
    # Delete physical file
    storage_service.delete_file("documents", f"{doc_id}_{filename}")
        
    return {"status": "success"}
