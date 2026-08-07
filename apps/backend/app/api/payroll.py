from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import require_admin
from app.core.database import get_db
from app.core.payroll import (
    eligible_employees_for_month,
    get_employee_base_pay,
    get_indefinido_pay,
    get_or_create_period,
    get_period_state,
    period_state_from_row,
)
from app.models.employee import Employee
from app.models.payroll import Bonus, TipPool, TipPoolParticipant
from app.schemas.payroll import (
    BonusOut,
    BonusWrite,
    NominaItemOut,
    PayrollPeriodOut,
    PayrollSummaryOut,
    SummaryItemOut,
    TipPoolOut,
    TipPoolWrite,
)

router = APIRouter(
    prefix="/api/payroll", tags=["payroll"], dependencies=[Depends(require_admin)]
)


async def _require_open_period(db: AsyncSession, year: int, month: int) -> None:
    state = await get_period_state(db, year, month)
    if state != "abierto":
        raise HTTPException(
            status_code=400, detail=f"Payroll period {year}-{month:02d} is {state}"
        )


@router.get("/period", response_model=PayrollPeriodOut)
async def read_period(
    year: int = Query(..., ge=2000, le=2100),
    month: int = Query(..., ge=1, le=12),
    db: AsyncSession = Depends(get_db),
) -> PayrollPeriodOut:
    period = await get_or_create_period(db, year, month)
    return PayrollPeriodOut(
        year=year,
        month=month,
        estado=period_state_from_row(period),
        cerrado_en=period.cerrado_en,
    )


@router.post("/period/close", response_model=PayrollPeriodOut)
async def close_period(
    year: int = Query(..., ge=2000, le=2100),
    month: int = Query(..., ge=1, le=12),
    db: AsyncSession = Depends(get_db),
) -> PayrollPeriodOut:
    period = await get_or_create_period(db, year, month)
    if period.cerrado:
        raise HTTPException(status_code=400, detail="This period is already closed")

    # Freeze indefinido salaries at their current value before locking the month.
    employees = await eligible_employees_for_month(db, year, month)
    for employee in employees:
        if employee.tipo_contrato == "indefinido":
            await get_indefinido_pay(db, employee, year, month, "cerrado")

    period.cerrado = True
    period.cerrado_en = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(period)
    return PayrollPeriodOut(
        year=year, month=month, estado="cerrado", cerrado_en=period.cerrado_en
    )


@router.get("/nomina", response_model=list[NominaItemOut])
async def read_nomina(
    year: int = Query(..., ge=2000, le=2100),
    month: int = Query(..., ge=1, le=12),
    db: AsyncSession = Depends(get_db),
) -> list[NominaItemOut]:
    state = await get_period_state(db, year, month)
    employees = await eligible_employees_for_month(db, year, month)
    items = []
    for employee in employees:
        monto = await get_employee_base_pay(db, employee, year, month, state)
        items.append(
            NominaItemOut(
                employee_id=employee.id,
                nombre=employee.nombre,
                apellido=employee.apellido,
                tipo_contrato=employee.tipo_contrato,  # type: ignore[arg-type]
                monto_cop=monto,
            )
        )
    return items


@router.get("/bonuses", response_model=list[BonusOut])
async def list_bonuses(
    year: int = Query(..., ge=2000, le=2100),
    month: int = Query(..., ge=1, le=12),
    db: AsyncSession = Depends(get_db),
) -> list[BonusOut]:
    result = await db.execute(
        select(Bonus).where(Bonus.year == year, Bonus.month == month).order_by(Bonus.id)
    )
    return [BonusOut.model_validate(b, from_attributes=True) for b in result.scalars().all()]


@router.post("/bonuses", response_model=BonusOut, status_code=201)
async def create_bonus(body: BonusWrite, db: AsyncSession = Depends(get_db)) -> BonusOut:
    await _require_open_period(db, body.year, body.month)

    employee = await db.get(Employee, body.employee_id)
    if employee is None:
        raise HTTPException(status_code=404, detail="Employee not found")

    bonus = Bonus(**body.model_dump())
    db.add(bonus)
    await db.commit()
    await db.refresh(bonus)
    return BonusOut.model_validate(bonus, from_attributes=True)


@router.delete("/bonuses/{bonus_id}", status_code=204)
async def delete_bonus(bonus_id: int, db: AsyncSession = Depends(get_db)) -> None:
    bonus = await db.get(Bonus, bonus_id)
    if bonus is None:
        raise HTTPException(status_code=404, detail="Bonus not found")
    await _require_open_period(db, bonus.year, bonus.month)

    await db.delete(bonus)
    await db.commit()


async def _tip_pool_out(db: AsyncSession, year: int, month: int) -> TipPoolOut:
    pool = await db.scalar(
        select(TipPool).where(TipPool.year == year, TipPool.month == month)
    )
    if pool is None:
        return TipPoolOut(
            year=year, month=month, monto_total_cop=0, participant_ids=[], monto_por_persona=0
        )

    result = await db.execute(
        select(TipPoolParticipant.employee_id).where(
            TipPoolParticipant.tip_pool_id == pool.id
        )
    )
    participant_ids = [row[0] for row in result.all()]
    per_person = (
        pool.monto_total_cop // len(participant_ids) if participant_ids else 0
    )
    return TipPoolOut(
        year=year,
        month=month,
        monto_total_cop=pool.monto_total_cop,
        participant_ids=participant_ids,
        monto_por_persona=per_person,
    )


@router.get("/tips", response_model=TipPoolOut)
async def read_tips(
    year: int = Query(..., ge=2000, le=2100),
    month: int = Query(..., ge=1, le=12),
    db: AsyncSession = Depends(get_db),
) -> TipPoolOut:
    return await _tip_pool_out(db, year, month)


@router.put("/tips", response_model=TipPoolOut)
async def update_tips(
    body: TipPoolWrite,
    year: int = Query(..., ge=2000, le=2100),
    month: int = Query(..., ge=1, le=12),
    db: AsyncSession = Depends(get_db),
) -> TipPoolOut:
    await _require_open_period(db, year, month)

    pool = await db.scalar(
        select(TipPool).where(TipPool.year == year, TipPool.month == month)
    )
    if pool is None:
        pool = TipPool(year=year, month=month, monto_total_cop=body.monto_total_cop)
        db.add(pool)
        await db.commit()
        await db.refresh(pool)
    else:
        pool.monto_total_cop = body.monto_total_cop
        await db.commit()

    await db.execute(
        TipPoolParticipant.__table__.delete().where(
            TipPoolParticipant.tip_pool_id == pool.id
        )
    )
    for employee_id in body.employee_ids:
        db.add(TipPoolParticipant(tip_pool_id=pool.id, employee_id=employee_id))
    await db.commit()

    return await _tip_pool_out(db, year, month)


@router.get("/summary", response_model=PayrollSummaryOut)
async def read_summary(
    year: int = Query(..., ge=2000, le=2100),
    month: int = Query(..., ge=1, le=12),
    db: AsyncSession = Depends(get_db),
) -> PayrollSummaryOut:
    state = await get_period_state(db, year, month)
    employees = await eligible_employees_for_month(db, year, month)

    bonuses_result = await db.execute(
        select(Bonus).where(Bonus.year == year, Bonus.month == month)
    )
    bonuses_by_employee: dict[int, int] = {}
    for bonus in bonuses_result.scalars().all():
        bonuses_by_employee[bonus.employee_id] = (
            bonuses_by_employee.get(bonus.employee_id, 0) + bonus.monto_cop
        )

    tips = await _tip_pool_out(db, year, month)
    tip_participant_ids = set(tips.participant_ids)

    items = []
    total_general = 0
    for employee in employees:
        pago_base = await get_employee_base_pay(db, employee, year, month, state)
        bonos = bonuses_by_employee.get(employee.id, 0)
        propina = tips.monto_por_persona if employee.id in tip_participant_ids else 0
        total = pago_base + bonos + propina
        total_general += total
        items.append(
            SummaryItemOut(
                employee_id=employee.id,
                nombre=employee.nombre,
                apellido=employee.apellido,
                pago_base_cop=pago_base,
                bonos_cop=bonos,
                propina_cop=propina,
                total_cop=total,
            )
        )

    return PayrollSummaryOut(
        year=year, month=month, items=items, total_general_cop=total_general
    )
