# backend/routers/stores.py
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import func

from ..db import get_db
from ..models import Store

router = APIRouter(prefix="/api/stores", tags=["stores"])

class StoreIn(BaseModel):
    name: str = Field(..., min_length=2, max_length=120)
    provincia: str | None = Field(default=None, max_length=80)
    formato: str | None = Field(default=None, max_length=60)
    cliente: str | None = Field(default=None, max_length=120)

class StoreOut(StoreIn):
    id: int
    class Config:
        from_attributes = True

@router.get("", response_model=list[StoreOut])
def list_stores(limit: int = 100, q: str | None = None, db: Session = Depends(get_db)):
    query = db.query(Store)
    if q:
        like = f"%{q.strip()}%"
        # ILIKE en MySQL no existe; usamos LOWER para búsqueda case-insensitive
        query = query.filter(func.lower(Store.name).like(func.lower(like)))
    return query.order_by(Store.id.desc()).limit(limit).all()

@router.get("/{store_id}", response_model=StoreOut)
def get_store(store_id: int, db: Session = Depends(get_db)):
    s = db.get(Store, store_id)
    if not s:
        raise HTTPException(404, "Store not found")
    return s

@router.post("", response_model=StoreOut, status_code=201)
def create_store(data: StoreIn, db: Session = Depends(get_db)):
    exists = db.query(Store).filter(func.lower(Store.name) == func.lower(data.name)).first()
    if exists:
        raise HTTPException(409, "Store name already exists")
    s = Store(
        name=data.name.strip(),
        provincia=(data.provincia or None),
        formato=(data.formato or None),
        cliente=(data.cliente or None),
    )
    db.add(s)
    db.commit()
    db.refresh(s)
    return s

@router.put("/{store_id}", response_model=StoreOut)
def update_store(store_id: int, data: StoreIn, db: Session = Depends(get_db)):
    s = db.get(Store, store_id)
    if not s:
        raise HTTPException(404, "Store not found")
    if data.name.strip().lower() != (s.name or "").lower():
        exists = db.query(Store).filter(func.lower(Store.name) == func.lower(data.name)).first()
        if exists:
            raise HTTPException(409, "Store name already exists")
    s.name = data.name.strip()
    s.provincia = data.provincia or None
    s.formato = data.formato or None
    s.cliente = data.cliente or None
    db.commit()
    db.refresh(s)
    return s

@router.delete("/{store_id}", status_code=204)
def delete_store(store_id: int, db: Session = Depends(get_db)):
    s = db.get(Store, store_id)
    if not s:
        raise HTTPException(404, "Store not found")
    db.delete(s)
    db.commit()
    return
