from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, model_validator

from app.models.tab import Tab, TabItem, TabPaymentMethod
from app.schemas.common import LocalizedText

SourceType = Literal["menu_item", "product"]
AccountType = Literal["dine_in", "takeaway", "custom"]


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
    account_type: AccountType
    table_id: int | None = None
    reference_note: str | None = Field(default=None, max_length=200)

    @model_validator(mode="after")
    def _check_fields_match_account_type(self) -> "TabCreate":
        if self.account_type == "dine_in" and self.table_id is None:
            raise ValueError("dine_in accounts require a table_id")
        if self.account_type != "dine_in" and self.table_id is not None:
            raise ValueError("only dine_in accounts can have a table_id")
        return self


class TabUpdate(BaseModel):
    reference_note: str | None = Field(default=None, max_length=200)


class TabItemAdd(BaseModel):
    source_type: SourceType
    source_id: int
    quantity: int = Field(default=1, gt=0)
    unit_price_cop: int | None = Field(default=None, gt=0)
    description: str | None = Field(default=None, max_length=200)


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
    description: str | None
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
            description=item.description,
            subtotal_cop=item.unit_price_cop * item.quantity,
        )


class TabTableInfo(BaseModel):
    id: int
    name: str


class TabOut(BaseModel):
    id: int
    account_type: AccountType
    table: TabTableInfo | None
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
            account_type=tab.account_type,  # type: ignore[arg-type]
            table=TabTableInfo(id=tab.table.id, name=tab.table.name) if tab.table else None,
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
