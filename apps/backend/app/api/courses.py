from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.models.course import Course
from app.schemas.common import Page
from app.schemas.course import CourseDetailOut, CourseSummaryOut

router = APIRouter(prefix="/api/courses", tags=["courses"])

PAGE_SIZE = 4


@router.get("", response_model=Page[CourseSummaryOut])
async def list_courses(
    page: int = Query(default=1, ge=1),
    db: AsyncSession = Depends(get_db),
) -> Page[CourseSummaryOut]:
    base_query = select(Course).where(Course.is_active.is_(True))

    total = await db.scalar(select(func.count()).select_from(base_query.subquery()))
    total = total or 0

    result = await db.execute(
        base_query.order_by(Course.id).offset((page - 1) * PAGE_SIZE).limit(PAGE_SIZE)
    )
    courses = result.scalars().all()

    return Page(
        items=[CourseSummaryOut.from_model(c) for c in courses],
        page=page,
        page_size=PAGE_SIZE,
        total=total,
        total_pages=max(1, -(-total // PAGE_SIZE)),
    )


@router.get("/{slug}", response_model=CourseDetailOut)
async def get_course(slug: str, db: AsyncSession = Depends(get_db)) -> CourseDetailOut:
    result = await db.execute(
        select(Course)
        .where(Course.slug == slug, Course.is_active.is_(True))
        .options(
            selectinload(Course.objectives),
            selectinload(Course.content_modules),
            selectinload(Course.costs),
            selectinload(Course.payment_methods),
        )
    )
    course = result.scalar_one_or_none()

    if course is None:
        raise HTTPException(status_code=404, detail="Course not found")

    return CourseDetailOut.from_model(course)
