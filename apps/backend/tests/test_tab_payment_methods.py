from tests.conftest import make_tab, make_tab_payment, make_tab_payment_method


async def test_list_tab_payment_methods_is_public(client):
    response = await client.get("/api/tab-payment-methods")

    assert response.status_code == 200
    assert response.json() == []


async def test_list_tab_payment_methods_ordered_alphabetically(db_session, client):
    await make_tab_payment_method(db_session, name="Transferencia")
    await make_tab_payment_method(db_session, name="Efectivo")

    response = (await client.get("/api/tab-payment-methods")).json()

    assert [m["name"] for m in response] == ["Efectivo", "Transferencia"]


async def test_create_tab_payment_method_requires_admin(cajero_client):
    response = await cajero_client.post("/api/tab-payment-methods", json={"name": "Efectivo"})

    assert response.status_code == 403


async def test_create_tab_payment_method_as_admin(admin_client):
    response = await admin_client.post("/api/tab-payment-methods", json={"name": "Efectivo"})

    assert response.status_code == 201
    assert response.json()["name"] == "Efectivo"


async def test_update_tab_payment_method_as_admin(db_session, admin_client):
    method = await make_tab_payment_method(db_session)

    response = await admin_client.put(
        f"/api/tab-payment-methods/{method.id}",
        json={"name": "Actualizado", "is_active": False},
    )

    assert response.status_code == 200
    assert response.json()["name"] == "Actualizado"
    assert response.json()["is_active"] is False


async def test_delete_tab_payment_method_as_admin(db_session, admin_client):
    method = await make_tab_payment_method(db_session)

    response = await admin_client.delete(f"/api/tab-payment-methods/{method.id}")

    assert response.status_code == 204


async def test_delete_tab_payment_method_in_use_is_rejected(db_session, admin_client):
    method = await make_tab_payment_method(db_session)
    tab = await make_tab(db_session, status="paid")
    await make_tab_payment(db_session, tab, payment_method_id=method.id)

    response = await admin_client.delete(f"/api/tab-payment-methods/{method.id}")

    assert response.status_code == 400
