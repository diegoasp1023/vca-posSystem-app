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


PRODUCT_PAYLOAD = {
    "name_es": "Café Nuevo",
    "name_en": "New Coffee",
    "description_es": "Descripción",
    "description_en": "Description",
    "weight_grams": 500,
    "price_cop": 50000,
    "presentation_ids": [],
}


async def test_create_product_requires_auth(client):
    response = await client.post("/api/products", json=PRODUCT_PAYLOAD)

    assert response.status_code == 401


async def test_create_product_as_admin(admin_client):
    response = await admin_client.post("/api/products", json=PRODUCT_PAYLOAD)

    assert response.status_code == 201
    assert response.json()["name"]["es"] == "Café Nuevo"


async def test_update_product_as_admin(db_session, admin_client):
    product = await make_product(db_session)

    response = await admin_client.put(
        f"/api/products/{product.id}",
        json={**PRODUCT_PAYLOAD, "name_es": "Actualizado", "name_en": "Updated"},
    )

    assert response.status_code == 200
    assert response.json()["name"]["es"] == "Actualizado"


async def test_delete_product_as_admin(db_session, admin_client):
    product = await make_product(db_session)

    response = await admin_client.delete(f"/api/products/{product.id}")
    assert response.status_code == 204

    listing = (await admin_client.get("/api/products/admin?page=1")).json()
    assert listing["total"] == 0


async def test_admin_listing_includes_inactive(db_session, admin_client):
    await make_product(db_session, name_es="Activo", name_en="Active", is_active=True)
    await make_product(db_session, name_es="Inactivo", name_en="Inactive", is_active=False)

    response = (await admin_client.get("/api/products/admin?page=1")).json()

    assert response["total"] == 2
