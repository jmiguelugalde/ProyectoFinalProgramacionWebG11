# backend/db.py
import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv
from pathlib import Path

load_dotenv()

# Modo BD: SQLite (Render) o MySQL (local)
USE_SQLITE = os.getenv("USE_SQLITE", "false").lower() == "true"

if USE_SQLITE:
    # archivo SQLite persistente en /app/data/app.db
    DATA_DIR = Path(__file__).resolve().parent.parent / "data"
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    DB_URL = f"sqlite:///{DATA_DIR.as_posix()}/app.db"

    engine = create_engine(
        DB_URL,
        future=True,
        connect_args={"check_same_thread": False}  # requerido por SQLite en hilos
    )
else:
    # Variables MySQL (docker-compose / .env local)
    DB_USER = os.getenv("DB_USER", "osa_user")
    DB_PASS = os.getenv("DB_PASS", "osa_pass")
    DB_HOST = os.getenv("DB_HOST", "db")
    DB_PORT = os.getenv("DB_PORT", "3306")
    DB_NAME = os.getenv("DB_NAME", "osa_db")
    DB_URL = f"mysql+mysqlconnector://{DB_USER}:{DB_PASS}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

    engine = create_engine(DB_URL, future=True, pool_pre_ping=True)

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def ensure_indexes():
    """Crea índices típicos; tolera si ya existen."""
    backend = engine.url.get_backend_name()
    with engine.begin() as conn:
        if backend == "sqlite":
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_measurements_fecha  ON measurements (fecha)"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_measurements_pv     ON measurements (pv)"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_measurements_codigo ON measurements (codigo_barra)"))
        else:
            # MySQL: no soporta IF NOT EXISTS en CREATE INDEX → try/except
            for sql in [
                "CREATE INDEX ix_measurements_fecha  ON measurements (fecha)",
                "CREATE INDEX ix_measurements_pv     ON measurements (pv)",
                "CREATE INDEX ix_measurements_codigo ON measurements (codigo_barra)",
            ]:
                try:
                    conn.execute(text(sql))
                except Exception:
                    pass
