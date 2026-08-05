from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Table, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

product_presentations = Table(
    "product_presentations",
    Base.metadata,
    Column("product_id", ForeignKey("products.id", ondelete="CASCADE"), primary_key=True),
    Column(
        "presentation_id",
        ForeignKey("presentations.id", ondelete="CASCADE"),
        primary_key=True,
    ),
)


class Presentation(Base):
    """Lookup table: how a coffee can be ordered (Molido, En grano, ...)."""

    __tablename__ = "presentations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name_es: Mapped[str] = mapped_column(String(50), nullable=False)
    name_en: Mapped[str] = mapped_column(String(50), nullable=False)


class Product(Base):
    """A coffee bag sold at Valiente Café."""

    __tablename__ = "products"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name_es: Mapped[str] = mapped_column(String(120), nullable=False)
    name_en: Mapped[str] = mapped_column(String(120), nullable=False)
    description_es: Mapped[str] = mapped_column(String(500), nullable=False)
    description_en: Mapped[str] = mapped_column(String(500), nullable=False)
    weight_grams: Mapped[int] = mapped_column(Integer, nullable=False)
    price_cop: Mapped[int] = mapped_column(Integer, nullable=False)
    image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    presentations: Mapped[list[Presentation]] = relationship(
        secondary=product_presentations, order_by=Presentation.id
    )
