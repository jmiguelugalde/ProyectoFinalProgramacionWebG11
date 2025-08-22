# Dockerfile
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PORT=10000

WORKDIR /app

# deps de sistema mínimas (seguras para wheels)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential gcc libffi-dev && rm -rf /var/lib/apt/lists/*

# instala requirements del backend
COPY backend/requirements.txt ./requirements.txt
RUN pip install --upgrade pip && pip install -r requirements.txt

# copia el código del backend
COPY backend/ /app/backend/

EXPOSE 10000
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "10000"]
