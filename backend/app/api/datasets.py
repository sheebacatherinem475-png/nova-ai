import json
from fastapi import APIRouter, HTTPException, UploadFile, File, Depends
from typing import List
from sqlalchemy.orm import Session
from app.services.data_service import process_and_save_dataset, remove_dataset, apply_filter
from app.core.db_sqlalchemy import get_db
from app.models.dataset import Dataset
from fastapi.responses import FileResponse

router = APIRouter()

@router.post("/upload")
async def upload_dataset(file: UploadFile = File(...), db: Session = Depends(get_db)):
    result = await process_and_save_dataset(file, db)
    return result

@router.get("")
async def list_datasets(db: Session = Depends(get_db)):
    datasets = db.query(Dataset).order_by(Dataset.upload_time.desc()).all()
    # parse summary json
    rows = []
    for d in datasets:
        rows.append({
            "id": d.id,
            "filename": d.filename,
            "size": d.size,
            "upload_time": d.upload_time,
            "summary": json.loads(d.summary),
            "local_path": d.local_path
        })
    return rows

@router.get("/{dataset_id}")
async def fetch_dataset(dataset_id: str, db: Session = Depends(get_db)):
    ds = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not ds:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    return {
        "id": ds.id,
        "filename": ds.filename,
        "size": ds.size,
        "upload_time": ds.upload_time,
        "summary": json.loads(ds.summary),
        "local_path": ds.local_path
    }

@router.delete("/{dataset_id}")
async def delete_dataset_endpoint(dataset_id: str, db: Session = Depends(get_db)):
    remove_dataset(dataset_id, db)
    return {"status": "ok"}

from pydantic import BaseModel
class FilterRequest(BaseModel):
    query: str

@router.post("/{dataset_id}/filter")
async def filter_dataset_endpoint(dataset_id: str, request: FilterRequest, db: Session = Depends(get_db)):
    result = apply_filter(dataset_id, request.query, db)
    return result

@router.get("/{dataset_id}/download")
async def download_dataset_endpoint(dataset_id: str, db: Session = Depends(get_db)):
    ds = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not ds:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return FileResponse(ds.local_path, filename=ds.filename)
