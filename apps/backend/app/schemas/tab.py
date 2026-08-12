from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

from app.models.tab import Tab, TabItem, TabPaymentMethod
from app.schemas.common import LocalizedText

SourceType = Literal["menu_item", "product"]


class TabPaymentMethodWrite(BaseModel):
    name: str = Field(min_length=1, max_length=50)
    is_active: bool = True


class TabPaymentMethodOut(BaseModel):
    id: int
    name: str
    is_active: bool

    @classmethod
    def from_model(cls, method: TabPaymentMethod) -> "TabPaymentMethodOut":
        return cls(
            id=method.id,
            name=method.name,
            is_active=method.is_active,
        )


class TabCreate(BaseModel):
    table_number: str | None = Field(default=None, max_length=50)
    reference_note: str | None = Field(default=None, max_length=200)


class TabUpdate(BaseModel):
    table_number: str | None = Field(default=None, max_length=50)
    reference_note: str | None = Field(default=None, max_length=200)


class TabItemAdd(BaseModel):
    source_type: SourceType
    source_id: int
    quantity: int = Field(default=1, gt=0)


class TabItemUpdate(BaseModel):
    quantity: int = Field(gt=0)


class TabPay(BaseModel):
    payment_method_id: int


class TabItemOut(BaseModel):
    id: int
    source_type: SourceType
    menu_item_id: int | None
    product_id: int | None
    name: LocalizedText
    unit_price_cop: int
    quantity: int
    subtotal_cop: int

    @classmethod
    def from_model(cls, item: TabItem) -> "TabItemOut":
        return cls(
            id=item.id,
            source_type=item.source_type,
            menu_item_id=item.menu_item_id,
            product_id=item.product_id,
            name=LocalizedText(es=item.name_es, en=item.name_en),
            unit_price_cop=item.unit_price_cop,
            quantity=item.quantity,
            subtotal_cop=item.unit_price_cop * item.quantity,
        )


class TabOut(BaseModel):
    id: int
    table_number: str | None
    reference_note: str | None
    status: Literal["open", "paid"]
    payment_method: TabPaymentMethodOut | None
    opened_at: datetime
    paid_at: datetime | None
    items: list[TabItemOut]
    total_cop: int

    @classmethod
    def from_model(cls, tab: Tab) -> "TabOut":
        items = [TabItemOut.from_model(item) for item in tab.items]
        return cls(
            id=tab.id,
            table_number=tab.table_number,
            reference_note=tab.reference_note,
            status=tab.status,  # type: ignore[arg-type]
            payment_method=(
                TabPaymentMethodOut.from_model(tab.payment_method)
                if tab.payment_method is not None
                else None
            ),
            opened_at=tab.opened_at,
            paid_at=tab.paid_at,
            items=items,
            total_cop=sum(item.subtotal_cop for item in items),
        )
