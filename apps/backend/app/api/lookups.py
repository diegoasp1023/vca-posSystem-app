from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.course import PaymentMethod
from app.models.product import Presentation
from app.schemas.common import LocalizedText
from app.schemas.lookup import LookupOut

router = APIRouter(prefix="/api", tags=["lookups"])


@router.get("/presentations", response_model=list[LookupOut])
async def list_presentations(db: AsyncSession = Depends(get_db)) -> list[LookupOut]:
    result = await db.execute(select(Presentation).order_by(Presentation.id))
    return [
        LookupOut(id=p.id, name=LocalizedText(es=p.name_es, en=p.name_en))
        for p in result.scalars().all()
    ]


@router.get("/payment-methods", response_model=list[LookupOut])
async def list_payment_methods(db: AsyncSession = Depends(get_db)) -> list[LookupOut]:
    result = await db.execute(select(PaymentMethod).order_by(PaymentMethod.id))
    return [
        LookupOut(id=m.id, name=LocalizedText(es=m.name_es, en=m.name_en))
        for m in result.scalars().all()
    ]
