from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class PayrollPeriod(Base):
    """Tracks whether a given month has been manually closed by the admin.
    Closing is a deliberate, irreversible action (no automatic date-based
    transitions) — once cerrado, the month can never be edited again."""

    __tablename__ = "payroll_periods"
    __table_args__ = (UniqueConstraint("year", "month"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    month: Mapped[int] = mapped_column(Integer, nullable=False)
    cerrado: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    cerrado_en: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )


class PayrollSnapshot(Base):
    """Frozen salario_mensual for an indefinido employee, captured when their
    month closes so later salary changes don't alter past reports."""

    __tablename__ = "payroll_snapshots"
    __table_args__ = (UniqueConstraint("employee_id", "year", "month"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    employee_id: Mapped[int] = mapped_column(
        ForeignKey("employees.id", ondelete="CASCADE"), nullable=False
    )
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    month: Mapped[int] = mapped_column(Integer, nullable=False)
    salario_mensual_congelado: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Bonus(Base):
    """A one-off bonus paid to a specific employee in a specific month."""

    __tablename__ = "bonuses"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    employee_id: Mapped[int] = mapped_column(
        ForeignKey("employees.id", ondelete="CASCADE"), nullable=False
    )
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    month: Mapped[int] = mapped_column(Integer, nullable=False)
    monto_cop: Mapped[int] = mapped_column(Integer, nullable=False)
    concepto: Mapped[str] = mapped_column(String(200), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class TipPool(Base):
    """The total tip amount collected for a month, split among participants."""

    __tablename__ = "tip_pools"
    __table_args__ = (UniqueConstraint("year", "month"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    month: Mapped[int] = mapped_column(Integer, nullable=False)
    monto_total_cop: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class TipPoolParticipant(Base):
    __tablename__ = "tip_pool_participants"

    tip_pool_id: Mapped[int] = mapped_column(
        ForeignKey("tip_pools.id", ondelete="CASCADE"), primary_key=True
    )
    employee_id: Mapped[int] = mapped_column(
        ForeignKey("employees.id", ondelete="CASCADE"), primary_key=True
    )
