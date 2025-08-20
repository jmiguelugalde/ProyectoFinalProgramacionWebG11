import os
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func, select
from dotenv import load_dotenv
from datetime import date
from sqlalchemy import and_, func
from sqlalchemy import func
from decimal import Decimal


from .db import Base, engine, get_db
from .models import Measurement
from .import_excel import load_excel

load_dotenv()
Base.metadata.create_all(bind=engine)

ADMIN_USER = os.getenv("ADMIN_USER","admin")
ADMIN_PASS = os.getenv("ADMIN_PASS","admin123")

app = FastAPI(title="OSA Dashboard API", version="0.1")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health():
    return {"ok": True}

@app.post("/api/login")
def login(body: dict):
    if body.get("username")==ADMIN_USER and body.get("password")==ADMIN_PASS:
        return {"ok": True, "user": {"username": ADMIN_USER}}
    raise HTTPException(status_code=401, detail="Credenciales inválidas")

@app.post("/api/import")
def api_import(body: dict):
    path = body.get("path")
    if not path or not os.path.exists(path):
        raise HTTPException(400, "Debe enviar 'path' válido al archivo Excel")
    count = load_excel(path)
    return {"inserted": count}

@app.get("/api/kpis")
def kpis(
    store: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    db: Session = Depends(get_db),
):
    # Filtros seguros
    filters = []
    if store:
        filters.append(Measurement.pv == store)
    if date_from:
        filters.append(Measurement.fecha >= date_from)
    if date_to:
        filters.append(Measurement.fecha <= date_to)

    # Helpers para castear seguro
    def to_float(x):
        if x is None:
            return 0.0
        if isinstance(x, Decimal):
            return float(x)
        return float(x)

    # Total filas
    total = db.query(func.count(Measurement.id)).filter(*filters).scalar() or 0
    if total == 0:
        return {"total": 0, "osa_pct": 0.0, "oos_pct": 0.0, "series": [], "worst_sku": []}

    # Sumas OSA/OOS con los mismos filtros
    osa_sum = db.query(func.sum(Measurement.osa_flag)).filter(*filters).scalar() or 0
    oos_sum = db.query(func.sum(Measurement.oos_flag)).filter(*filters).scalar() or 0

    osa_pct = round((to_float(osa_sum) * 100.0) / float(total), 2)
    oos_pct = round((to_float(oos_sum) * 100.0) / float(total), 2)

    # Serie temporal por fecha
    series_rows = (
        db.query(Measurement.fecha.label("d"), func.avg(Measurement.osa_flag).label("v"))
        .filter(*filters)
        .group_by(Measurement.fecha)
        .order_by(Measurement.fecha)
        .all()
    )
    series = [{"date": str(d), "osa_pct": round(to_float(v) * 100.0, 2)} for d, v in series_rows]

    # Peores SKUs por OSA promedio
    worst_rows = (
        db.query(Measurement.codigo_barra.label("b"), func.avg(Measurement.osa_flag).label("v"))
        .filter(*filters)
        .group_by(Measurement.codigo_barra)
        .order_by(func.avg(Measurement.osa_flag))
        .limit(5)
        .all()
    )
    worst_sku = [{"barcode": b, "osa_pct": round(to_float(v) * 100.0, 2)} for b, v in worst_rows]

    return {"total": total, "osa_pct": osa_pct, "oos_pct": oos_pct, "series": series, "worst_sku": worst_sku}

@app.get("/api/measurements")
def measurements(store: str | None = None, date_from: str | None = None, date_to: str | None = None, limit: int = 200, db: Session = Depends(get_db)):
    q = db.query(Measurement)
    if store:
        q = q.filter(Measurement.pv == store)
    if date_from:
        q = q.filter(Measurement.fecha >= date_from)
    if date_to:
        q = q.filter(Measurement.fecha <= date_to)
    q = q.order_by(Measurement.fecha.desc()).limit(limit)
    rows = q.all()
    def as_dict(m):
        return {
            "id": m.id,
            "fecha": str(m.fecha),
            "pv": m.pv,
            "codigo_barra": m.codigo_barra,
            "descripcion_sku": m.descripcion_sku,
            "estado": m.estado,
            "tipo_resultado": m.tipo_resultado,
            "provincia": m.provincia,
            "osa_flag": m.osa_flag,
            "oos_flag": m.oos_flag,
        }
    return {"items": [as_dict(r) for r in rows]}
