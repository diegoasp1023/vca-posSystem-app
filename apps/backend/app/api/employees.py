from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import require_admin
from app.core.database import get_db
from app.models.employee import Employee
from app.schemas.common import Page
from app.schemas.employee import EmployeeOut, EmployeeWrite

router = APIRouter(
    prefix="/api/employees", tags=["employees"], dependencies=[Depends(require_admin)]
)

PAGE_SIZE = 10


@router.get("/admin", response_model=Page[EmployeeOut])
async def list_employees(
    page: int = Query(default=1, ge=1),
    db: AsyncSession = Depends(get_db),
) -> Page[EmployeeOut]:
    base_query = select(Employee)

    total = await db.scalar(select(func.count()).select_from(base_query.subquery()))
    total = total or 0

    result = await db.execute(
        base_query.order_by(Employee.id).offset((page - 1) * PAGE_SIZE).limit(PAGE_SIZE)
    )
    employees = result.scalars().all()

    return Page(
        items=[EmployeeOut.from_model(e) for e in employees],
        page=page,
        page_size=PAGE_SIZE,
        total=total,
        total_pages=max(1, -(-total // PAGE_SIZE)),
    )


@router.post("", response_model=EmployeeOut, status_code=201)
async def create_employee(
    body: EmployeeWrite, db: AsyncSession = Depends(get_db)
) -> EmployeeOut:
    employee = Employee(**body.model_dump())
    db.add(employee)
    try:
        await db.commit()
    except IntegrityError as error:
        await db.rollback()
        raise HTTPException(
            status_code=400, detail="numero_documento already exists"
        ) from error
    await db.refresh(employee)
    return EmployeeOut.from_model(employee)


@router.put("/{employee_id}", response_model=EmployeeOut)
async def update_employee(
    employee_id: int, body: EmployeeWrite, db: AsyncSession = Depends(get_db)
) -> EmployeeOut:
    employee = await db.get(Employee, employee_id)
    if employee is None:
        raise HTTPException(status_code=404, detail="Employee not found")

    for field, value in body.model_dump().items():
        setattr(employee, field, value)

    try:
        await db.commit()
    except IntegrityError as error:
        await db.rollback()
        raise HTTPException(
            status_code=400, detail="numero_documento already exists"
        ) from error
    await db.refresh(employee)
    return EmployeeOut.from_model(employee)


@router.post("/{employee_id}/deactivate", response_model=EmployeeOut)
async def deactivate_employee(
    employee_id: int, db: AsyncSession = Depends(get_db)
) -> EmployeeOut:
    employee = await db.get(Employee, employee_id)
    if employee is None:
        raise HTTPException(status_code=404, detail="Employee not found")

    employee.is_active = False
    employee.fecha_baja = date.today()
    await db.commit()
    await db.refresh(employee)
    return EmployeeOut.from_model(employee)


@router.post("/{employee_id}/reactivate", response_model=EmployeeOut)
async def reactivate_employee(
    employee_id: int, db: AsyncSession = Depends(get_db)
) -> EmployeeOut:
    employee = await db.get(Employee, employee_id)
    if employee is None:
        raise HTTPException(status_code=404, detail="Employee not found")

    employee.is_active = True
    employee.fecha_baja = None
    await db.commit()
    await db.refresh(employee)
    return EmployeeOut.from_model(employee)
