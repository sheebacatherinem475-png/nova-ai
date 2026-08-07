from pydantic import field_validator
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "My Project API"
    FRONTEND_URL: str = "http://localhost:3000"
    GEMINI_API_KEY: str = "placeholder_key_replace_me"
    DATABASE_URL: str = "sqlite:///./nova.db"
    
    SECRET_KEY: str = "super_secret_key_change_in_production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    UPLOAD_DIR: str = "uploads"
    
    @field_validator("DATABASE_URL")
    @classmethod
    def assemble_db_connection(cls, v: str) -> str:
        if v and v.startswith("postgres://"):
            return v.replace("postgres://", "postgresql://", 1)
        return v

    class Config:
        env_file = ".env"

settings = Settings()
