from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

from app.models.table import Table

Shape = Literal["circle", "rect"]
Kind = Literal["table", "entrance", "bar", "cashier"]


class TableWrite(BaseModel):
    name: str = Field(min_length=1, max_length=50)
    kind: Kind = "table"
    shape: Shape = "circle"
    pos_x: float
    pos_y: float
    width: float = Field(gt=0)
    height: float = Field(gt=0)
    capacity: int | None = Field(default=None, gt=0)


class OpenTabSummary(BaseModel):
    tab_id: int
    total_cop: int
    opened_at: datetime


class TableOut(BaseModel):
    id: int
    name: str
    kind: Kind
    shape: Shape
    pos_x: float
    pos_y: float
    width: float
    height: float
    capacity: int | None
    open_tab: OpenTabSummary | None

    @classmethod
    def from_model(cls, table: Table, open_tab: OpenTabSummary | None) -> "TableOut":
        return cls(
            id=table.id,
            name=table.name,
            kind=table.kind,  # type: ignore[arg-type]
            shape=table.shape,  # type: ignore[arg-type]
            pos_x=table.pos_x,
            pos_y=table.pos_y,
            width=table.width,
            height=table.height,
            capacity=table.capacity,
            open_tab=open_tab,
        )
