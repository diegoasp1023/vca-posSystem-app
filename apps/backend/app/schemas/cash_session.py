from datetime import datetime
from typing import Literal

from pydantic import BaseModel

from app.models.cash_session import CashSession


class CashSessionOut(BaseModel):
    id: int
    status: Literal["open", "closed"]
    opened_at: datetime
    opened_by: str
    closed_at: datetime | None
    closed_by: str | None

    @classmethod
    def from_model(cls, session: CashSession) -> "CashSessionOut":
        return cls(
            id=session.id,
            status=session.status,  # type: ignore[arg-type]
            opened_at=session.opened_at,
            opened_by=session.opened_by,
            closed_at=session.closed_at,
            closed_by=session.closed_by,
        )
