from datetime import date
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import asc, desc, func, or_, select
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

SORTABLE_COLUMNS = {
    "nombre": Employee.nombre,
    "apellido": Employee.apellido,
    "is_active": Employee.is_active,
}


@router.get("/admin", response_model=Page[EmployeeOut])
async def list_employees(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10),
    search: str | None = Query(default=None),
    sort_by: Literal["nombre", "apellido", "is_active"] = Query(default="nombre"),
    sort_dir: Literal["asc", "desc"] = Query(default="asc"),
    db: AsyncSession = Depends(get_db),
) -> Page[EmployeeOut]:
    if page_size not in (10, 20, 50):
        raise HTTPException(status_code=422, detail="page_size must be 10, 20 or 50")

    base_query = select(Employee)
    if search:
        pattern = f"%{search}%"
        base_query = base_query.where(
            or_(
                Employee.nombre.ilike(pattern),
                Employee.apellido.ilike(pattern),
                Employee.numero_documento.ilike(pattern),
            )
        )

    total = await db.scalar(select(func.count()).select_from(base_query.subquery()))
    total = total or 0

    column = SORTABLE_COLUMNS[sort_by]
    order = asc(column) if sort_dir == "asc" else desc(column)

    result = await db.execute(
        base_query.order_by(order, Employee.id)
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    employees = result.scalars().all()

    return Page(
        items=[EmployeeOut.from_model(e) for e in employees],
        page=page,
        page_size=page_size,
        total=total,
        total_pages=max(1, -(-total // page_size)),
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
