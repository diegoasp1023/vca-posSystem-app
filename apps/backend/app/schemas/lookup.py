from pydantic import BaseModel

from app.schemas.common import LocalizedText


class LookupOut(BaseModel):
    id: int
    name: LocalizedText


class PresentationWrite(BaseModel):
    name_es: str
    name_en: str
