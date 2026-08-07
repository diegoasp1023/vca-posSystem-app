from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import require_admin
from app.core.database import get_db
from app.models.menu_item import MenuCategory, MenuItem
from app.schemas.menu_item import MenuCategoryOut, MenuCategoryWrite

router = APIRouter(prefix="/api/menu-categories", tags=["menu-categories"])


@router.get("", response_model=list[MenuCategoryOut])
async def list_menu_categories(db: AsyncSession = Depends(get_db)) -> list[MenuCategoryOut]:
    result = await db.execute(select(MenuCategory).order_by(MenuCategory.sort_order, MenuCategory.id))
    return [MenuCategoryOut.from_model(c) for c in result.scalars().all()]


@router.post(
    "", response_model=MenuCategoryOut, status_code=201, dependencies=[Depends(require_admin)]
)
async def create_menu_category(
    body: MenuCategoryWrite, db: AsyncSession = Depends(get_db)
) -> MenuCategoryOut:
    category = MenuCategory(**body.model_dump())
    db.add(category)
    await db.commit()
    await db.refresh(category)
    return MenuCategoryOut.from_model(category)


@router.put(
    "/{category_id}", response_model=MenuCategoryOut, dependencies=[Depends(require_admin)]
)
async def update_menu_category(
    category_id: int, body: MenuCategoryWrite, db: AsyncSession = Depends(get_db)
) -> MenuCategoryOut:
    category = await db.get(MenuCategory, category_id)
    if category is None:
        raise HTTPException(status_code=404, detail="Menu category not found")

    for field, value in body.model_dump().items():
        setattr(category, field, value)

    await db.commit()
    await db.refresh(category)
    return MenuCategoryOut.from_model(category)


@router.delete("/{category_id}", status_code=204, dependencies=[Depends(require_admin)])
async def delete_menu_category(category_id: int, db: AsyncSession = Depends(get_db)) -> None:
    category = await db.get(MenuCategory, category_id)
    if category is None:
        raise HTTPException(status_code=404, detail="Menu category not found")

    has_items = await db.scalar(
        select(MenuItem.id).where(MenuItem.category_id == category_id).limit(1)
    )
    if has_items is not None:
        raise HTTPException(
            status_code=400, detail="Cannot delete a category that still has menu items"
        )

    await db.delete(category)
    await db.commit()
