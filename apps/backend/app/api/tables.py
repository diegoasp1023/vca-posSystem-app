from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.auth import require_admin, require_cajero_or_admin
from app.core.database import get_db
from app.models.cash_session import CashSession
from app.models.tab import Tab, TabItem
from app.models.table import Table
from app.schemas.table import OpenTabSummary, TableOut, TableWrite

router = APIRouter(
    prefix="/api/tables", tags=["tables"], dependencies=[Depends(require_cajero_or_admin)]
)


async def _get_table_or_404(db: AsyncSession, table_id: int) -> Table:
    table = await db.get(Table, table_id)
    if table is None:
        raise HTTPException(status_code=404, detail="Table not found")
    return table


@router.get("", response_model=list[TableOut])
async def list_tables(db: AsyncSession = Depends(get_db)) -> list[TableOut]:
    tables_result = await db.execute(select(Table).order_by(Table.id))
    tables = tables_result.scalars().all()

    session = await db.scalar(select(CashSession).where(CashSession.status == "open"))
    open_tabs_by_table: dict[int, OpenTabSummary] = {}
    if session is not None:
        tabs_result = await db.execute(
            select(Tab)
            .where(
                Tab.cash_session_id == session.id,
                Tab.status == "open",
                Tab.table_id.is_not(None),
            )
            .options(selectinload(Tab.items))
        )
        for tab in tabs_result.scalars().all():
            total = sum(item.unit_price_cop * item.quantity for item in tab.items)
            open_tabs_by_table[tab.table_id] = OpenTabSummary(
                tab_id=tab.id, total_cop=total, opened_at=tab.opened_at
            )

    return [TableOut.from_model(t, open_tabs_by_table.get(t.id)) for t in tables]


@router.post("", response_model=TableOut, status_code=201, dependencies=[Depends(require_admin)])
async def create_table(body: TableWrite, db: AsyncSession = Depends(get_db)) -> TableOut:
    table = Table(**body.model_dump())
    db.add(table)
    await db.commit()
    await db.refresh(table)
    return TableOut.from_model(table, None)


@router.patch(
    "/{table_id}", response_model=TableOut, dependencies=[Depends(require_admin)]
)
async def update_table(
    table_id: int, body: TableWrite, db: AsyncSession = Depends(get_db)
) -> TableOut:
    table = await _get_table_or_404(db, table_id)
    for field, value in body.model_dump().items():
        setattr(table, field, value)
    await db.commit()
    await db.refresh(table)

    open_tab = await db.scalar(
        select(Tab).where(Tab.table_id == table_id, Tab.status == "open")
    )
    summary = None
    if open_tab is not None:
        items_result = await db.execute(select(TabItem).where(TabItem.tab_id == open_tab.id))
        items = items_result.scalars().all()
        summary = OpenTabSummary(
            tab_id=open_tab.id,
            total_cop=sum(item.unit_price_cop * item.quantity for item in items),
            opened_at=open_tab.opened_at,
        )
    return TableOut.from_model(table, summary)


@router.delete("/{table_id}", status_code=204, dependencies=[Depends(require_admin)])
async def delete_table(table_id: int, db: AsyncSession = Depends(get_db)) -> None:
    table = await _get_table_or_404(db, table_id)

    open_tab = await db.scalar(
        select(Tab.id).where(Tab.table_id == table_id, Tab.status == "open")
    )
    if open_tab is not None:
        raise HTTPException(status_code=400, detail="Cannot delete a table with an open tab")

    await db.delete(table)
    await db.commit()
