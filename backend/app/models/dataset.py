from sqlalchemy import Column, String, Integer
from app.core.db_sqlalchemy import Base

class Dataset(Base):
    __tablename__ = "datasets"

    id = Column(String, primary_key=True, index=True)
    filename = Column(String, nullable=False)
    size = Column(Integer, nullable=False)
    upload_time = Column(String, nullable=False)
    summary = Column(String, nullable=False)
    local_path = Column(String, nullable=False)
