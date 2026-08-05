from tests.conftest import make_product


async def test_products_are_paginated_six_per_page(db_session, client):
    for i in range(8):
        await make_product(db_session, name_es=f"Café {i}", name_en=f"Coffee {i}")

    page_1 = (await client.get("/api/products?page=1")).json()
    assert page_1["page_size"] == 6
    assert page_1["total"] == 8
    assert page_1["total_pages"] == 2
    assert len(page_1["items"]) == 6

    page_2 = (await client.get("/api/products?page=2")).json()
    assert len(page_2["items"]) == 2


async def test_inactive_products_are_excluded(db_session, client):
    await make_product(db_session, name_es="Activo", name_en="Active", is_active=True)
    await make_product(db_session, name_es="Inactivo", name_en="Inactive", is_active=False)

    response = (await client.get("/api/products?page=1")).json()

    assert response["total"] == 1
    assert response["items"][0]["name"]["es"] == "Activo"


async def test_product_shape_includes_localized_fields_and_presentations(db_session, client):
    await make_product(db_session)

    response = (await client.get("/api/products?page=1")).json()
    item = response["items"][0]

    assert item["name"] == {"es": "Café Test", "en": "Test Coffee"}
    assert item["presentations"] == []
