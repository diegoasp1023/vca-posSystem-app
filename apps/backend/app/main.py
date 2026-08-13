import os
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import select

from app.api import (
    cash_sessions,
    courses,
    employees,
    lookups,
    menu_categories,
    menu_items,
    payroll,
    products,
    shifts,
    tab_payment_methods,
    tables,
    tabs,
    uploads,
)
from app.core.config import settings
from app.core.database import async_session_factory
from app.core.uploads import COURSE_IMAGES_SUBDIR, sweep_orphaned_images
from app.models.course import Course


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None]:
    async with async_session_factory() as session:
        course_result = await session.execute(select(Course.image_url))
        course_urls = {url for url in course_result.scalars().all() if url is not None}
    sweep_orphaned_images(COURSE_IMAGES_SUBDIR, course_urls)
    yield


app = FastAPI(title="VCA POS Backend", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs(settings.upload_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.upload_dir), name="uploads")

app.include_router(products.router)
app.include_router(courses.router)
app.include_router(lookups.router)
app.include_router(employees.router)
app.include_router(shifts.router)
app.include_router(payroll.router)
app.include_router(uploads.router)
app.include_router(menu_categories.router)
app.include_router(menu_items.router)
app.include_router(tables.router)
app.include_router(tabs.router)
app.include_router(tab_payment_methods.router)
app.include_router(cash_sessions.router)


@app.get("/api/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
