from tests.conftest import make_tab, make_tab_payment_method


async def test_list_tab_payment_methods_is_public(client):
    response = await client.get("/api/tab-payment-methods")

    assert response.status_code == 200
    assert response.json() == []


async def test_list_tab_payment_methods_ordered_by_sort_order(db_session, client):
    await make_tab_payment_method(db_session, name_es="Segundo", name_en="Second", sort_order=2)
    await make_tab_payment_method(db_session, name_es="Primero", name_en="First", sort_order=1)

    response = (await client.get("/api/tab-payment-methods")).json()

    assert [m["name"]["es"] for m in response] == ["Primero", "Segundo"]


async def test_create_tab_payment_method_requires_admin(cajero_client):
    response = await cajero_client.post(
        "/api/tab-payment-methods", json={"name_es": "Efectivo", "name_en": "Cash"}
    )

    assert response.status_code == 403


async def test_create_tab_payment_method_as_admin(admin_client):
    response = await admin_client.post(
        "/api/tab-payment-methods", json={"name_es": "Efectivo", "name_en": "Cash"}
    )

    assert response.status_code == 201
    assert response.json()["name"]["es"] == "Efectivo"


async def test_update_tab_payment_method_as_admin(db_session, admin_client):
    method = await make_tab_payment_method(db_session)

    response = await admin_client.put(
        f"/api/tab-payment-methods/{method.id}",
        json={"name_es": "Actualizado", "name_en": "Updated", "is_active": False, "sort_order": 1},
    )

    assert response.status_code == 200
    assert response.json()["name"]["es"] == "Actualizado"
    assert response.json()["is_active"] is False


async def test_delete_tab_payment_method_as_admin(db_session, admin_client):
    method = await make_tab_payment_method(db_session)

    response = await admin_client.delete(f"/api/tab-payment-methods/{method.id}")

    assert response.status_code == 204


async def test_delete_tab_payment_method_in_use_is_rejected(db_session, admin_client):
    method = await make_tab_payment_method(db_session)
    await make_tab(db_session, status="paid", payment_method_id=method.id)

    response = await admin_client.delete(f"/api/tab-payment-methods/{method.id}")

    assert response.status_code == 400
