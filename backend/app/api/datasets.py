import json
from fastapi import APIRouter, HTTPException, UploadFile, File
from typing import List
from app.services.data_service import process_and_save_dataset, remove_dataset
from app.core.database import get_all_datasets, get_dataset

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
