from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.models.product import Product
from app.schemas.common import Page
from app.schemas.product import ProductOut

router = APIRouter(prefix="/api/products", tags=["products"])

PAGE_SIZE = 6


@router.get("", response_model=Page[ProductOut])
async def list_products(
    page: int = Query(default=1, ge=1),
    db: AsyncSession = Depends(get_db),
) -> Page[ProductOut]:
    base_query = select(Product).where(Product.is_active.is_(True))

    total = await db.scalar(select(func.count()).select_from(base_query.subquery()))
    total = total or 0

    result = await db.execute(
        base_query.options(selectinload(Product.presentations))
        .order_by(Product.id)
        .offset((page - 1) * PAGE_SIZE)
        .limit(PAGE_SIZE)
    )
    products = result.scalars().all()

    return Page(
        items=[ProductOut.from_model(p) for p in products],
        page=page,
        page_size=PAGE_SIZE,
        total=total,
        total_pages=max(1, -(-total // PAGE_SIZE)),
    )
