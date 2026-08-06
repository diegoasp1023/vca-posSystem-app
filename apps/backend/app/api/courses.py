from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.auth import require_admin
from app.core.database import get_db
from app.models.course import (
    Course,
    CourseContentModule,
    CourseCost,
    CourseObjective,
    PaymentMethod,
)
from app.schemas.common import Page
from app.schemas.course import CourseDetailOut, CourseSummaryOut, CourseWrite

router = APIRouter(prefix="/api/courses", tags=["courses"])

PAGE_SIZE = 4

DETAIL_OPTIONS = (
    selectinload(Course.objectives),
    selectinload(Course.content_modules),
    selectinload(Course.costs),
    selectinload(Course.payment_methods),
)


@router.get("", response_model=Page[CourseSummaryOut])
async def list_courses(
    page: int = Query(default=1, ge=1),
    db: AsyncSession = Depends(get_db),
) -> Page[CourseSummaryOut]:
    return await _paginate(db, page, only_active=True)


@router.get(
    "/admin", response_model=Page[CourseSummaryOut], dependencies=[Depends(require_admin)]
)
async def list_courses_admin(
    page: int = Query(default=1, ge=1),
    db: AsyncSession = Depends(get_db),
) -> Page[CourseSummaryOut]:
    return await _paginate(db, page, only_active=False)


async def _paginate(db: AsyncSession, page: int, only_active: bool) -> Page[CourseSummaryOut]:
    base_query = select(Course)
    if only_active:
        base_query = base_query.where(Course.is_active.is_(True))

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


@router.get(
    "/admin/{course_id}",
    response_model=CourseDetailOut,
    dependencies=[Depends(require_admin)],
)
async def get_course_admin(course_id: int, db: AsyncSession = Depends(get_db)) -> CourseDetailOut:
    result = await db.execute(
        select(Course).where(Course.id == course_id).options(*DETAIL_OPTIONS)
    )
    course = result.scalar_one_or_none()
    if course is None:
        raise HTTPException(status_code=404, detail="Course not found")
    return CourseDetailOut.from_model(course)


@router.get("/{slug}", response_model=CourseDetailOut)
async def get_course(slug: str, db: AsyncSession = Depends(get_db)) -> CourseDetailOut:
    result = await db.execute(
        select(Course)
        .where(Course.slug == slug, Course.is_active.is_(True))
        .options(*DETAIL_OPTIONS)
    )
    course = result.scalar_one_or_none()

    if course is None:
        raise HTTPException(status_code=404, detail="Course not found")

    return CourseDetailOut.from_model(course)


async def _load_payment_methods(db: AsyncSession, ids: list[int]) -> list[PaymentMethod]:
    if not ids:
        return []
    result = await db.execute(select(PaymentMethod).where(PaymentMethod.id.in_(ids)))
    methods = result.scalars().all()
    if len(methods) != len(set(ids)):
        raise HTTPException(status_code=400, detail="Unknown payment_method_id")
    return list(methods)


def _apply_children(course: Course, body: CourseWrite) -> None:
    course.objectives = [
        CourseObjective(sort_order=i, text_es=o.es, text_en=o.en)
        for i, o in enumerate(body.objectives)
    ]
    course.content_modules = [
        CourseContentModule(
            sort_order=i,
            module_es=item.module_es,
            module_en=item.module_en,
            duration_label=item.duration_label,
        )
        for i, item in enumerate(body.content)
    ]
    course.costs = [
        CourseCost(sort_order=i, text_es=c.es, text_en=c.en)
        for i, c in enumerate(body.cost)
    ]


@router.post("", response_model=CourseDetailOut, status_code=201, dependencies=[Depends(require_admin)])
async def create_course(body: CourseWrite, db: AsyncSession = Depends(get_db)) -> CourseDetailOut:
    existing = await db.scalar(select(Course.id).where(Course.slug == body.slug))
    if existing is not None:
        raise HTTPException(status_code=400, detail="A course with this slug already exists")

    payment_methods = await _load_payment_methods(db, body.payment_method_ids)
    course = Course(
        **body.model_dump(
            exclude={"objectives", "content", "cost", "payment_method_ids"}
        ),
        payment_methods=payment_methods,
    )
    _apply_children(course, body)

    db.add(course)
    await db.commit()
    result = await db.execute(
        select(Course).where(Course.id == course.id).options(*DETAIL_OPTIONS)
    )
    return CourseDetailOut.from_model(result.scalar_one())


@router.put(
    "/{course_id}", response_model=CourseDetailOut, dependencies=[Depends(require_admin)]
)
async def update_course(
    course_id: int, body: CourseWrite, db: AsyncSession = Depends(get_db)
) -> CourseDetailOut:
    result = await db.execute(
        select(Course).where(Course.id == course_id).options(*DETAIL_OPTIONS)
    )
    course = result.scalar_one_or_none()
    if course is None:
        raise HTTPException(status_code=404, detail="Course not found")

    duplicate_slug = await db.scalar(
        select(Course.id).where(Course.slug == body.slug, Course.id != course_id)
    )
    if duplicate_slug is not None:
        raise HTTPException(status_code=400, detail="A course with this slug already exists")

    for field, value in body.model_dump(
        exclude={"objectives", "content", "cost", "payment_method_ids"}
    ).items():
        setattr(course, field, value)
    course.payment_methods = await _load_payment_methods(db, body.payment_method_ids)
    _apply_children(course, body)

    await db.commit()
    result = await db.execute(
        select(Course).where(Course.id == course_id).options(*DETAIL_OPTIONS)
    )
    return CourseDetailOut.from_model(result.scalar_one())


@router.delete("/{course_id}", status_code=204, dependencies=[Depends(require_admin)])
async def delete_course(course_id: int, db: AsyncSession = Depends(get_db)) -> None:
    course = await db.get(Course, course_id)
    if course is None:
        raise HTTPException(status_code=404, detail="Course not found")
    await db.delete(course)
    await db.commit()
