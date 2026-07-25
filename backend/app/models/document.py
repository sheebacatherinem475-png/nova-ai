from sqlalchemy import Column, String, Integer
from app.core.db_sqlalchemy import Base

class Document(Base):
    __tablename__ = "documents"

    id = Column(String, primary_key=True, index=True)
    filename = Column(String, nullable=False)
    size = Column(Integer, nullable=False)
    upload_time = Column(String, nullable=False)
