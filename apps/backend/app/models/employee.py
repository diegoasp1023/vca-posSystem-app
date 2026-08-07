from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Employee(Base):
    """A staff member of Valiente Café. Internal HR data, never exposed publicly."""

    __tablename__ = "employees"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)

    nombre: Mapped[str] = mapped_column(String(100), nullable=False)
    apellido: Mapped[str] = mapped_column(String(100), nullable=False)
    tipo_documento: Mapped[str] = mapped_column(String(2), nullable=False)
    numero_documento: Mapped[str] = mapped_column(String(30), nullable=False, unique=True)
    fecha_nacimiento: Mapped[date] = mapped_column(Date, nullable=False)
    correo_electronico: Mapped[str] = mapped_column(String(255), nullable=False)
    direccion: Mapped[str] = mapped_column(String(255), nullable=False)
    cargo: Mapped[str] = mapped_column(String(100), nullable=False)
    eps: Mapped[str] = mapped_column(String(100), nullable=False)

    tipo_contrato: Mapped[str] = mapped_column(String(20), nullable=False)
    salario_mensual: Mapped[int | None] = mapped_column(Integer, nullable=True)
    salario_por_hora: Mapped[int | None] = mapped_column(Integer, nullable=True)
    arl: Mapped[str | None] = mapped_column(String(100), nullable=True)
    fondo_pension: Mapped[str | None] = mapped_column(String(100), nullable=True)

    banco: Mapped[str] = mapped_column(String(100), nullable=False)
    tipo_cuenta: Mapped[str] = mapped_column(String(20), nullable=False)
    numero_cuenta: Mapped[str] = mapped_column(String(30), nullable=False)

    fecha_ingreso: Mapped[date] = mapped_column(Date, nullable=False)

    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    fecha_activacion: Mapped[date] = mapped_column(Date, nullable=False)
    fecha_baja: Mapped[date | None] = mapped_column(Date, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
