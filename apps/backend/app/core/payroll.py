import calendar
from datetime import date

from sqlalchemy import extract, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.employee import Employee
from app.models.payroll import PayrollPeriod, PayrollSettings, PayrollSnapshot
from app.models.shift import Shift
from app.schemas.payroll import PeriodState
from app.schemas.shift import ShiftOut


async def get_settings(db: AsyncSession) -> PayrollSettings:
    settings = await db.scalar(select(PayrollSettings).limit(1))
    if settings is None:
        settings = PayrollSettings(dia_cierre=5)
        db.add(settings)
        try:
            await db.commit()
        except IntegrityError:
            # Another concurrent request already created the singleton row.
            await db.rollback()
            settings = await db.scalar(select(PayrollSettings).limit(1))
        else:
            await db.refresh(settings)
    return settings


async def get_or_create_period(db: AsyncSession, year: int, month: int) -> PayrollPeriod:
    period = await db.scalar(
        select(PayrollPeriod).where(PayrollPeriod.year == year, PayrollPeriod.month == month)
    )
    if period is None:
        period = PayrollPeriod(year=year, month=month, aprobado=False)
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


def compute_period_state(year: int, month: int, dia_cierre: int, aprobado: bool) -> PeriodState:
    if aprobado:
        return "aprobado"
    close_year, close_month = (year, month + 1) if month < 12 else (year + 1, 1)
    close_date = date(close_year, close_month, dia_cierre)
    if date.today() >= close_date:
        return "cerrado"
    return "abierto"


async def get_period_state(db: AsyncSession, year: int, month: int) -> PeriodState:
    settings = await get_settings(db)
    period = await get_or_create_period(db, year, month)
    return compute_period_state(year, month, settings.dia_cierre, period.aprobado)


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


async def get_employee_base_pay(
    db: AsyncSession, employee: Employee, year: int, month: int, state: PeriodState
) -> int:
    if employee.tipo_contrato == "por_horas":
        return await get_por_horas_pay(db, employee.id, year, month)
    return await get_indefinido_pay(db, employee, year, month, state)
