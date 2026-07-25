import json
from fastapi import APIRouter, HTTPException, UploadFile, File
from typing import List
from app.services.data_service import process_and_save_dataset, remove_dataset, apply_filter
from app.core.database import get_all_datasets, get_dataset
from fastapi.responses import FileResponse

router = APIRouter()

@router.post("/upload")
async def upload_dataset(file: UploadFile = File(...)):
    result = await process_and_save_dataset(file)
    return result

@router.get("")
async def list_datasets():
    rows = get_all_datasets()
    # parse summary json
    for r in rows:
        r["summary"] = json.loads(r["summary"])
    return rows

@router.get("/{dataset_id}")
async def fetch_dataset(dataset_id: str):
    ds = get_dataset(dataset_id)
    if not ds:
        raise HTTPException(status_code=404, detail="Dataset not found")
    ds["summary"] = json.loads(ds["summary"])
    return ds

@router.delete("/{dataset_id}")
async def delete_dataset_endpoint(dataset_id: str):
    remove_dataset(dataset_id)
    return {"status": "ok"}

from pydantic import BaseModel
class FilterRequest(BaseModel):
    query: str

@router.post("/{dataset_id}/filter")
async def filter_dataset_endpoint(dataset_id: str, request: FilterRequest):
    result = apply_filter(dataset_id, request.query)
    return result

@router.get("/{dataset_id}/download")
async def download_dataset_endpoint(dataset_id: str):
    ds = get_dataset(dataset_id)
    if not ds:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return FileResponse(ds["local_path"], filename=ds["filename"])
