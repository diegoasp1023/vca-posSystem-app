from datetime import date

from tests.conftest import make_employee

EMPLOYEE_PAYLOAD = {
    "nombre": "Laura",
    "apellido": "Gomez",
    "tipo_documento": "CC",
    "numero_documento": "1020304050",
    "fecha_nacimiento": "1995-04-12",
    "correo_electronico": "laura@example.com",
    "direccion": "Calle 45 #10-20",
    "cargo": "Barista",
    "eps": "Sura",
    "tipo_contrato": "indefinido",
    "salario_mensual": 1800000,
    "salario_por_hora": None,
    "arl": "Sura ARL",
    "fondo_pension": "Porvenir",
    "banco": "Bancolombia",
    "tipo_cuenta": "ahorros",
    "numero_cuenta": "1234567890",
    "fecha_ingreso": "2024-02-01",
}


async def test_list_employees_requires_auth(client):
    response = await client.get("/api/employees/admin?page=1")

    assert response.status_code == 401


async def test_create_employee_as_admin(admin_client):
    response = await admin_client.post("/api/employees", json=EMPLOYEE_PAYLOAD)

    assert response.status_code == 201
    body = response.json()
    assert body["nombre"] == "Laura"
    assert body["is_active"] is True
    assert body["fecha_baja"] is None


async def test_create_employee_indefinido_requires_arl_and_pension(admin_client):
    payload = {**EMPLOYEE_PAYLOAD, "arl": None, "fondo_pension": None}

    response = await admin_client.post("/api/employees", json=payload)

    assert response.status_code == 422


async def test_create_employee_por_horas_requires_hourly_salary(admin_client):
    payload = {
        **EMPLOYEE_PAYLOAD,
        "tipo_contrato": "por_horas",
        "salario_mensual": None,
        "arl": None,
        "fondo_pension": None,
        "salario_por_hora": None,
    }

    response = await admin_client.post("/api/employees", json=payload)

    assert response.status_code == 422


async def test_create_employee_por_horas_clears_indefinido_fields(admin_client):
    payload = {
        **EMPLOYEE_PAYLOAD,
        "tipo_contrato": "por_horas",
        "salario_mensual": None,
        "salario_por_hora": 15000,
    }

    response = await admin_client.post("/api/employees", json=payload)

    assert response.status_code == 201
    body = response.json()
    assert body["salario_mensual"] is None
    assert body["arl"] is None
    assert body["fondo_pension"] is None
    assert body["salario_por_hora"] == 15000


async def test_duplicate_numero_documento_rejected(admin_client):
    first = await admin_client.post("/api/employees", json=EMPLOYEE_PAYLOAD)
    assert first.status_code == 201

    second = await admin_client.post("/api/employees", json=EMPLOYEE_PAYLOAD)
    assert second.status_code == 400


async def test_deactivate_and_reactivate_employee(db_session, admin_client):
    employee = await make_employee(db_session)

    deactivate = await admin_client.post(f"/api/employees/{employee.id}/deactivate")
    assert deactivate.status_code == 200
    assert deactivate.json()["is_active"] is False
    assert deactivate.json()["fecha_baja"] is not None

    reactivate = await admin_client.post(f"/api/employees/{employee.id}/reactivate")
    assert reactivate.status_code == 200
    assert reactivate.json()["is_active"] is True
    assert reactivate.json()["fecha_baja"] is None


async def test_create_employee_sets_fecha_activacion_to_hire_date(admin_client):
    response = await admin_client.post("/api/employees", json=EMPLOYEE_PAYLOAD)

    assert response.status_code == 201
    assert response.json()["fecha_activacion"] == EMPLOYEE_PAYLOAD["fecha_ingreso"]


async def test_reactivate_updates_fecha_activacion_to_today(db_session, admin_client):
    employee = await make_employee(db_session, is_active=False, fecha_baja=date(2024, 6, 1))

    reactivate = await admin_client.post(f"/api/employees/{employee.id}/reactivate")

    assert reactivate.status_code == 200
    assert reactivate.json()["fecha_activacion"] == date.today().isoformat()


async def test_admin_listing_includes_deactivated_employees(db_session, admin_client):
    await make_employee(db_session, numero_documento="1", is_active=True)
    await make_employee(db_session, numero_documento="2", is_active=False)

    response = (await admin_client.get("/api/employees/admin?page=1")).json()

    assert response["total"] == 2


async def test_admin_listing_supports_page_size(db_session, admin_client):
    for i in range(15):
        await make_employee(db_session, numero_documento=str(i), nombre=f"Emp{i}")

    response = (
        await admin_client.get("/api/employees/admin?page=1&page_size=20")
    ).json()

    assert response["page_size"] == 20
    assert len(response["items"]) == 15
    assert response["total_pages"] == 1


async def test_admin_listing_search_filters_by_name(db_session, admin_client):
    await make_employee(db_session, numero_documento="1", nombre="Laura", apellido="Gomez")
    await make_employee(db_session, numero_documento="2", nombre="Carlos", apellido="Ruiz")

    response = (
        await admin_client.get("/api/employees/admin?page=1&search=laura")
    ).json()

    assert response["total"] == 1
    assert response["items"][0]["nombre"] == "Laura"


async def test_admin_listing_sorts_by_column(db_session, admin_client):
    await make_employee(db_session, numero_documento="1", nombre="Zoe")
    await make_employee(db_session, numero_documento="2", nombre="Ana")

    response = (
        await admin_client.get(
            "/api/employees/admin?page=1&sort_by=nombre&sort_dir=asc"
        )
    ).json()

    assert [item["nombre"] for item in response["items"]] == ["Ana", "Zoe"]
