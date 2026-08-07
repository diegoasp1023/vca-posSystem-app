from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class MenuCategory(Base):
    """A section of the in-house café menu (Bebidas calientes, Para llevar, ...)."""

    __tablename__ = "menu_categories"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name_es: Mapped[str] = mapped_column(String(120), nullable=False)
    name_en: Mapped[str] = mapped_column(String(120), nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    items: Mapped[list["MenuItem"]] = relationship(back_populates="category")


class MenuItem(Base):
    """An item on the in-house café menu (drink, food, or to-go product)."""

    __tablename__ = "menu_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    category_id: Mapped[int] = mapped_column(
        ForeignKey("menu_categories.id", ondelete="RESTRICT"), nullable=False
    )
    name_es: Mapped[str] = mapped_column(String(150), nullable=False)
    name_en: Mapped[str] = mapped_column(String(150), nullable=False)
    description_es: Mapped[str | None] = mapped_column(String(500), nullable=True)
    description_en: Mapped[str | None] = mapped_column(String(500), nullable=True)
    price_cop: Mapped[int | None] = mapped_column(Integer, nullable=True)
    image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    category: Mapped[MenuCategory] = relationship(back_populates="items")
