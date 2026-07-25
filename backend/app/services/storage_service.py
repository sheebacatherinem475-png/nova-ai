import os
from pathlib import Path
import aiofiles
from app.core.config import settings

class StorageService:
    def __init__(self, base_dir: str = settings.UPLOAD_DIR):
        self.base_dir = Path(base_dir)
        # Ensure base directories exist
        (self.base_dir / "documents").mkdir(parents=True, exist_ok=True)
        (self.base_dir / "datasets").mkdir(parents=True, exist_ok=True)
        (self.base_dir / "images").mkdir(parents=True, exist_ok=True)

    def get_path(self, sub_dir: str, filename: str) -> Path:
        return self.base_dir / sub_dir / filename

    async def save_file(self, sub_dir: str, filename: str, content: bytes) -> Path:
        file_path = self.get_path(sub_dir, filename)
        async with aiofiles.open(file_path, 'wb') as out_file:
            await out_file.write(content)
        return file_path

    def delete_file(self, sub_dir: str, filename: str):
        file_path = self.get_path(sub_dir, filename)
        try:
            if file_path.exists():
                file_path.unlink()
        except Exception as e:
            print(f"Error deleting file {file_path}: {e}")

# Global instance for easy import
storage_service = StorageService()
