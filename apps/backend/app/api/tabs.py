from datetime import date, datetime, time, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.auth import require_cajero_or_admin
from app.core.database import get_db
from app.models.cash_session import CashSession
from app.models.menu_item import MenuItem
from app.models.product import Product
from app.models.tab import Tab, TabItem, TabPayment, TabPaymentItemAllocation, TabPaymentMethod
from app.models.table import Table
from app.schemas.tab import TabCreate, TabItemAdd, TabItemUpdate, TabOut, TabPay, TabUpdate

router = APIRouter(
    prefix="/api/tabs", tags=["tabs"], dependencies=[Depends(require_cajero_or_admin)]
)

TAB_LOAD_OPTIONS = (
    selectinload(Tab.items),
    selectinload(Tab.payments).selectinload(TabPayment.payment_method),
    selectinload(Tab.payments).selectinload(TabPayment.item_allocations),
    selectinload(Tab.table),
)


async def _get_open_session(db: AsyncSession) -> CashSession | None:
    result = await db.execute(select(CashSession).where(CashSession.status == "open"))
    return result.scalars().first()


async def _get_tab_or_404(db: AsyncSession, tab_id: int) -> Tab:
    tab = await db.get(Tab, tab_id, options=list(TAB_LOAD_OPTIONS), populate_existing=True)
    if tab is None:
        raise HTTPException(status_code=404, detail="Tab not found")
    return tab


@router.get("", response_model=list[TabOut])
async def list_tabs(db: AsyncSession = Depends(get_db)) -> list[TabOut]:
    session = await _get_open_session(db)
    if session is None:
        return []

    result = await db.execute(
        select(Tab)
        .where(Tab.cash_session_id == session.id)
        .options(*TAB_LOAD_OPTIONS)
        .order_by(Tab.opened_at.desc())
    )
    return [TabOut.from_model(t) for t in result.scalars().all()]


@router.get("/history", response_model=list[TabOut])
async def list_tab_history(
    start_date: date | None = None,
    end_date: date | None = None,
    db: AsyncSession = Depends(get_db),
) -> list[TabOut]:
    query = (
        select(Tab)
        .where(Tab.status == "paid")
        .options(*TAB_LOAD_OPTIONS)
        .order_by(Tab.paid_at.desc())
    )
    if start_date is not None:
        query = query.where(Tab.paid_at >= datetime.combine(start_date, time.min, tzinfo=timezone.utc))
    if end_date is not None:
        query = query.where(Tab.paid_at <= datetime.combine(end_date, time.max, tzinfo=timezone.utc))

    result = await db.execute(query)
    return [TabOut.from_model(t) for t in result.scalars().all()]


@router.post("", response_model=TabOut, status_code=201)
async def create_tab(body: TabCreate, db: AsyncSession = Depends(get_db)) -> TabOut:
    session = await _get_open_session(db)
    if session is None:
        raise HTTPException(status_code=400, detail="No cash session is open")

    if body.table_id is not None:
        table = await db.get(Table, body.table_id)
        if table is None or table.kind != "table":
            raise HTTPException(status_code=400, detail="Unknown table_id")
        occupied = await db.scalar(
            select(Tab.id).where(Tab.table_id == body.table_id, Tab.status == "open")
        )
        if occupied is not None:
            raise HTTPException(status_code=400, detail="Table already has an open tab")

    tab = Tab(
        account_type=body.account_type,
        table_id=body.table_id,
        reference_note=body.reference_note,
        cash_session_id=session.id,
    )
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
    db: AsyncSession, source_type: str, source_id: int, unit_price_cop: int | None
) -> tuple[str, str, int]:
    if source_type == "menu_item":
        item = await db.get(MenuItem, source_id)
        if item is None or not item.is_active:
            raise HTTPException(status_code=400, detail="Unknown or unavailable menu item")
        if item.price_cop is None:
            if unit_price_cop is None:
                raise HTTPException(
                    status_code=400, detail="unit_price_cop is required for this menu item"
                )
            return item.name_es, item.name_en, unit_price_cop
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
            # A priceless menu item can be re-added at a different price/description each
            # time, so only merge quantities when those match an existing line exactly.
            and (body.unit_price_cop is None or i.unit_price_cop == body.unit_price_cop)
            and i.description == body.description
        ),
        None,
    )
    if existing is not None:
        existing.quantity += body.quantity
    else:
        name_es, name_en, price_cop = await _resolve_source(
            db, body.source_type, body.source_id, body.unit_price_cop
        )
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
                description=body.description,
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

    method_ids = {part.payment_method_id for part in body.parts}
    methods_result = await db.execute(
        select(TabPaymentMethod).where(TabPaymentMethod.id.in_(method_ids))
    )
    if len(methods_result.scalars().all()) != len(method_ids):
        raise HTTPException(status_code=400, detail="Unknown payment_method_id")

    items_by_id = {item.id: item for item in tab.items}
    by_items = body.parts[0].item_allocations is not None

    payments: list[TabPayment] = []

    if by_items:
        allocated_qty: dict[int, int] = dict.fromkeys(items_by_id, 0)
        for part in body.parts:
            amount = 0
            allocations: list[TabPaymentItemAllocation] = []
            for alloc in part.item_allocations or []:
                item = items_by_id.get(alloc.item_id)
                if item is None:
                    raise HTTPException(status_code=400, detail="Unknown item_id in allocation")
                allocated_qty[item.id] += alloc.quantity
                if allocated_qty[item.id] > item.quantity:
                    raise HTTPException(
                        status_code=400, detail="Allocated quantity exceeds item quantity"
                    )
                amount += item.unit_price_cop * alloc.quantity
                allocations.append(
                    TabPaymentItemAllocation(tab_item_id=item.id, quantity=alloc.quantity)
                )
            payments.append(
                TabPayment(
                    tab_id=tab.id,
                    payment_method_id=part.payment_method_id,
                    amount_cop=amount,
                    tip_cop=part.tip_cop,
                    item_allocations=allocations,
                )
            )
        if any(allocated_qty[item_id] != item.quantity for item_id, item in items_by_id.items()):
            raise HTTPException(
                status_code=400, detail="Every item quantity must be fully allocated"
            )
    else:
        tab_total = sum(item.unit_price_cop * item.quantity for item in tab.items)
        parts_total = sum(part.amount_cop or 0 for part in body.parts)
        if parts_total != tab_total:
            raise HTTPException(
                status_code=400, detail="Sum of part amounts must equal the tab total"
            )
        for part in body.parts:
            payments.append(
                TabPayment(
                    tab_id=tab.id,
                    payment_method_id=part.payment_method_id,
                    amount_cop=part.amount_cop,
                    tip_cop=part.tip_cop,
                )
            )

    for payment in payments:
        db.add(payment)

    tab.status = "paid"
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
    tab.paid_at = None
    tab.payments.clear()
    await db.commit()
    tab = await _get_tab_or_404(db, tab_id)
    return TabOut.from_model(tab)
