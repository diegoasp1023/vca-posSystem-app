from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.auth import require_cajero_or_admin
from app.core.database import get_db
from app.models.menu_item import MenuItem
from app.models.product import Product
from app.models.tab import Tab, TabItem, TabPaymentMethod
from app.schemas.tab import TabCreate, TabItemAdd, TabItemUpdate, TabOut, TabPay, TabUpdate

router = APIRouter(
    prefix="/api/tabs", tags=["tabs"], dependencies=[Depends(require_cajero_or_admin)]
)

TAB_LOAD_OPTIONS = (selectinload(Tab.items), selectinload(Tab.payment_method))


def _today_start_utc() -> datetime:
    now = datetime.now(timezone.utc)
    return now.replace(hour=0, minute=0, second=0, microsecond=0)


async def _get_tab_or_404(db: AsyncSession, tab_id: int) -> Tab:
    tab = await db.get(Tab, tab_id, options=list(TAB_LOAD_OPTIONS), populate_existing=True)
    if tab is None:
        raise HTTPException(status_code=404, detail="Tab not found")
    return tab


@router.get("", response_model=list[TabOut])
async def list_tabs(db: AsyncSession = Depends(get_db)) -> list[TabOut]:
    result = await db.execute(
        select(Tab)
        .where(
            or_(
                Tab.status == "open",
                Tab.paid_at >= _today_start_utc(),
            )
        )
        .options(*TAB_LOAD_OPTIONS)
        .order_by(Tab.opened_at.desc())
    )
    return [TabOut.from_model(t) for t in result.scalars().all()]


@router.post("", response_model=TabOut, status_code=201)
async def create_tab(body: TabCreate, db: AsyncSession = Depends(get_db)) -> TabOut:
    tab = Tab(table_number=body.table_number, reference_note=body.reference_note)
    db.add(tab)
    await db.commit()
    tab = await _get_tab_or_404(db, tab.id)
    return TabOut.from_model(tab)


@router.patch("/{tab_id}", response_model=TabOut)
async def update_tab(
    tab_id: int, body: TabUpdate, db: AsyncSession = Depends(get_db)
) -> TabOut:
    tab = await _get_tab_or_404(db, tab_id)
    if tab.status != "open":
        raise HTTPException(status_code=400, detail="Cannot edit a paid tab")

    tab.table_number = body.table_number
    tab.reference_note = body.reference_note
    await db.commit()
    tab = await _get_tab_or_404(db, tab_id)
    return TabOut.from_model(tab)


@router.delete("/{tab_id}", status_code=204)
async def delete_tab(tab_id: int, db: AsyncSession = Depends(get_db)) -> None:
    tab = await _get_tab_or_404(db, tab_id)
    if tab.status != "open":
        raise HTTPException(status_code=400, detail="Cannot delete a paid tab")

    await db.delete(tab)
    await db.commit()


async def _resolve_source(
    db: AsyncSession, source_type: str, source_id: int
) -> tuple[str, str, int]:
    if source_type == "menu_item":
        item = await db.get(MenuItem, source_id)
        if item is None or not item.is_active or item.price_cop is None:
            raise HTTPException(status_code=400, detail="Unknown or unavailable menu item")
        return item.name_es, item.name_en, item.price_cop

    item_product = await db.get(Product, source_id)
    if item_product is None or not item_product.is_active:
        raise HTTPException(status_code=400, detail="Unknown or unavailable product")
    return item_product.name_es, item_product.name_en, item_product.price_cop


@router.post("/{tab_id}/items", response_model=TabOut, status_code=201)
async def add_tab_item(
    tab_id: int, body: TabItemAdd, db: AsyncSession = Depends(get_db)
) -> TabOut:
    tab = await _get_tab_or_404(db, tab_id)
    if tab.status != "open":
        raise HTTPException(status_code=400, detail="Cannot edit a paid tab")

    existing = next(
        (
            i
            for i in tab.items
            if i.source_type == body.source_type
            and (
                (body.source_type == "menu_item" and i.menu_item_id == body.source_id)
                or (body.source_type == "product" and i.product_id == body.source_id)
            )
        ),
        None,
    )
    if existing is not None:
        existing.quantity += body.quantity
    else:
        name_es, name_en, price_cop = await _resolve_source(db, body.source_type, body.source_id)
        db.add(
            TabItem(
                tab_id=tab.id,
                source_type=body.source_type,
                menu_item_id=body.source_id if body.source_type == "menu_item" else None,
                product_id=body.source_id if body.source_type == "product" else None,
                name_es=name_es,
                name_en=name_en,
                unit_price_cop=price_cop,
                quantity=body.quantity,
            )
        )

    await db.commit()
    tab = await _get_tab_or_404(db, tab_id)
    return TabOut.from_model(tab)


async def _get_tab_item_or_404(db: AsyncSession, tab_id: int, item_id: int) -> TabItem:
    item = await db.get(TabItem, item_id)
    if item is None or item.tab_id != tab_id:
        raise HTTPException(status_code=404, detail="Tab item not found")
    return item


@router.patch("/{tab_id}/items/{item_id}", response_model=TabOut)
async def update_tab_item(
    tab_id: int, item_id: int, body: TabItemUpdate, db: AsyncSession = Depends(get_db)
) -> TabOut:
    tab = await _get_tab_or_404(db, tab_id)
    if tab.status != "open":
        raise HTTPException(status_code=400, detail="Cannot edit a paid tab")

    item = await _get_tab_item_or_404(db, tab_id, item_id)
    item.quantity = body.quantity
    await db.commit()
    tab = await _get_tab_or_404(db, tab_id)
    return TabOut.from_model(tab)


@router.delete("/{tab_id}/items/{item_id}", response_model=TabOut)
async def delete_tab_item(
    tab_id: int, item_id: int, db: AsyncSession = Depends(get_db)
) -> TabOut:
    tab = await _get_tab_or_404(db, tab_id)
    if tab.status != "open":
        raise HTTPException(status_code=400, detail="Cannot edit a paid tab")

    item = await _get_tab_item_or_404(db, tab_id, item_id)
    await db.delete(item)
    await db.commit()
    tab = await _get_tab_or_404(db, tab_id)
    return TabOut.from_model(tab)


@router.post("/{tab_id}/pay", response_model=TabOut)
async def pay_tab(tab_id: int, body: TabPay, db: AsyncSession = Depends(get_db)) -> TabOut:
    tab = await _get_tab_or_404(db, tab_id)
    if tab.status != "open":
        raise HTTPException(status_code=400, detail="Tab is already paid")
    if not tab.items:
        raise HTTPException(status_code=400, detail="Cannot pay a tab with no items")

    method = await db.get(TabPaymentMethod, body.payment_method_id)
    if method is None:
        raise HTTPException(status_code=400, detail="Unknown payment_method_id")

    tab.status = "paid"
    tab.payment_method_id = method.id
    tab.paid_at = datetime.now(timezone.utc)
    await db.commit()
    tab = await _get_tab_or_404(db, tab_id)
    return TabOut.from_model(tab)


@router.post("/{tab_id}/reopen", response_model=TabOut)
async def reopen_tab(tab_id: int, db: AsyncSession = Depends(get_db)) -> TabOut:
    tab = await _get_tab_or_404(db, tab_id)
    if tab.status != "paid":
        raise HTTPException(status_code=400, detail="Tab is not paid")

    tab.status = "open"
    tab.payment_method_id = None
    tab.paid_at = None
    await db.commit()
    tab = await _get_tab_or_404(db, tab_id)
    return TabOut.from_model(tab)
