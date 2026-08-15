import calendar
from datetime import date, datetime, time, timezone

from sqlalchemy import extract, func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.employee import Employee
from app.models.payroll import PayrollPeriod, PayrollSnapshot
from app.models.shift import Shift
from app.models.tab import Tab, TabPayment
from app.schemas.payroll import PeriodState
from app.schemas.shift import ShiftOut


async def get_or_create_period(db: AsyncSession, year: int, month: int) -> PayrollPeriod:
    period = await db.scalar(
        select(PayrollPeriod).where(PayrollPeriod.year == year, PayrollPeriod.month == month)
    )
    if period is None:
        period = PayrollPeriod(year=year, month=month, cerrado=False)
        db.add(period)
        try:
            await db.commit()
        except IntegrityError:
            # Another concurrent request already created this period row.
            await db.rollback()
            period = await db.scalar(
                select(PayrollPeriod).where(
                    PayrollPeriod.year == year, PayrollPeriod.month == month
                )
            )
        else:
            await db.refresh(period)
    return period


def period_state_from_row(period: PayrollPeriod) -> PeriodState:
    return "cerrado" if period.cerrado else "abierto"


async def get_period_state(db: AsyncSession, year: int, month: int) -> PeriodState:
    period = await get_or_create_period(db, year, month)
    return period_state_from_row(period)


async def eligible_employees_for_month(
    db: AsyncSession, year: int, month: int
) -> list[Employee]:
    last_day = calendar.monthrange(year, month)[1]
    month_start = date(year, month, 1)
    month_end = date(year, month, last_day)

    result = await db.execute(
        select(Employee)
        .where(Employee.fecha_ingreso <= month_end)
        .where(
            or_(
                Employee.is_active.is_(True),
                Employee.fecha_baja >= month_start,
            )
        )
        .order_by(Employee.nombre, Employee.apellido)
    )
    return list(result.scalars().all())


async def get_por_horas_pay(db: AsyncSession, employee_id: int, year: int, month: int) -> int:
    result = await db.execute(
        select(Shift)
        .where(Shift.employee_id == employee_id)
        .where(extract("year", Shift.fecha) == year)
        .where(extract("month", Shift.fecha) == month)
    )
    shifts = result.scalars().all()
    return sum(ShiftOut.from_model(s).monto_cop for s in shifts)


async def get_indefinido_pay(
    db: AsyncSession, employee: Employee, year: int, month: int, state: PeriodState
) -> int:
    if state == "abierto":
        return employee.salario_mensual or 0

    snapshot = await db.scalar(
        select(PayrollSnapshot).where(
            PayrollSnapshot.employee_id == employee.id,
            PayrollSnapshot.year == year,
            PayrollSnapshot.month == month,
        )
    )
    if snapshot is None:
        snapshot = PayrollSnapshot(
            employee_id=employee.id,
            year=year,
            month=month,
            salario_mensual_congelado=employee.salario_mensual or 0,
        )
        db.add(snapshot)
        try:
            await db.commit()
        except IntegrityError:
            # Another concurrent request already created this snapshot.
            await db.rollback()
            snapshot = await db.scalar(
                select(PayrollSnapshot).where(
                    PayrollSnapshot.employee_id == employee.id,
                    PayrollSnapshot.year == year,
                    PayrollSnapshot.month == month,
                )
            )
        else:
            await db.refresh(snapshot)
    return snapshot.salario_mensual_congelado


async def sum_tips_for_month(db: AsyncSession, year: int, month: int) -> int:
    last_day = calendar.monthrange(year, month)[1]
    month_start = datetime.combine(date(year, month, 1), time.min, tzinfo=timezone.utc)
    month_end = datetime.combine(date(year, month, last_day), time.max, tzinfo=timezone.utc)

    total = await db.scalar(
        select(func.coalesce(func.sum(TabPayment.tip_cop), 0))
        .join(Tab, TabPayment.tab_id == Tab.id)
        .where(Tab.status == "paid")
        .where(Tab.paid_at >= month_start)
        .where(Tab.paid_at <= month_end)
    )
    return total or 0


async def get_employee_base_pay(
    db: AsyncSession, employee: Employee, year: int, month: int, state: PeriodState
) -> int:
    if employee.tipo_contrato == "por_horas":
        return await get_por_horas_pay(db, employee.id, year, month)
    return await get_indefinido_pay(db, employee, year, month, state)
