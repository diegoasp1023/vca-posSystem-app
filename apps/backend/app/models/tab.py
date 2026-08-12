from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class TabPaymentMethod(Base):
    """Lookup table: how a customer paid a tab (Efectivo, Tarjeta, ...)."""

    __tablename__ = "tab_payment_methods"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(50), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class Tab(Base):
    """A customer tab (open account) managed by Cajero/Administrador."""

    __tablename__ = "tabs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    table_number: Mapped[str | None] = mapped_column(String(50), nullable=True)
    reference_note: Mapped[str | None] = mapped_column(String(200), nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="open")
    payment_method_id: Mapped[int | None] = mapped_column(
        ForeignKey("tab_payment_methods.id", ondelete="RESTRICT"), nullable=True
    )
    opened_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    payment_method: Mapped[TabPaymentMethod | None] = relationship()
    items: Mapped[list["TabItem"]] = relationship(
        back_populates="tab", cascade="all, delete-orphan", order_by="TabItem.id"
    )


class TabItem(Base):
    """A line item on a tab, snapshotting the name/price at the time it was added."""

    __tablename__ = "tab_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tab_id: Mapped[int] = mapped_column(ForeignKey("tabs.id", ondelete="CASCADE"), nullable=False)
    source_type: Mapped[str] = mapped_column(String(20), nullable=False)
    menu_item_id: Mapped[int | None] = mapped_column(
        ForeignKey("menu_items.id", ondelete="RESTRICT"), nullable=True
    )
    product_id: Mapped[int | None] = mapped_column(
        ForeignKey("products.id", ondelete="RESTRICT"), nullable=True
    )
    name_es: Mapped[str] = mapped_column(String(150), nullable=False)
    name_en: Mapped[str] = mapped_column(String(150), nullable=False)
    unit_price_cop: Mapped[int] = mapped_column(Integer, nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False, default=1)

    tab: Mapped[Tab] = relationship(back_populates="items")
