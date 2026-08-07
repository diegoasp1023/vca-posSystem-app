from tests.conftest import make_menu_category, make_menu_item

MENU_ITEM_PAYLOAD = {
    "name_es": "Americano 9 Oz",
    "name_en": "Americano 9 oz",
    "price_cop": 8000,
}


async def test_list_menu_items_is_public_and_active_only(db_session, client):
    category = await make_menu_category(db_session)
    await make_menu_item(db_session, category=category, name_es="Activo", name_en="Active", is_active=True)
    await make_menu_item(
        db_session, category=category, name_es="Inactivo", name_en="Inactive", is_active=False
    )

    response = (await client.get("/api/menu-items")).json()

    assert [item["name"]["es"] for item in response] == ["Activo"]


async def test_list_menu_items_ordered_by_category_sort_order(db_session, client):
    hot = await make_menu_category(db_session, name_es="Bebidas calientes", name_en="Hot", sort_order=1)
    cold = await make_menu_category(db_session, name_es="Bebidas frías", name_en="Cold", sort_order=2)
    await make_menu_item(db_session, category=cold, name_es="Agua", name_en="Water")
    await make_menu_item(db_session, category=hot, name_es="Americano", name_en="Americano")

    response = (await client.get("/api/menu-items")).json()

    assert [item["category"]["es"] for item in response] == ["Bebidas calientes", "Bebidas frías"]


async def test_menu_item_optional_fields_default_to_none(db_session, client):
    category = await make_menu_category(db_session)
    await make_menu_item(
        db_session, category=category, price_cop=None, description_es=None, description_en=None
    )

    response = (await client.get("/api/menu-items")).json()
    item = response[0]

    assert item["price_cop"] is None
    assert item["description"] is None


async def test_menu_items_admin_listing_requires_auth(client):
    response = await client.get("/api/menu-items/admin")

    assert response.status_code == 401


async def test_menu_items_admin_are_paginated(db_session, admin_client):
    category = await make_menu_category(db_session)
    for i in range(12):
        await make_menu_item(db_session, category=category, name_es=f"Item {i}", name_en=f"Item {i}")

    page_1 = (await admin_client.get("/api/menu-items/admin?page=1")).json()
    assert page_1["page_size"] == 10
    assert page_1["total"] == 12
    assert len(page_1["items"]) == 10

    page_2 = (await admin_client.get("/api/menu-items/admin?page=2")).json()
    assert len(page_2["items"]) == 2


async def test_menu_items_admin_includes_inactive(db_session, admin_client):
    category = await make_menu_category(db_session)
    await make_menu_item(db_session, category=category, is_active=False)

    response = (await admin_client.get("/api/menu-items/admin")).json()

    assert response["total"] == 1


async def test_menu_items_admin_filtered_by_category(db_session, admin_client):
    hot = await make_menu_category(db_session, name_es="Bebidas calientes", name_en="Hot")
    cold = await make_menu_category(db_session, name_es="Bebidas frías", name_en="Cold", sort_order=2)
    await make_menu_item(db_session, category=hot)
    await make_menu_item(db_session, category=cold, name_es="Agua", name_en="Water")

    response = (await admin_client.get(f"/api/menu-items/admin?category_id={cold.id}")).json()

    assert response["total"] == 1
    assert response["items"][0]["name"]["es"] == "Agua"


async def test_create_menu_item_requires_auth(client):
    response = await client.post("/api/menu-items", json={**MENU_ITEM_PAYLOAD, "category_id": 1})

    assert response.status_code == 401


async def test_create_menu_item_as_admin(db_session, admin_client):
    category = await make_menu_category(db_session)

    response = await admin_client.post(
        "/api/menu-items", json={**MENU_ITEM_PAYLOAD, "category_id": category.id}
    )

    assert response.status_code == 201
    assert response.json()["name"]["es"] == "Americano 9 Oz"


async def test_create_menu_item_with_unknown_category_is_rejected(admin_client):
    response = await admin_client.post(
        "/api/menu-items", json={**MENU_ITEM_PAYLOAD, "category_id": 999}
    )

    assert response.status_code == 400


async def test_update_menu_item_as_admin(db_session, admin_client):
    category = await make_menu_category(db_session)
    item = await make_menu_item(db_session, category=category)

    response = await admin_client.put(
        f"/api/menu-items/{item.id}",
        json={**MENU_ITEM_PAYLOAD, "category_id": category.id, "name_es": "Actualizado"},
    )

    assert response.status_code == 200
    assert response.json()["name"]["es"] == "Actualizado"


async def test_delete_menu_item_as_admin(db_session, admin_client):
    category = await make_menu_category(db_session)
    item = await make_menu_item(db_session, category=category)

    response = await admin_client.delete(f"/api/menu-items/{item.id}")

    assert response.status_code == 204
