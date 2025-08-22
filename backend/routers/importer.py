# backend/routers/importer.py
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from sqlalchemy.orm import Session
import pandas as pd
from io import BytesIO
from ..db import get_db
from ..models import Measurement

router = APIRouter(prefix="/api/import", tags=["import"])


@router.post("/excel")
async def import_excel(file: UploadFile = File(...), db: Session = Depends(get_db)):
    fname = file.filename or ""
    if not fname.lower().endswith((".xlsx", ".xls")):
        raise HTTPException(400, "Archivo debe ser .xlsx o .xls") 

    content = await file.read()
    try:
        # leer excel forzando strings (evita notación científica en códigos)
        df = pd.read_excel(BytesIO(content), dtype=str, engine="openpyxl")
    except Exception as e:
        raise HTTPException(400, f"Error leyendo Excel: {e}")

    # mapeo de columnas esperadas -> nombres en BD
    colmap = {
        "IdConjuntoProducto": "id_conjunto",
        "Fecha": "fecha",
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

    # validar columnas mínimas
    missing = [k for k in ["IdConjuntoProducto","Fecha","PV","Codigo de Barra","Descripcion SKU","ESTADO","Tipo de Resultado"] if k not in df.columns]
    if missing:
        raise HTTPException(400, f"Columnas faltantes: {', '.join(missing)}")

    # renombrar y normalizar
    df = df.rename(columns=colmap)

    # asegurar que fecha siempre sea Timestamp
    df["fecha"] = pd.to_datetime(df["fecha"], errors="coerce")

    if "fecha_hora_medicion" in df.columns:
        df["fecha_hora_medicion"] = pd.to_datetime(
            df["fecha_hora_medicion"], errors="coerce"
        )
    else:
        df["fecha_hora_medicion"] = pd.NaT
    
    # normalización extra (strings limpios)
    for col in ["pv","formato","descripcion_sku","causal","estado","tipo_resultado",
                "categoria","marca","formato_marketing","responsable","sector_operativo",
                "provincia","cliente","proveedor"]:
        if col in df.columns:
            df[col] = df[col].astype(str).str.strip()

    # estado/tipo en mayúscula:
    df["estado"] = df["estado"].str.upper()
    df["tipo_resultado"] = df["tipo_resultado"].str.upper()

    # código de barras sin espacios, sin notación científica
    df["codigo_barra"] = df["codigo_barra"].astype(str).str.replace(r"\.0$", "", regex=True).str.strip()

    # filtra fechas fuera de rango razonable
    df = df[(df["fecha"] >= pd.to_datetime("2023-01-01")) & (df["fecha"] <= pd.to_datetime("2026-12-31"))]

    # limpieza básica (requisito: eliminar nulos en campos clave)
    df = df.dropna(subset=["id_conjunto","fecha","pv","codigo_barra","descripcion_sku","estado","tipo_resultado"])

    # flags OSA / OOS
    def flag_osa(x): return 1 if str(x).strip().upper()=="OSA" else 0
    def flag_oos(x): return 1 if str(x).strip().upper()=="OOS" else 0
    df["osa_flag"] = df["tipo_resultado"].apply(flag_osa)
    df["oos_flag"] = df["tipo_resultado"].apply(flag_oos)

    inserted, skipped = 0, 0

    for _, r in df.iterrows():
        try:
            fecha = r.get("fecha")
            dia_semana = fecha.strftime("%A") if pd.notna(fecha) else None
            nro_semana = fecha.strftime("%V") if pd.notna(fecha) else None

            m = Measurement(
                id_conjunto = r.get("id_conjunto"),
                fecha = fecha,
                dia_semana = dia_semana,
                nro_semana = nro_semana,
                pv = r.get("pv"),
                formato = r.get("formato"),
                codigo_barra = str(r.get("codigo_barra") or ""),
                descripcion_sku = r.get("descripcion_sku"),
                causal = r.get("causal") or "",
                estado = r.get("estado") or "",
                tipo_resultado = r.get("tipo_resultado") or "",
                categoria = r.get("categoria") or "",
                marca = r.get("marca") or "",
                formato_marketing = r.get("formato_marketing") or "",
                responsable = r.get("responsable") or "",
                sector_operativo = r.get("sector_operativo") or "",
                provincia = r.get("provincia") or "",
                cliente = r.get("cliente") or "",
                proveedor = r.get("proveedor") or "",
                fecha_hora_medicion = r.get("fecha_hora_medicion"),
                osa_flag = int(r.get("osa_flag") or 0),
                oos_flag = int(r.get("oos_flag") or 0),
            )
            db.add(m)
            inserted += 1

        except Exception:
            skipped += 1
            db.rollback()

    db.commit()
    return {"inserted": inserted, "skipped": skipped, "total_rows": int(df.shape[0])}
