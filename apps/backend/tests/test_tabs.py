from tests.conftest import (
    make_cash_session,
    make_menu_item,
    make_product,
    make_tab,
    make_tab_item,
    make_tab_payment_method,
    make_table,
)


async def test_list_tabs_requires_auth(client):
    response = await client.get("/api/tabs")

    assert response.status_code == 401


async def test_list_tabs_rejects_wrong_role(employee_client):
    response = await employee_client.get("/api/tabs")

    assert response.status_code == 403


async def test_list_tabs_as_cajero(cajero_client):
    response = await cajero_client.get("/api/tabs")

    assert response.status_code == 200
    assert response.json() == []


async def test_list_tabs_as_admin(admin_client):
    response = await admin_client.get("/api/tabs")

    assert response.status_code == 200


async def test_list_tabs_is_empty_without_open_cash_session(db_session, cajero_client):
    await make_tab(db_session)

    response = await cajero_client.get("/api/tabs")

    assert response.json() == []


async def test_list_tabs_excludes_tabs_from_other_sessions(db_session, cajero_client):
    other_session = await make_cash_session(db_session, status="closed")
    current_session = await make_cash_session(db_session)
    other_tab = await make_tab(db_session, cash_session_id=other_session.id)
    current_tab = await make_tab(db_session, cash_session_id=current_session.id)

    response = await cajero_client.get("/api/tabs")

    ids = [t["id"] for t in response.json()]
    assert current_tab.id in ids
    assert other_tab.id not in ids


async def test_create_dine_in_tab(db_session, cajero_client):
    await make_cash_session(db_session)
    table = await make_table(db_session, name="Mesa 3")

    response = await cajero_client.post(
        "/api/tabs", json={"account_type": "dine_in", "table_id": table.id}
    )

    assert response.status_code == 201
    body = response.json()
    assert body["account_type"] == "dine_in"
    assert body["table"] == {"id": table.id, "name": "Mesa 3"}
    assert body["status"] == "open"
    assert body["items"] == []
    assert body["total_cop"] == 0


async def test_create_takeaway_tab(db_session, cajero_client):
    await make_cash_session(db_session)

    response = await cajero_client.post(
        "/api/tabs", json={"account_type": "takeaway", "reference_note": "Juan"}
    )

    assert response.status_code == 201
    body = response.json()
    assert body["account_type"] == "takeaway"
    assert body["table"] is None


async def test_create_custom_tab_without_reference_note(db_session, cajero_client):
    await make_cash_session(db_session)

    response = await cajero_client.post("/api/tabs", json={"account_type": "custom"})

    assert response.status_code == 201
    assert response.json()["reference_note"] is None


async def test_create_dine_in_tab_requires_table_id(db_session, cajero_client):
    await make_cash_session(db_session)

    response = await cajero_client.post("/api/tabs", json={"account_type": "dine_in"})

    assert response.status_code == 422


async def test_create_takeaway_tab_rejects_table_id(db_session, cajero_client):
    await make_cash_session(db_session)
    table = await make_table(db_session)

    response = await cajero_client.post(
        "/api/tabs", json={"account_type": "takeaway", "table_id": table.id}
    )

    assert response.status_code == 422


async def test_create_dine_in_tab_rejects_occupied_table(db_session, cajero_client):
    session = await make_cash_session(db_session)
    table = await make_table(db_session)
    await make_tab(
        db_session, account_type="dine_in", table_id=table.id, cash_session_id=session.id
    )

    response = await cajero_client.post(
        "/api/tabs", json={"account_type": "dine_in", "table_id": table.id}
    )

    assert response.status_code == 400


async def test_create_dine_in_tab_rejects_landmark(db_session, cajero_client):
    await make_cash_session(db_session)
    landmark = await make_table(db_session, kind="entrance")

    response = await cajero_client.post(
        "/api/tabs", json={"account_type": "dine_in", "table_id": landmark.id}
    )

    assert response.status_code == 400


async def test_create_tab_without_open_session_is_rejected(cajero_client):
    response = await cajero_client.post(
        "/api/tabs", json={"account_type": "custom", "reference_note": "Juan"}
    )

    assert response.status_code == 400


async def test_update_open_tab(db_session, cajero_client):
    tab = await make_tab(db_session)

    response = await cajero_client.patch(
        f"/api/tabs/{tab.id}", json={"reference_note": "Mesa 5"}
    )

    assert response.status_code == 200
    assert response.json()["reference_note"] == "Mesa 5"


async def test_delete_open_tab(db_session, cajero_client):
    tab = await make_tab(db_session)

    response = await cajero_client.delete(f"/api/tabs/{tab.id}")

    assert response.status_code == 204


async def test_delete_paid_tab_is_rejected(db_session, cajero_client):
    tab = await make_tab(db_session, status="paid")

    response = await cajero_client.delete(f"/api/tabs/{tab.id}")

    assert response.status_code == 400


async def test_add_menu_item_to_tab_snapshots_name_and_price(db_session, cajero_client):
    session = await make_cash_session(db_session)
    tab = await make_tab(db_session, cash_session_id=session.id)
    menu_item = await make_menu_item(db_session, price_cop=9900)

    response = await cajero_client.post(
        f"/api/tabs/{tab.id}/items",
        json={"source_type": "menu_item", "source_id": menu_item.id, "quantity": 2},
    )

    assert response.status_code == 201
    body = response.json()
    assert len(body["items"]) == 1
    item = body["items"][0]
    assert item["quantity"] == 2
    assert item["unit_price_cop"] == 9900
    assert item["subtotal_cop"] == 19800
    assert body["total_cop"] == 19800

    # Changing the catalog price afterwards must not affect the existing tab item.
    menu_item.price_cop = 15000
    await db_session.commit()

    refreshed = await cajero_client.get("/api/tabs")
    refreshed_item = next(t for t in refreshed.json() if t["id"] == tab.id)["items"][0]
    assert refreshed_item["unit_price_cop"] == 9900


async def test_add_product_to_tab(db_session, cajero_client):
    tab = await make_tab(db_session)
    product = await make_product(db_session, price_cop=47000)

    response = await cajero_client.post(
        f"/api/tabs/{tab.id}/items",
        json={"source_type": "product", "source_id": product.id, "quantity": 1},
    )

    assert response.status_code == 201
    assert response.json()["items"][0]["source_type"] == "product"


async def test_adding_same_item_twice_increments_quantity(db_session, cajero_client):
    tab = await make_tab(db_session)
    menu_item = await make_menu_item(db_session)

    await cajero_client.post(
        f"/api/tabs/{tab.id}/items",
        json={"source_type": "menu_item", "source_id": menu_item.id, "quantity": 1},
    )
    response = await cajero_client.post(
        f"/api/tabs/{tab.id}/items",
        json={"source_type": "menu_item", "source_id": menu_item.id, "quantity": 2},
    )

    body = response.json()
    assert len(body["items"]) == 1
    assert body["items"][0]["quantity"] == 3


async def test_add_item_rejects_inactive_menu_item(db_session, cajero_client):
    tab = await make_tab(db_session)
    menu_item = await make_menu_item(db_session, is_active=False)

    response = await cajero_client.post(
        f"/api/tabs/{tab.id}/items",
        json={"source_type": "menu_item", "source_id": menu_item.id, "quantity": 1},
    )

    assert response.status_code == 400


async def test_add_item_rejects_menu_item_without_price_and_no_override(db_session, cajero_client):
    tab = await make_tab(db_session)
    menu_item = await make_menu_item(db_session, price_cop=None)

    response = await cajero_client.post(
        f"/api/tabs/{tab.id}/items",
        json={"source_type": "menu_item", "source_id": menu_item.id, "quantity": 1},
    )

    assert response.status_code == 400


async def test_add_priceless_menu_item_with_price_and_description(db_session, cajero_client):
    tab = await make_tab(db_session)
    menu_item = await make_menu_item(db_session, price_cop=None)

    response = await cajero_client.post(
        f"/api/tabs/{tab.id}/items",
        json={
            "source_type": "menu_item",
            "source_id": menu_item.id,
            "quantity": 1,
            "unit_price_cop": 8000,
            "description": "Combo especial",
        },
    )

    assert response.status_code == 201
    item = response.json()["items"][0]
    assert item["unit_price_cop"] == 8000
    assert item["description"] == "Combo especial"


async def test_add_priced_menu_item_ignores_price_override(db_session, cajero_client):
    tab = await make_tab(db_session)
    menu_item = await make_menu_item(db_session, price_cop=9900)

    response = await cajero_client.post(
        f"/api/tabs/{tab.id}/items",
        json={
            "source_type": "menu_item",
            "source_id": menu_item.id,
            "quantity": 1,
            "unit_price_cop": 1,
        },
    )

    assert response.status_code == 201
    assert response.json()["items"][0]["unit_price_cop"] == 9900


async def test_update_tab_item_quantity(db_session, cajero_client):
    tab = await make_tab(db_session)
    item = await make_tab_item(db_session, tab)

    response = await cajero_client.patch(
        f"/api/tabs/{tab.id}/items/{item.id}", json={"quantity": 5}
    )

    assert response.status_code == 200
    assert response.json()["items"][0]["quantity"] == 5


async def test_delete_tab_item(db_session, cajero_client):
    tab = await make_tab(db_session)
    item = await make_tab_item(db_session, tab)

    response = await cajero_client.delete(f"/api/tabs/{tab.id}/items/{item.id}")

    assert response.status_code == 200
    assert response.json()["items"] == []


async def test_cannot_edit_items_on_paid_tab(db_session, cajero_client):
    tab = await make_tab(db_session, status="paid")
    item = await make_tab_item(db_session, tab)

    response = await cajero_client.patch(
        f"/api/tabs/{tab.id}/items/{item.id}", json={"quantity": 5}
    )

    assert response.status_code == 400


async def test_pay_tab(db_session, cajero_client):
    tab = await make_tab(db_session)
    await make_tab_item(db_session, tab)
    method = await make_tab_payment_method(db_session)

    response = await cajero_client.post(
        f"/api/tabs/{tab.id}/pay", json={"payment_method_id": method.id}
    )

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "paid"
    assert body["payment_method"]["id"] == method.id
    assert body["paid_at"] is not None


async def test_pay_tab_with_no_items_is_rejected(db_session, cajero_client):
    tab = await make_tab(db_session)
    method = await make_tab_payment_method(db_session)

    response = await cajero_client.post(
        f"/api/tabs/{tab.id}/pay", json={"payment_method_id": method.id}
    )

    assert response.status_code == 400


async def test_pay_already_paid_tab_is_rejected(db_session, cajero_client):
    tab = await make_tab(db_session, status="paid")
    method = await make_tab_payment_method(db_session)

    response = await cajero_client.post(
        f"/api/tabs/{tab.id}/pay", json={"payment_method_id": method.id}
    )

    assert response.status_code == 400


async def test_reopen_paid_tab(db_session, cajero_client):
    method = await make_tab_payment_method(db_session)
    tab = await make_tab(db_session, status="paid", payment_method_id=method.id)

    response = await cajero_client.post(f"/api/tabs/{tab.id}/reopen")

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "open"
    assert body["payment_method"] is None
    assert body["paid_at"] is None


async def test_reopen_open_tab_is_rejected(db_session, cajero_client):
    tab = await make_tab(db_session)

    response = await cajero_client.post(f"/api/tabs/{tab.id}/reopen")

    assert response.status_code == 400


async def test_history_only_includes_paid_tabs_from_closed_sessions(db_session, cajero_client):
    closed_session = await make_cash_session(db_session, status="closed")
    open_session = await make_cash_session(db_session)
    archived_paid = await make_tab(
        db_session, status="paid", cash_session_id=closed_session.id
    )
    await make_tab(db_session, status="open", cash_session_id=closed_session.id)
    await make_tab(db_session, status="paid", cash_session_id=open_session.id)

    response = await cajero_client.get("/api/tabs/history")

    ids = [t["id"] for t in response.json()]
    assert ids == [archived_paid.id]


async def test_history_filters_by_date_range(db_session, cajero_client):
    from datetime import datetime, timezone

    closed_session = await make_cash_session(db_session, status="closed")
    in_range = await make_tab(
        db_session,
        status="paid",
        cash_session_id=closed_session.id,
        paid_at=datetime(2026, 1, 15, tzinfo=timezone.utc),
    )
    await make_tab(
        db_session,
        status="paid",
        cash_session_id=closed_session.id,
        paid_at=datetime(2026, 2, 1, tzinfo=timezone.utc),
    )

    response = await cajero_client.get(
        "/api/tabs/history", params={"start_date": "2026-01-01", "end_date": "2026-01-31"}
    )

    ids = [t["id"] for t in response.json()]
    assert ids == [in_range.id]
