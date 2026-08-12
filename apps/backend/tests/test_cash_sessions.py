from tests.conftest import make_cash_session, make_tab


async def test_current_session_requires_auth(client):
    response = await client.get("/api/cash-sessions/current")

    assert response.status_code == 401


async def test_current_session_rejects_wrong_role(employee_client):
    response = await employee_client.get("/api/cash-sessions/current")

    assert response.status_code == 403


async def test_current_session_is_null_when_none_open(cajero_client):
    response = await cajero_client.get("/api/cash-sessions/current")

    assert response.status_code == 200
    assert response.json() is None


async def test_current_session_returns_open_session(db_session, cajero_client):
    session = await make_cash_session(db_session)

    response = await cajero_client.get("/api/cash-sessions/current")

    assert response.status_code == 200
    assert response.json()["id"] == session.id
    assert response.json()["status"] == "open"


async def test_open_session(cajero_client):
    response = await cajero_client.post("/api/cash-sessions/open")

    assert response.status_code == 201
    body = response.json()
    assert body["status"] == "open"
    assert body["opened_by"] == "cajero@example.com"


async def test_open_session_when_already_open_is_rejected(db_session, cajero_client):
    await make_cash_session(db_session)

    response = await cajero_client.post("/api/cash-sessions/open")

    assert response.status_code == 400


async def test_close_session(db_session, cajero_client):
    await make_cash_session(db_session)

    response = await cajero_client.post("/api/cash-sessions/close")

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "closed"
    assert body["closed_by"] == "cajero@example.com"
    assert body["closed_at"] is not None


async def test_close_session_when_none_open_is_rejected(cajero_client):
    response = await cajero_client.post("/api/cash-sessions/close")

    assert response.status_code == 400


async def test_close_session_with_unpaid_tabs_is_rejected(db_session, cajero_client):
    session = await make_cash_session(db_session)
    await make_tab(db_session, cash_session_id=session.id, status="open")

    response = await cajero_client.post("/api/cash-sessions/close")

    assert response.status_code == 400


async def test_close_session_with_only_paid_tabs_succeeds(db_session, cajero_client):
    session = await make_cash_session(db_session)
    await make_tab(db_session, cash_session_id=session.id, status="paid")

    response = await cajero_client.post("/api/cash-sessions/close")

    assert response.status_code == 200
