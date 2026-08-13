from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import require_admin
from app.core.database import get_db
from app.models.tab import TabPayment, TabPaymentMethod
from app.schemas.tab import TabPaymentMethodOut, TabPaymentMethodWrite

router = APIRouter(prefix="/api/tab-payment-methods", tags=["tab-payment-methods"])


@router.get("", response_model=list[TabPaymentMethodOut])
async def list_tab_payment_methods(
    db: AsyncSession = Depends(get_db),
) -> list[TabPaymentMethodOut]:
    result = await db.execute(select(TabPaymentMethod).order_by(TabPaymentMethod.name))
    return [TabPaymentMethodOut.from_model(m) for m in result.scalars().all()]


@router.post(
    "", response_model=TabPaymentMethodOut, status_code=201, dependencies=[Depends(require_admin)]
)
async def create_tab_payment_method(
    body: TabPaymentMethodWrite, db: AsyncSession = Depends(get_db)
) -> TabPaymentMethodOut:
    method = TabPaymentMethod(**body.model_dump())
    db.add(method)
    await db.commit()
    await db.refresh(method)
    return TabPaymentMethodOut.from_model(method)


@router.put(
    "/{method_id}", response_model=TabPaymentMethodOut, dependencies=[Depends(require_admin)]
)
async def update_tab_payment_method(
    method_id: int, body: TabPaymentMethodWrite, db: AsyncSession = Depends(get_db)
) -> TabPaymentMethodOut:
    method = await db.get(TabPaymentMethod, method_id)
    if method is None:
        raise HTTPException(status_code=404, detail="Tab payment method not found")

    for field, value in body.model_dump().items():
        setattr(method, field, value)

    await db.commit()
    await db.refresh(method)
    return TabPaymentMethodOut.from_model(method)


@router.delete("/{method_id}", status_code=204, dependencies=[Depends(require_admin)])
async def delete_tab_payment_method(method_id: int, db: AsyncSession = Depends(get_db)) -> None:
    method = await db.get(TabPaymentMethod, method_id)
    if method is None:
        raise HTTPException(status_code=404, detail="Tab payment method not found")

    in_use = await db.scalar(
        select(TabPayment.id).where(TabPayment.payment_method_id == method_id).limit(1)
    )
    if in_use is not None:
        raise HTTPException(
            status_code=400, detail="Cannot delete a payment method still used by tabs"
        )

    await db.delete(method)
    await db.commit()
