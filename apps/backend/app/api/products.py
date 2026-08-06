from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.auth import require_admin
from app.core.database import get_db
from app.models.product import Presentation, Product
from app.schemas.common import Page
from app.schemas.product import ProductOut, ProductWrite

router = APIRouter(prefix="/api/products", tags=["products"])

PAGE_SIZE = 6


@router.get("", response_model=Page[ProductOut])
async def list_products(
    page: int = Query(default=1, ge=1),
    db: AsyncSession = Depends(get_db),
) -> Page[ProductOut]:
    return await _paginate(db, page, only_active=True)


@router.get("/admin", response_model=Page[ProductOut], dependencies=[Depends(require_admin)])
async def list_products_admin(
    page: int = Query(default=1, ge=1),
    db: AsyncSession = Depends(get_db),
) -> Page[ProductOut]:
    return await _paginate(db, page, only_active=False)


async def _paginate(db: AsyncSession, page: int, only_active: bool) -> Page[ProductOut]:
    base_query = select(Product)
    if only_active:
        base_query = base_query.where(Product.is_active.is_(True))

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


async def _load_presentations(db: AsyncSession, ids: list[int]) -> list[Presentation]:
    if not ids:
        return []
    result = await db.execute(select(Presentation).where(Presentation.id.in_(ids)))
    presentations = result.scalars().all()
    if len(presentations) != len(set(ids)):
        raise HTTPException(status_code=400, detail="Unknown presentation_id")
    return list(presentations)


@router.post("", response_model=ProductOut, status_code=201, dependencies=[Depends(require_admin)])
async def create_product(
    body: ProductWrite, db: AsyncSession = Depends(get_db)
) -> ProductOut:
    presentations = await _load_presentations(db, body.presentation_ids)
    product = Product(
        **body.model_dump(exclude={"presentation_ids"}),
        presentations=presentations,
    )
    db.add(product)
    await db.commit()
    await db.refresh(product, attribute_names=["presentations"])
    return ProductOut.from_model(product)


@router.put("/{product_id}", response_model=ProductOut, dependencies=[Depends(require_admin)])
async def update_product(
    product_id: int, body: ProductWrite, db: AsyncSession = Depends(get_db)
) -> ProductOut:
    product = await db.get(Product, product_id, options=[selectinload(Product.presentations)])
    if product is None:
        raise HTTPException(status_code=404, detail="Product not found")

    for field, value in body.model_dump(exclude={"presentation_ids"}).items():
        setattr(product, field, value)
    product.presentations = await _load_presentations(db, body.presentation_ids)

    await db.commit()
    await db.refresh(product, attribute_names=["presentations"])
    return ProductOut.from_model(product)


@router.delete("/{product_id}", status_code=204, dependencies=[Depends(require_admin)])
async def delete_product(product_id: int, db: AsyncSession = Depends(get_db)) -> None:
    product = await db.get(Product, product_id)
    if product is None:
        raise HTTPException(status_code=404, detail="Product not found")
    await db.delete(product)
    await db.commit()
