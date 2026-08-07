from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.auth import require_admin
from app.core.database import get_db
from app.models.menu_item import MenuCategory, MenuItem
from app.schemas.common import Page
from app.schemas.menu_item import MenuItemOut, MenuItemWrite

router = APIRouter(prefix="/api/menu-items", tags=["menu-items"])

PAGE_SIZE = 10


@router.get("", response_model=list[MenuItemOut])
async def list_menu_items(db: AsyncSession = Depends(get_db)) -> list[MenuItemOut]:
    result = await db.execute(
        select(MenuItem)
        .where(MenuItem.is_active.is_(True))
        .options(selectinload(MenuItem.category))
        .join(MenuCategory)
        .order_by(MenuCategory.sort_order, MenuItem.name_es)
    )
    return [MenuItemOut.from_model(i) for i in result.scalars().all()]


@router.get(
    "/admin", response_model=Page[MenuItemOut], dependencies=[Depends(require_admin)]
)
async def list_menu_items_admin(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=PAGE_SIZE, ge=1, le=50),
    category_id: int | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
) -> Page[MenuItemOut]:
    base_query = select(MenuItem)
    if category_id is not None:
        base_query = base_query.where(MenuItem.category_id == category_id)

    total = await db.scalar(select(func.count()).select_from(base_query.subquery()))
    total = total or 0

    result = await db.execute(
        base_query.options(selectinload(MenuItem.category))
        .order_by(MenuItem.name_es)
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    items = result.scalars().all()

    return Page(
        items=[MenuItemOut.from_model(i) for i in items],
        page=page,
        page_size=page_size,
        total=total,
        total_pages=max(1, -(-total // page_size)),
    )


async def _get_category_or_400(db: AsyncSession, category_id: int) -> MenuCategory:
    category = await db.get(MenuCategory, category_id)
    if category is None:
        raise HTTPException(status_code=400, detail="Unknown category_id")
    return category


@router.post(
    "", response_model=MenuItemOut, status_code=201, dependencies=[Depends(require_admin)]
)
async def create_menu_item(body: MenuItemWrite, db: AsyncSession = Depends(get_db)) -> MenuItemOut:
    await _get_category_or_400(db, body.category_id)

    item = MenuItem(**body.model_dump())
    db.add(item)
    await db.commit()
    await db.refresh(item, attribute_names=["category"])
    return MenuItemOut.from_model(item)


@router.put(
    "/{item_id}", response_model=MenuItemOut, dependencies=[Depends(require_admin)]
)
async def update_menu_item(
    item_id: int, body: MenuItemWrite, db: AsyncSession = Depends(get_db)
) -> MenuItemOut:
    item = await db.get(MenuItem, item_id, options=[selectinload(MenuItem.category)])
    if item is None:
        raise HTTPException(status_code=404, detail="Menu item not found")

    await _get_category_or_400(db, body.category_id)

    for field, value in body.model_dump().items():
        setattr(item, field, value)

    await db.commit()
    await db.refresh(item, attribute_names=["category"])
    return MenuItemOut.from_model(item)


@router.delete("/{item_id}", status_code=204, dependencies=[Depends(require_admin)])
async def delete_menu_item(item_id: int, db: AsyncSession = Depends(get_db)) -> None:
    item = await db.get(MenuItem, item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Menu item not found")
    await db.delete(item)
    await db.commit()
