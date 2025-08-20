# backend/db.py
import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv

load_dotenv()

# Variables de conexión (de .env / docker-compose)
DB_USER = os.getenv("DB_USER", "osa_user")
DB_PASS = os.getenv("DB_PASS", "osa_pass")
DB_HOST = os.getenv("DB_HOST", "db")
DB_PORT = os.getenv("DB_PORT", "3306")
DB_NAME = os.getenv("DB_NAME", "osa_db")

# URL MySQL (driver: mysql-connector-python)
DB_URL = f"mysql+mysqlconnector://{DB_USER}:{DB_PASS}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

# Engine y Session
engine = create_engine(DB_URL, future=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)

# Base para modelos
Base = declarative_base()

# Dependencia de sesión para FastAPI
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Índices para acelerar filtros típicos
def ensure_indexes():
    """Crea índices si no existen (ignora si ya están creados)."""
    with engine.begin() as conn:
        # fecha
        try:
            conn.execute(text("CREATE INDEX ix_measurements_fecha ON measurements (fecha)"))
        except Exception:
            pass
        # pv
        try:
            conn.execute(text("CREATE INDEX ix_measurements_pv ON measurements (pv)"))
        except Exception:
            pass
        # código de barras
        try:
            conn.execute(text("CREATE INDEX ix_measurements_codigo ON measurements (codigo_barra)"))
        except Exception:
            pass
