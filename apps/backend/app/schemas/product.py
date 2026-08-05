from pydantic import BaseModel

from app.models.product import Product
from app.schemas.common import LocalizedText


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
