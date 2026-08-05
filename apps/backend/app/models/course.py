from datetime import datetime

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Table,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

course_payment_methods = Table(
    "course_payment_methods",
    Base.metadata,
    Column("course_id", ForeignKey("courses.id", ondelete="CASCADE"), primary_key=True),
    Column(
        "payment_method_id",
        ForeignKey("payment_methods.id", ondelete="CASCADE"),
        primary_key=True,
    ),
)


class PaymentMethod(Base):
    """Lookup table: payment methods shared across courses (Nequi, Daviplata, ...)."""

    __tablename__ = "payment_methods"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name_es: Mapped[str] = mapped_column(String(120), nullable=False)
    name_en: Mapped[str] = mapped_column(String(120), nullable=False)


class Course(Base):
    """A workshop/course offered at Valiente Café."""

    __tablename__ = "courses"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    slug: Mapped[str] = mapped_column(String(150), nullable=False, unique=True)
    title_es: Mapped[str] = mapped_column(String(150), nullable=False)
    title_en: Mapped[str] = mapped_column(String(150), nullable=False)
    tagline_es: Mapped[str] = mapped_column(String(300), nullable=False)
    tagline_en: Mapped[str] = mapped_column(String(300), nullable=False)
    duration_text_es: Mapped[str] = mapped_column(String(500), nullable=False)
    duration_text_en: Mapped[str] = mapped_column(String(500), nullable=False)
    image_url: Mapped[str] = mapped_column(String(500), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    objectives: Mapped[list["CourseObjective"]] = relationship(
        back_populates="course",
        order_by="CourseObjective.sort_order",
        cascade="all, delete-orphan",
    )
    content_modules: Mapped[list["CourseContentModule"]] = relationship(
        back_populates="course",
        order_by="CourseContentModule.sort_order",
        cascade="all, delete-orphan",
    )
    costs: Mapped[list["CourseCost"]] = relationship(
        back_populates="course",
        order_by="CourseCost.sort_order",
        cascade="all, delete-orphan",
    )
    payment_methods: Mapped[list[PaymentMethod]] = relationship(
        secondary=course_payment_methods, order_by=PaymentMethod.id
    )


class CourseObjective(Base):
    __tablename__ = "course_objectives"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    course_id: Mapped[int] = mapped_column(ForeignKey("courses.id", ondelete="CASCADE"))
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False)
    text_es: Mapped[str] = mapped_column(String(500), nullable=False)
    text_en: Mapped[str] = mapped_column(String(500), nullable=False)

    course: Mapped[Course] = relationship(back_populates="objectives")


class CourseContentModule(Base):
    __tablename__ = "course_content_modules"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    course_id: Mapped[int] = mapped_column(ForeignKey("courses.id", ondelete="CASCADE"))
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False)
    module_es: Mapped[str] = mapped_column(String(200), nullable=False)
    module_en: Mapped[str] = mapped_column(String(200), nullable=False)
    duration_label: Mapped[str] = mapped_column(String(50), nullable=False)

    course: Mapped[Course] = relationship(back_populates="content_modules")


class CourseCost(Base):
    __tablename__ = "course_costs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    course_id: Mapped[int] = mapped_column(ForeignKey("courses.id", ondelete="CASCADE"))
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False)
    text_es: Mapped[str] = mapped_column(String(300), nullable=False)
    text_en: Mapped[str] = mapped_column(String(300), nullable=False)

    course: Mapped[Course] = relationship(back_populates="costs")
