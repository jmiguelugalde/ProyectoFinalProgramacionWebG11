from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import String, Integer, Date, DateTime, Float
from .db import Base

class Measurement(Base):
    __tablename__ = "measurements"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    id_conjunto: Mapped[str] = mapped_column(String(50))
    fecha: Mapped["Date"] = mapped_column(Date)
    dia_semana: Mapped[str] = mapped_column(String(20))
    nro_semana: Mapped[str] = mapped_column(String(20))
    pv: Mapped[str] = mapped_column(String(120))  # tienda
    formato: Mapped[str] = mapped_column(String(60))
    codigo_barra: Mapped[str] = mapped_column(String(32))
    descripcion_sku: Mapped[str] = mapped_column(String(300))
    causal: Mapped[str] = mapped_column(String(200))
    estado: Mapped[str] = mapped_column(String(40))
    tipo_resultado: Mapped[str] = mapped_column(String(40))
    categoria: Mapped[str] = mapped_column(String(100))
    marca: Mapped[str] = mapped_column(String(120))
    formato_marketing: Mapped[str] = mapped_column(String(120))
    responsable: Mapped[str] = mapped_column(String(120))
    sector_operativo: Mapped[str] = mapped_column(String(120))
    provincia: Mapped[str] = mapped_column(String(80))
    cliente: Mapped[str] = mapped_column(String(120))
    proveedor: Mapped[str] = mapped_column(String(160))
    fecha_hora_medicion: Mapped["DateTime"] = mapped_column(DateTime)
    osa_flag: Mapped[int] = mapped_column(Integer)  # 1 OSA / 0 no
    oos_flag: Mapped[int] = mapped_column(Integer)  # 1 OOS / 0 no
