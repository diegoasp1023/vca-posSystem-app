import calendar
from datetime import date, datetime, time, timezone

from sqlalchemy import extract, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.payroll import TipPool
from app.models.shift import Shift
from app.models.tab import Tab, TabItem, TabPayment, TabPaymentMethod
from app.schemas.common import LocalizedText
from app.schemas.dashboard import (
    BusyHourPoint,
    DailySalesPoint,
    DashboardMetricsOut,
    LaborCostSummary,
    PaymentMethodBreakdown,
    SalesSummary,
    TipsSummary,
    TopProductOut,
)
from app.schemas.shift import horas_trabajadas

TOP_PRODUCTS_LIMIT = 10


def _paid_tab_filters(
    start_date: date | None, end_date: date | None, account_type: str | None
) -> list:
    filters = [Tab.status == "paid"]
    if start_date is not None:
        filters.append(Tab.paid_at >= datetime.combine(start_date, time.min, tzinfo=timezone.utc))
    if end_date is not None:
        filters.append(Tab.paid_at <= datetime.combine(end_date, time.max, tzinfo=timezone.utc))
    if account_type is not None:
        filters.append(Tab.account_type == account_type)
    return filters


async def _qualifying_tab_ids(
    db: AsyncSession,
    start_date: date | None,
    end_date: date | None,
    payment_method_id: int | None,
    account_type: str | None,
) -> list[int]:
    query = select(Tab.id).where(*_paid_tab_filters(start_date, end_date, account_type))
    if payment_method_id is not None:
        query = query.where(
            Tab.id.in_(
                select(TabPayment.tab_id).where(
                    TabPayment.payment_method_id == payment_method_id
                )
            )
        )
    result = await db.execute(query)
    return list(result.scalars().all())


async def _sales_summary(db: AsyncSession, tab_ids: list[int]) -> SalesSummary:
    if not tab_ids:
        return SalesSummary(
            total_revenue_cop=0, closed_tabs_count=0, average_ticket_cop=0, daily_series=[]
        )

    total_revenue_cop = await db.scalar(
        select(func.coalesce(func.sum(TabItem.unit_price_cop * TabItem.quantity), 0)).where(
            TabItem.tab_id.in_(tab_ids)
        )
    )
    total_revenue_cop = total_revenue_cop or 0
    closed_tabs_count = len(tab_ids)
    average_ticket_cop = round(total_revenue_cop / closed_tabs_count) if closed_tabs_count else 0

    result = await db.execute(
        select(
            func.date(Tab.paid_at).label("day"),
            func.coalesce(func.sum(TabItem.unit_price_cop * TabItem.quantity), 0),
            func.count(func.distinct(Tab.id)),
        )
        .join(TabItem, TabItem.tab_id == Tab.id)
        .where(Tab.id.in_(tab_ids))
        .group_by("day")
        .order_by("day")
    )
    daily_series = [
        DailySalesPoint(date=day, revenue_cop=revenue, tabs_count=count)
        for day, revenue, count in result.all()
    ]

    return SalesSummary(
        total_revenue_cop=total_revenue_cop,
        closed_tabs_count=closed_tabs_count,
        average_ticket_cop=average_ticket_cop,
        daily_series=daily_series,
    )


async def _top_products(db: AsyncSession, tab_ids: list[int]) -> list[TopProductOut]:
    if not tab_ids:
        return []

    result = await db.execute(
        select(
            TabItem.name_es,
            TabItem.name_en,
            func.sum(TabItem.quantity),
            func.sum(TabItem.unit_price_cop * TabItem.quantity),
        )
        .where(TabItem.tab_id.in_(tab_ids))
        .group_by(TabItem.name_es, TabItem.name_en)
        .order_by(func.sum(TabItem.quantity).desc())
        .limit(TOP_PRODUCTS_LIMIT)
    )
    return [
        TopProductOut(name=LocalizedText(es=name_es, en=name_en), quantity=quantity, revenue_cop=revenue)
        for name_es, name_en, quantity, revenue in result.all()
    ]


async def _payment_methods(db: AsyncSession, tab_ids: list[int]) -> list[PaymentMethodBreakdown]:
    if not tab_ids:
        return []

    result = await db.execute(
        select(
            TabPaymentMethod.name,
            func.coalesce(func.sum(TabPayment.amount_cop), 0),
            func.coalesce(func.sum(TabPayment.tip_cop), 0),
            func.count(func.distinct(TabPayment.tab_id)),
        )
        .join(TabPaymentMethod, TabPayment.payment_method_id == TabPaymentMethod.id)
        .where(TabPayment.tab_id.in_(tab_ids))
        .group_by(TabPaymentMethod.name)
        .order_by(func.sum(TabPayment.amount_cop).desc())
    )
    return [
        PaymentMethodBreakdown(name=name, revenue_cop=revenue, tips_cop=tips, tabs_count=count)
        for name, revenue, tips, count in result.all()
    ]


def _single_calendar_month(start_date: date | None, end_date: date | None) -> tuple[int, int] | None:
    if start_date is None or end_date is None:
        return None
    if start_date.year != end_date.year or start_date.month != end_date.month:
        return None
    last_day = calendar.monthrange(start_date.year, start_date.month)[1]
    if start_date.day != 1 or end_date.day != last_day:
        return None
    return start_date.year, start_date.month


async def _tips_summary(
    db: AsyncSession, tab_ids: list[int], start_date: date | None, end_date: date | None
) -> TipsSummary:
    calculated_total_cop = 0
    if tab_ids:
        calculated_total_cop = (
            await db.scalar(
                select(func.coalesce(func.sum(TabPayment.tip_cop), 0)).where(
                    TabPayment.tab_id.in_(tab_ids)
                )
            )
            or 0
        )

    declared_total_cop = None
    month = _single_calendar_month(start_date, end_date)
    if month is not None:
        year, month_number = month
        pool = await db.scalar(
            select(TipPool).where(TipPool.year == year, TipPool.month == month_number)
        )
        if pool is not None:
            declared_total_cop = pool.monto_total_cop

    average_tip_per_tab_cop = round(calculated_total_cop / len(tab_ids)) if tab_ids else 0

    return TipsSummary(
        calculated_total_cop=calculated_total_cop,
        declared_total_cop=declared_total_cop,
        average_tip_per_tab_cop=average_tip_per_tab_cop,
    )


async def _busy_hours(db: AsyncSession, tab_ids: list[int]) -> list[BusyHourPoint]:
    if not tab_ids:
        return []

    result = await db.execute(
        select(extract("hour", Tab.opened_at), func.count(Tab.id))
        .where(Tab.id.in_(tab_ids))
        .group_by(extract("hour", Tab.opened_at))
        .order_by(extract("hour", Tab.opened_at))
    )
    return [BusyHourPoint(hour=int(hour), tabs_opened_count=count) for hour, count in result.all()]


async def _average_tab_duration_minutes(db: AsyncSession, tab_ids: list[int]) -> float:
    if not tab_ids:
        return 0.0

    result = await db.execute(
        select(Tab.opened_at, Tab.paid_at).where(Tab.id.in_(tab_ids))
    )
    durations = [
        (paid_at - opened_at).total_seconds() / 60
        for opened_at, paid_at in result.all()
        if paid_at is not None
    ]
    return round(sum(durations) / len(durations), 1) if durations else 0.0


async def _labor_cost(
    db: AsyncSession, start_date: date | None, end_date: date | None
) -> LaborCostSummary:
    query = select(Shift.hora_inicio, Shift.hora_fin, Shift.tarifa_hora_cop)
    if start_date is not None:
        query = query.where(Shift.fecha >= start_date)
    if end_date is not None:
        query = query.where(Shift.fecha <= end_date)

    result = await db.execute(query)
    total_hours = 0.0
    total_cost_cop = 0
    for hora_inicio, hora_fin, tarifa_hora_cop in result.all():
        horas = horas_trabajadas(hora_inicio, hora_fin)
        total_hours += horas
        total_cost_cop += round(horas * tarifa_hora_cop)

    return LaborCostSummary(total_hours=round(total_hours, 2), total_cost_cop=total_cost_cop)


async def get_dashboard_metrics(
    db: AsyncSession,
    start_date: date | None,
    end_date: date | None,
    payment_method_id: int | None,
    account_type: str | None,
) -> DashboardMetricsOut:
    tab_ids = await _qualifying_tab_ids(db, start_date, end_date, payment_method_id, account_type)

    return DashboardMetricsOut(
        sales=await _sales_summary(db, tab_ids),
        top_products=await _top_products(db, tab_ids),
        payment_methods=await _payment_methods(db, tab_ids),
        tips=await _tips_summary(db, tab_ids, start_date, end_date),
        busy_hours=await _busy_hours(db, tab_ids),
        average_tab_duration_minutes=await _average_tab_duration_minutes(db, tab_ids),
        labor_cost=await _labor_cost(db, start_date, end_date),
    )
