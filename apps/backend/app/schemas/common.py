from typing import Generic, TypeVar

from pydantic import BaseModel

T = TypeVar("T")


class LocalizedText(BaseModel):
    es: str
    en: str


class Page(BaseModel, Generic[T]):
    items: list[T]
    page: int
    page_size: int
    total: int
    total_pages: int
