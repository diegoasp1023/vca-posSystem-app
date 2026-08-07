from pydantic import BaseModel, Field

from app.models.menu_item import MenuCategory, MenuItem
from app.schemas.common import LocalizedText


class MenuCategoryWrite(BaseModel):
    name_es: str = Field(min_length=1, max_length=120)
    name_en: str = Field(min_length=1, max_length=120)
    sort_order: int = 0


class MenuCategoryOut(BaseModel):
    id: int
    name: LocalizedText
    sort_order: int

    @classmethod
    def from_model(cls, category: MenuCategory) -> "MenuCategoryOut":
        return cls(
            id=category.id,
            name=LocalizedText(es=category.name_es, en=category.name_en),
            sort_order=category.sort_order,
        )


class MenuItemWrite(BaseModel):
    category_id: int
    name_es: str = Field(min_length=1, max_length=150)
    name_en: str = Field(min_length=1, max_length=150)
    description_es: str | None = Field(default=None, max_length=500)
    description_en: str | None = Field(default=None, max_length=500)
    price_cop: int | None = Field(default=None, gt=0)
    image_url: str | None = Field(default=None, max_length=500)
    is_active: bool = True


class MenuItemOut(BaseModel):
    id: int
    category_id: int
    category: LocalizedText
    name: LocalizedText
    description: LocalizedText | None
    price_cop: int | None
    image_url: str | None
    is_active: bool

    @classmethod
    def from_model(cls, item: MenuItem) -> "MenuItemOut":
        has_description = item.description_es is not None and item.description_en is not None
        return cls(
            id=item.id,
            category_id=item.category_id,
            category=LocalizedText(es=item.category.name_es, en=item.category.name_en),
            name=LocalizedText(es=item.name_es, en=item.name_en),
            description=(
                LocalizedText(es=item.description_es, en=item.description_en)
                if has_description
                else None
            ),
            price_cop=item.price_cop,
            image_url=item.image_url,
            is_active=item.is_active,
        )
