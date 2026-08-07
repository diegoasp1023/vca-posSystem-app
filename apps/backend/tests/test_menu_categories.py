from tests.conftest import make_menu_category, make_menu_item


async def test_list_menu_categories_is_public(client):
    response = await client.get("/api/menu-categories")

    assert response.status_code == 200
    assert response.json() == []


async def test_list_menu_categories_ordered_by_sort_order(db_session, client):
    await make_menu_category(db_session, name_es="Segunda", name_en="Second", sort_order=2)
    await make_menu_category(db_session, name_es="Primera", name_en="First", sort_order=1)

    response = (await client.get("/api/menu-categories")).json()

    assert [c["name"]["es"] for c in response] == ["Primera", "Segunda"]


async def test_create_menu_category_requires_auth(client):
    response = await client.post(
        "/api/menu-categories",
        json={"name_es": "Bebidas frías", "name_en": "Cold drinks", "sort_order": 2},
    )

    assert response.status_code == 401


async def test_create_menu_category_as_admin(admin_client):
    response = await admin_client.post(
        "/api/menu-categories",
        json={"name_es": "Bebidas frías", "name_en": "Cold drinks", "sort_order": 2},
    )

    assert response.status_code == 201
    assert response.json()["name"]["es"] == "Bebidas frías"


async def test_update_menu_category_as_admin(db_session, admin_client):
    category = await make_menu_category(db_session)

    response = await admin_client.put(
        f"/api/menu-categories/{category.id}",
        json={"name_es": "Actualizada", "name_en": "Updated", "sort_order": 5},
    )

    assert response.status_code == 200
    assert response.json()["name"]["es"] == "Actualizada"


async def test_delete_menu_category_as_admin(db_session, admin_client):
    category = await make_menu_category(db_session)

    response = await admin_client.delete(f"/api/menu-categories/{category.id}")

    assert response.status_code == 204


async def test_delete_menu_category_with_items_is_rejected(db_session, admin_client):
    category = await make_menu_category(db_session)
    await make_menu_item(db_session, category=category)

    response = await admin_client.delete(f"/api/menu-categories/{category.id}")

    assert response.status_code == 400
