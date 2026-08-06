from pydantic import BaseModel, Field

from app.models.product import Product
from app.schemas.common import LocalizedText


class ProductWrite(BaseModel):
    name_es: str = Field(min_length=1, max_length=120)
    name_en: str = Field(min_length=1, max_length=120)
    description_es: str = Field(min_length=1, max_length=500)
    description_en: str = Field(min_length=1, max_length=500)
    weight_grams: int = Field(gt=0)
    price_cop: int = Field(gt=0)
    image_url: str | None = None
    is_active: bool = True
    presentation_ids: list[int] = Field(min_length=1)


class ProductOut(BaseModel):
    id: int
    name: LocalizedText
    description: LocalizedText
    weight_grams: int
    price_cop: int
    image_url: str | None
    presentations: list[LocalizedText]

    @classmethod
    def from_model(cls, product: Product) -> "ProductOut":
        return cls(
            id=product.id,
            name=LocalizedText(es=product.name_es, en=product.name_en),
            description=LocalizedText(es=product.description_es, en=product.description_en),
            weight_grams=product.weight_grams,
            price_cop=product.price_cop,
            image_url=product.image_url,
            presentations=[
                LocalizedText(es=p.name_es, en=p.name_en) for p in product.presentations
            ],
        )
