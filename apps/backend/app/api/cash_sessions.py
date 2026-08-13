from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import AuthenticatedUser, require_cajero_or_admin
from app.core.database import get_db
from app.models.cash_session import CashSession
from app.models.tab import Tab
from app.schemas.cash_session import CashSessionOut

router = APIRouter(
    prefix="/api/cash-sessions",
    tags=["cash-sessions"],
    dependencies=[Depends(require_cajero_or_admin)],
)


async def _get_open_session(db: AsyncSession) -> CashSession | None:
    result = await db.execute(select(CashSession).where(CashSession.status == "open"))
    return result.scalars().first()


@router.get("/current", response_model=CashSessionOut | None)
async def get_current_session(db: AsyncSession = Depends(get_db)) -> CashSessionOut | None:
    session = await _get_open_session(db)
    return CashSessionOut.from_model(session) if session is not None else None


@router.post("/open", response_model=CashSessionOut, status_code=201)
async def open_session(
    db: AsyncSession = Depends(get_db),
    user: AuthenticatedUser = Depends(require_cajero_or_admin),
) -> CashSessionOut:
    if await _get_open_session(db) is not None:
        raise HTTPException(status_code=400, detail="A cash session is already open")

    session = CashSession(status="open", opened_by=user.username)
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return CashSessionOut.from_model(session)


@router.post("/close", response_model=CashSessionOut)
async def close_session(
    db: AsyncSession = Depends(get_db),
    user: AuthenticatedUser = Depends(require_cajero_or_admin),
) -> CashSessionOut:
    session = await _get_open_session(db)
    if session is None:
        raise HTTPException(status_code=400, detail="No cash session is open")

    has_unpaid = await db.scalar(
        select(Tab.id).where(Tab.cash_session_id == session.id, Tab.status == "open").limit(1)
    )
    if has_unpaid is not None:
        raise HTTPException(
            status_code=400, detail="Cannot close the cash session while tabs remain unpaid"
        )

    session.status = "closed"
    session.closed_at = datetime.now(timezone.utc)
    session.closed_by = user.username
    await db.commit()
    await db.refresh(session)
    return CashSessionOut.from_model(session)
