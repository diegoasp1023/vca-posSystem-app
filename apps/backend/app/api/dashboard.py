from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import require_admin
from app.core.dashboard import get_dashboard_metrics
from app.core.database import get_db
from app.schemas.dashboard import DashboardMetricsOut
from app.schemas.tab import AccountType

router = APIRouter(
    prefix="/api/dashboard", tags=["dashboard"], dependencies=[Depends(require_admin)]
)


@router.get("/metrics", response_model=DashboardMetricsOut)
async def read_dashboard_metrics(
    start_date: date | None = None,
    end_date: date | None = None,
    payment_method_id: int | None = None,
    account_type: AccountType | None = None,
    db: AsyncSession = Depends(get_db),
) -> DashboardMetricsOut:
    return await get_dashboard_metrics(db, start_date, end_date, payment_method_id, account_type)
