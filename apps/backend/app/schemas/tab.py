from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, model_validator

from app.models.tab import Tab, TabItem, TabPayment, TabPaymentMethod
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


class TabPaymentItemAllocationIn(BaseModel):
    item_id: int
    quantity: int = Field(gt=0)


class TabPaymentPartIn(BaseModel):
    payment_method_id: int
    tip_cop: int = Field(default=0, ge=0)
    amount_cop: int | None = Field(default=None, gt=0)
    item_allocations: list[TabPaymentItemAllocationIn] | None = None


class TabPay(BaseModel):
    parts: list[TabPaymentPartIn] = Field(min_length=1)

    @model_validator(mode="after")
    def _check_parts_consistent(self) -> "TabPay":
        by_items = [p.item_allocations is not None for p in self.parts]
        if any(by_items) and not all(by_items):
            raise ValueError("all parts must use item_allocations, or none of them")
        if not any(by_items):
            for part in self.parts:
                if part.amount_cop is None:
                    raise ValueError("amount_cop is required when not splitting by items")
        return self


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


class TabPaymentItemAllocationOut(BaseModel):
    item_id: int
    quantity: int


class TabPaymentOut(BaseModel):
    id: int
    payment_method: TabPaymentMethodOut
    amount_cop: int
    tip_cop: int
    item_allocations: list[TabPaymentItemAllocationOut]

    @classmethod
    def from_model(cls, payment: TabPayment) -> "TabPaymentOut":
        return cls(
            id=payment.id,
            payment_method=TabPaymentMethodOut.from_model(payment.payment_method),
            amount_cop=payment.amount_cop,
            tip_cop=payment.tip_cop,
            item_allocations=[
                TabPaymentItemAllocationOut(item_id=a.tab_item_id, quantity=a.quantity)
                for a in payment.item_allocations
            ],
        )


class TabOut(BaseModel):
    id: int
    account_type: AccountType
    table: TabTableInfo | None
    reference_note: str | None
    status: Literal["open", "paid"]
    payments: list[TabPaymentOut]
    opened_at: datetime
    paid_at: datetime | None
    items: list[TabItemOut]
    total_cop: int
    tip_total_cop: int
    grand_total_cop: int

    @classmethod
    def from_model(cls, tab: Tab) -> "TabOut":
        items = [TabItemOut.from_model(item) for item in tab.items]
        total_cop = sum(item.subtotal_cop for item in items)
        tip_total_cop = sum(payment.tip_cop for payment in tab.payments)
        return cls(
            id=tab.id,
            account_type=tab.account_type,  # type: ignore[arg-type]
            table=TabTableInfo(id=tab.table.id, name=tab.table.name) if tab.table else None,
            reference_note=tab.reference_note,
            status=tab.status,  # type: ignore[arg-type]
            payments=[TabPaymentOut.from_model(p) for p in tab.payments],
            opened_at=tab.opened_at,
            paid_at=tab.paid_at,
            items=items,
            total_cop=total_cop,
            tip_total_cop=tip_total_cop,
            grand_total_cop=total_cop + tip_total_cop,
        )
