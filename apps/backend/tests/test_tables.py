from tests.conftest import make_cash_session, make_tab, make_table


async def test_list_tables_requires_auth(client):
    response = await client.get("/api/tables")

    assert response.status_code == 401


async def test_list_tables_rejects_wrong_role(employee_client):
    response = await employee_client.get("/api/tables")

    assert response.status_code == 403


async def test_list_tables_as_cajero(db_session, cajero_client):
    await make_table(db_session, name="Mesa 1")

    response = await cajero_client.get("/api/tables")

    assert response.status_code == 200
    body = response.json()
    assert len(body) == 1
    assert body[0]["name"] == "Mesa 1"
    assert body[0]["open_tab"] is None


async def test_list_tables_reports_open_tab_summary(db_session, cajero_client):
    session = await make_cash_session(db_session)
    table = await make_table(db_session)
    tab = await make_tab(
        db_session, account_type="dine_in", table_id=table.id, cash_session_id=session.id
    )

    response = await cajero_client.get("/api/tables")

    body = response.json()[0]
    assert body["open_tab"]["tab_id"] == tab.id
    assert body["open_tab"]["total_cop"] == 0
    assert body["open_tab"]["opened_at"] is not None


async def test_create_table_requires_admin(cajero_client):
    response = await cajero_client.post(
        "/api/tables",
        json={
            "name": "Mesa 1",
            "shape": "circle",
            "pos_x": 10,
            "pos_y": 10,
            "width": 70,
            "height": 70,
        },
    )

    assert response.status_code == 403


async def test_create_table_as_admin(admin_client):
    response = await admin_client.post(
        "/api/tables",
        json={
            "name": "Mesa 1",
            "shape": "rect",
            "pos_x": 10,
            "pos_y": 20,
            "width": 80,
            "height": 60,
            "capacity": 4,
        },
    )

    assert response.status_code == 201
    body = response.json()
    assert body["name"] == "Mesa 1"
    assert body["kind"] == "table"
    assert body["shape"] == "rect"
    assert body["capacity"] == 4


async def test_create_landmark_as_admin(admin_client):
    response = await admin_client.post(
        "/api/tables",
        json={
            "name": "Entrada",
            "kind": "entrance",
            "shape": "rect",
            "pos_x": 0,
            "pos_y": 0,
            "width": 40,
            "height": 20,
        },
    )

    assert response.status_code == 201
    assert response.json()["kind"] == "entrance"


async def test_update_table_as_admin(db_session, admin_client):
    table = await make_table(db_session, name="Mesa 1")

    response = await admin_client.patch(
        f"/api/tables/{table.id}",
        json={
            "name": "Mesa 1B",
            "shape": "circle",
            "pos_x": 5,
            "pos_y": 5,
            "width": 70,
            "height": 70,
        },
    )

    assert response.status_code == 200
    assert response.json()["name"] == "Mesa 1B"


async def test_delete_table_as_admin(db_session, admin_client):
    table = await make_table(db_session)

    response = await admin_client.delete(f"/api/tables/{table.id}")

    assert response.status_code == 204


async def test_delete_table_with_open_tab_is_rejected(db_session, admin_client):
    session = await make_cash_session(db_session)
    table = await make_table(db_session)
    await make_tab(
        db_session, account_type="dine_in", table_id=table.id, cash_session_id=session.id
    )

    response = await admin_client.delete(f"/api/tables/{table.id}")

    assert response.status_code == 400
