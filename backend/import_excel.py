import os
import pandas as pd
import polars as pl
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import select, func
from .db import engine, Base, SessionLocal
from .models import Measurement

# Column mapping from Excel (Spanish) to DB fields
COLS_MAP = {
    "IdConjuntoProducto": "id_conjunto",
    "Fecha": "fecha",
    "Dia de la semana": "dia_semana",
    "Nro de Semana": "nro_semana",
    "PV": "pv",
    "Formato": "formato",
    "Codigo de Barra": "codigo_barra",
    "Descripcion SKU": "descripcion_sku",
    "Causal": "causal",
    "ESTADO": "estado",
    "Tipo de Resultado": "tipo_resultado",
    "Categoría": "categoria",
    "Marca": "marca",
    "Formato Marketing": "formato_marketing",
    "Responsable": "responsable",
    "Sector Operativo Cadena": "sector_operativo",
    "Provincia": "provincia",
    "Nombre Cliente": "cliente",
    "Proveedor": "proveedor",
    "FechaHoraMedicion": "fecha_hora_medicion",
}

def _coerce_date(x):
    if pd.isna(x):
        return None
    if isinstance(x, datetime):
        return x.date()
    try:
        return pd.to_datetime(x, dayfirst=True).date()
    except Exception:
        return None

def _coerce_datetime(x):
    if pd.isna(x):
        return None
    if isinstance(x, datetime):
        return x
    try:
        return pd.to_datetime(x, dayfirst=True).to_pydatetime()
    except Exception:
        return None

def load_excel(path: str):
    # Read with pandas to support Excel; force barcode as string
    df = pd.read_excel(path, dtype={"Codigo de Barra": str})
    # Rename to internal names if present
    rename = {k: v for k, v in COLS_MAP.items() if k in df.columns}
    df = df.rename(columns=rename)
    # Minimal required columns check
    required = ["id_conjunto", "fecha", "pv", "codigo_barra", "estado", "tipo_resultado", "descripcion_sku"]
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise ValueError(f"Faltan columnas requeridas en Excel: {missing}")

    # Coercions
    df["fecha"] = df["fecha"].apply(_coerce_date)
    if "fecha_hora_medicion" in df.columns:
        df["fecha_hora_medicion"] = df["fecha_hora_medicion"].apply(_coerce_datetime)
    else:
        df["fecha_hora_medicion"] = pd.to_datetime(df["fecha"], errors="coerce")

    # Flags
    def osa_flag(row):
        return 1 if (str(row.get("tipo_resultado","")).upper() == "OSA" or str(row.get("estado","")).upper()=="ENCONTRADO") else 0
    def oos_flag(row):
        return 1 if (str(row.get("tipo_resultado","")).upper() == "OOS" or str(row.get("estado","")).upper()=="FALTANTE") else 0
    df["osa_flag"] = df.apply(osa_flag, axis=1)
    df["oos_flag"] = df.apply(oos_flag, axis=1)

    # Push to DB
    Base.metadata.create_all(engine)
    records = df.to_dict(orient="records")
    with SessionLocal() as db:
        for r in records:
            db.add(Measurement(**{k: r.get(k) for k in Measurement.__table__.columns.keys() if k != "id"}))
        db.commit()
    return len(records)

if __name__ == "__main__":
    import sys
    if len(sys.argv) < 2:
        print("Uso: python -m backend.import_excel <path_excel>")
        raise SystemExit(1)
    path = sys.argv[1]
    added = load_excel(path)
    print(f"Filas insertadas: {added}")
