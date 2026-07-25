import os
import uuid
from datetime import datetime
from pathlib import Path
from fastapi import UploadFile, HTTPException
import json
import uuid
import pandas as pd
from functools import lru_cache
from sqlalchemy.orm import Session
from app.models.dataset import Dataset
from app.services.query_validator import validate_query

DATASETS_DIR = Path("uploads/datasets")
DATASETS_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_EXTENSIONS = {".csv", ".json", ".xlsx"}
MAX_FILE_SIZE = 25 * 1024 * 1024  # 25 MB

async def process_and_save_dataset(file: UploadFile, db: Session) -> dict:
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {ext}")
    
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail=f"File {file.filename} is too large (max 25MB)")
    
    file_id = str(uuid.uuid4())
    safe_filename = f"{file_id}{ext}"
    file_path = DATASETS_DIR / safe_filename
    
    with open(file_path, "wb") as f:
        f.write(contents)
        
    try:
        df = _load_dataframe(file_path, ext)
            
        summary = _generate_summary(df)
        
        # Save to DB
        upload_time = datetime.utcnow().isoformat() + "Z"
        summary_json = json.dumps(summary)
        
        new_ds = Dataset(
            id=file_id, 
            filename=file.filename, 
            size=len(contents), 
            upload_time=upload_time, 
            summary=summary_json, 
            local_path=str(file_path)
        )
        db.add(new_ds)
        db.commit()
        
        return {
            "id": file_id,
            "filename": file.filename,
            "size": len(contents),
            "upload_time": upload_time,
            "summary": summary
        }
    except Exception as e:
        if file_path.exists():
            file_path.unlink()
        raise HTTPException(status_code=400, detail=f"Failed to process dataset: {str(e)}")

@lru_cache(maxsize=5)
def _load_dataframe(file_path: Path, ext: str) -> pd.DataFrame:
    if ext == ".csv":
        return pd.read_csv(file_path)
    elif ext == ".json":
        return pd.read_json(file_path)
    elif ext == ".xlsx":
        return pd.read_excel(file_path)
    else:
        raise ValueError("Unknown format")

def _generate_summary(df: pd.DataFrame) -> dict:
    row_count, col_count = df.shape
    
    # 1. dtypes and missing values
    columns_info = []
    for col in df.columns:
        columns_info.append({
            "name": col,
            "type": str(df[col].dtype),
            "missing": int(df[col].isna().sum())
        })
        
    # 2. basic stats for numeric
    numeric_df = df.select_dtypes(include=["number"])
    stats = {}
    if not numeric_df.empty:
        stats = numeric_df.describe().to_dict()
        
    # 3. head 20
    # ensure it's JSON serializable, fillna
    head_df = df.head(20).fillna("").astype(str)
    head_rows = head_df.to_dict(orient="records")
    
    # 4. Correlation
    correlation = {}
    if not numeric_df.empty and len(numeric_df.columns) > 1:
        corr_matrix = numeric_df.corr().fillna(0).to_dict()
        correlation = corr_matrix
        
    return {
        "row_count": row_count,
        "col_count": col_count,
        "columns": columns_info,
        "stats": stats,
        "head": head_rows,
        "correlation": correlation
    }

def remove_dataset(dataset_id: str, db: Session):
    ds = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not ds:
        raise HTTPException(status_code=404, detail="Dataset not found")
        
    try:
        os.remove(ds.local_path)
    except:
        pass
        
    db.delete(ds)
    db.commit()

def get_dataset_context(dataset_id: str, db: Session) -> str:
    ds = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not ds:
        raise HTTPException(status_code=404, detail="Dataset not found")
        
    summary = json.loads(ds.summary)
    
    context = f"Dataset: {ds.filename}\n"
    context += f"Rows: {summary['row_count']}, Columns: {summary['col_count']}\n\n"
    
    context += "Columns Info (Name, Type, Missing Values):\n"
    for col in summary["columns"]:
        context += f"- {col['name']} ({col['type']}), Missing: {col['missing']}\n"
        
    context += "\nSample Data (First 5 rows):\n"
    # only include 5 rows in context to save tokens, the frontend has 20 for preview
    for row in summary["head"][:5]:
        context += f"{json.dumps(row)}\n"
        
    if summary["stats"]:
        context += "\nSummary Statistics:\n"
        context += json.dumps(summary["stats"], indent=2) + "\n"
        
    if summary["correlation"]:
        context += "\nCorrelation Matrix:\n"
        context += json.dumps(summary["correlation"], indent=2) + "\n"
        
    return context

def apply_filter(dataset_id: str, query: str, db: Session) -> dict:
    ds = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not ds:
        raise HTTPException(status_code=404, detail="Dataset not found")
        
    summary = json.loads(ds.summary)
    allowed_cols = [c["name"] for c in summary["columns"]]
    
    is_valid, errors = validate_query(query, allowed_cols)
    if not is_valid:
        raise HTTPException(status_code=400, detail=f"Invalid filter query: {'; '.join(errors)}")
        
    df = _load_dataframe(Path(ds.local_path), os.path.splitext(ds.local_path)[1].lower())
    
    try:
        filtered_df = df.query(query)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error applying filter: {str(e)}")
        
    if filtered_df.empty:
        raise HTTPException(status_code=400, detail="Filter resulted in an empty dataset")
        
    # Save virtual dataset
    file_id = str(uuid.uuid4())
    safe_filename = f"{file_id}.json"
    file_path = DATASETS_DIR / safe_filename
    
    # Store as json for type preservation
    filtered_df.to_json(file_path, orient="records")
    
    new_summary = _generate_summary(filtered_df)
    upload_time = datetime.utcnow().isoformat() + "Z"
    
    new_ds = Dataset(
        id=file_id,
        filename=f"{ds.filename} (Filtered)",
        size=len(filtered_df),
        upload_time=upload_time,
        summary=json.dumps(new_summary),
        local_path=str(file_path)
    )
    db.add(new_ds)
    db.commit()
    
    return {
        "id": file_id,
        "filename": f"{ds.filename} (Filtered)",
        "size": len(filtered_df),
        "upload_time": upload_time,
        "summary": new_summary
    }

insights_cache = {}

def get_insights_from_cache(dataset_id: str):
    return insights_cache.get(dataset_id)

def set_insights_to_cache(dataset_id: str, insights: dict):
    insights_cache[dataset_id] = insights
