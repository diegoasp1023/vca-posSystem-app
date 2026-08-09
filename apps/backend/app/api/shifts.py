from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import extract, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import require_admin
from app.core.database import get_db
from app.core.payroll import get_period_state
from app.models.employee import Employee
from app.models.shift import Shift
from app.schemas.shift import MonthlyShiftSummary, ShiftOut, ShiftWrite

router = APIRouter(
    prefix="/api/shifts", tags=["shifts"], dependencies=[Depends(require_admin)]
)


@router.get("", response_model=MonthlyShiftSummary)
async def list_shifts_for_month(
    employee_id: int = Query(...),
    year: int = Query(..., ge=2000, le=2100),
    month: int = Query(..., ge=1, le=12),
    db: AsyncSession = Depends(get_db),
) -> MonthlyShiftSummary:
    result = await db.execute(
        select(Shift)
        .where(Shift.employee_id == employee_id)
        .where(extract("year", Shift.fecha) == year)
        .where(extract("month", Shift.fecha) == month)
        .order_by(Shift.fecha, Shift.hora_inicio)
    )
    shifts = [ShiftOut.from_model(s) for s in result.scalars().all()]

    return MonthlyShiftSummary(
        employee_id=employee_id,
        year=year,
        month=month,
        shifts=shifts,
        total_horas=round(sum(s.horas for s in shifts), 2),
        total_cop=sum(s.monto_cop for s in shifts),
    )


@router.post("", response_model=ShiftOut, status_code=201)
async def create_shift(body: ShiftWrite, db: AsyncSession = Depends(get_db)) -> ShiftOut:
    employee = await db.get(Employee, body.employee_id)
    if employee is None:
        raise HTTPException(status_code=404, detail="Employee not found")
    if employee.tipo_contrato != "por_horas":
        raise HTTPException(
            status_code=400, detail="Shifts can only be logged for hourly employees"
        )
    if not employee.is_active:
        raise HTTPException(status_code=400, detail="Employee is deactivated")

    state = await get_period_state(db, body.fecha.year, body.fecha.month)
    if state != "abierto":
        raise HTTPException(
            status_code=400, detail=f"Payroll period for {body.fecha} is {state}"
        )

    shift = Shift(
        employee_id=body.employee_id,
        fecha=body.fecha,
        hora_inicio=body.hora_inicio,
        hora_fin=body.hora_fin,
        tarifa_hora_cop=employee.salario_por_hora,
    )
    db.add(shift)
    await db.commit()
    await db.refresh(shift)
    return ShiftOut.from_model(shift)


@router.delete("/{shift_id}", status_code=204)
async def delete_shift(shift_id: int, db: AsyncSession = Depends(get_db)) -> None:
    shift = await db.get(Shift, shift_id)
    if shift is None:
        raise HTTPException(status_code=404, detail="Shift not found")

    state = await get_period_state(db, shift.fecha.year, shift.fecha.month)
    if state != "abierto":
        raise HTTPException(
            status_code=400, detail=f"Payroll period for {shift.fecha} is {state}"
        )

    await db.delete(shift)
    await db.commit()
