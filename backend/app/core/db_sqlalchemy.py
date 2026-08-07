from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from .config import settings

is_sqlite = settings.DATABASE_URL.startswith("sqlite")

engine_args = {}
if is_sqlite:
    engine_args["connect_args"] = {"check_same_thread": False}
else:
    # PostgreSQL pooling and SSL
    engine_args["pool_size"] = 5
    engine_args["max_overflow"] = 10
    engine_args["pool_timeout"] = 30
    engine_args["pool_recycle"] = 1800
    if "sslmode=" not in settings.DATABASE_URL.lower():
        # Render typically requires ssl, but we shouldn't force it if the user provided it in query params
        engine_args["connect_args"] = {"sslmode": "require"}

engine = create_engine(settings.DATABASE_URL, **engine_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
