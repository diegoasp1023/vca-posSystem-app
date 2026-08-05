from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import courses, products
from app.core.config import settings

app = FastAPI(title="VCA POS Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(products.router)
app.include_router(courses.router)


@app.get("/api/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
