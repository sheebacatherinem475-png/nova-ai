from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "My Project API"
    FRONTEND_URL: str = "http://localhost:3000"
    GEMINI_API_KEY: str = "placeholder_key_replace_me"
    
    class Config:
        env_file = ".env"

settings = Settings()
