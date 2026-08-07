import os
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import select

from app.api import courses, employees, lookups, payroll, products, shifts, uploads
from app.core.config import settings
from app.core.database import async_session_factory
from app.core.uploads import sweep_orphaned_course_images
from app.models.course import Course


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None]:
    async with async_session_factory() as session:
        result = await session.execute(select(Course.image_url))
        active_urls = {url for url in result.scalars().all() if url is not None}
    sweep_orphaned_course_images(active_urls)
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


@app.get("/api/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
