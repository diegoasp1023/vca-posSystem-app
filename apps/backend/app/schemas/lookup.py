from pydantic import BaseModel

from app.schemas.common import LocalizedText


class LookupOut(BaseModel):
    id: int
    name: LocalizedText
