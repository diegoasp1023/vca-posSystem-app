from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import require_admin
from app.core.database import get_db
from app.models.course import PaymentMethod
from app.models.product import Presentation
from app.schemas.common import LocalizedText
from app.schemas.lookup import LookupOut, PresentationWrite

router = APIRouter(prefix="/api", tags=["lookups"])


@router.get("/presentations", response_model=list[LookupOut])
async def list_presentations(db: AsyncSession = Depends(get_db)) -> list[LookupOut]:
    result = await db.execute(select(Presentation).order_by(Presentation.id))
    return [
        LookupOut(id=p.id, name=LocalizedText(es=p.name_es, en=p.name_en))
        for p in result.scalars().all()
    ]


@router.post(
    "/presentations", response_model=LookupOut, status_code=201, dependencies=[Depends(require_admin)]
)
async def create_presentation(
    body: PresentationWrite, db: AsyncSession = Depends(get_db)
) -> LookupOut:
    presentation = Presentation(**body.model_dump())
    db.add(presentation)
    await db.commit()
    await db.refresh(presentation)
    return LookupOut(
        id=presentation.id, name=LocalizedText(es=presentation.name_es, en=presentation.name_en)
    )


@router.put(
    "/presentations/{presentation_id}",
    response_model=LookupOut,
    dependencies=[Depends(require_admin)],
)
async def update_presentation(
    presentation_id: int, body: PresentationWrite, db: AsyncSession = Depends(get_db)
) -> LookupOut:
    presentation = await db.get(Presentation, presentation_id)
    if presentation is None:
        raise HTTPException(status_code=404, detail="Presentation not found")

    for field, value in body.model_dump().items():
        setattr(presentation, field, value)

    await db.commit()
    await db.refresh(presentation)
    return LookupOut(
        id=presentation.id, name=LocalizedText(es=presentation.name_es, en=presentation.name_en)
    )


@router.delete(
    "/presentations/{presentation_id}", status_code=204, dependencies=[Depends(require_admin)]
)
async def delete_presentation(
    presentation_id: int, db: AsyncSession = Depends(get_db)
) -> None:
    presentation = await db.get(Presentation, presentation_id)
    if presentation is None:
        raise HTTPException(status_code=404, detail="Presentation not found")

    await db.delete(presentation)
    await db.commit()


@router.get("/payment-methods", response_model=list[LookupOut])
async def list_payment_methods(db: AsyncSession = Depends(get_db)) -> list[LookupOut]:
    result = await db.execute(select(PaymentMethod).order_by(PaymentMethod.id))
    return [
        LookupOut(id=m.id, name=LocalizedText(es=m.name_es, en=m.name_en))
        for m in result.scalars().all()
    ]
