FROM python:3.10-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Install system dependencies for postgres and scientific libraries
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Run alembic migrations then start uvicorn on port 8000
CMD sh -c "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000"
