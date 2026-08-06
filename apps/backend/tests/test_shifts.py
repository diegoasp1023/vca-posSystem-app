from tests.conftest import make_employee


async def make_hourly_employee(session, **overrides):
    defaults = {
        "tipo_contrato": "por_horas",
        "salario_mensual": None,
        "salario_por_hora": 15000,
        "arl": None,
        "fondo_pension": None,
        "numero_documento": "555",
    }
    defaults.update(overrides)
    return await make_employee(session, **defaults)


async def test_create_shift_requires_hourly_employee(db_session, admin_client):
    employee = await make_employee(db_session)  # indefinido by default

    response = await admin_client.post(
        "/api/shifts",
        json={
            "employee_id": employee.id,
            "fecha": "2026-03-10",
            "hora_inicio": "08:00:00",
            "hora_fin": "16:00:00",
        },
    )

    assert response.status_code == 400


async def test_create_shift_rejects_end_before_start(db_session, admin_client):
    employee = await make_hourly_employee(db_session)

    response = await admin_client.post(
        "/api/shifts",
        json={
            "employee_id": employee.id,
            "fecha": "2026-03-10",
            "hora_inicio": "16:00:00",
            "hora_fin": "08:00:00",
        },
    )

    assert response.status_code == 422


async def test_create_shift_computes_hours_and_amount(db_session, admin_client):
    employee = await make_hourly_employee(db_session, salario_por_hora=20000)

    response = await admin_client.post(
        "/api/shifts",
        json={
            "employee_id": employee.id,
            "fecha": "2026-03-10",
            "hora_inicio": "08:00:00",
            "hora_fin": "12:30:00",
        },
    )

    assert response.status_code == 201
    body = response.json()
    assert body["horas"] == 4.5
    assert body["tarifa_hora_cop"] == 20000
    assert body["monto_cop"] == 90000


async def test_shift_keeps_frozen_rate_after_salary_change(db_session, admin_client):
    employee = await make_hourly_employee(db_session, salario_por_hora=15000)

    created = await admin_client.post(
        "/api/shifts",
        json={
            "employee_id": employee.id,
            "fecha": "2026-03-10",
            "hora_inicio": "08:00:00",
            "hora_fin": "12:00:00",
        },
    )
    assert created.status_code == 201

    await admin_client.put(
        f"/api/employees/{employee.id}",
        json={
            "nombre": employee.nombre,
            "apellido": employee.apellido,
            "tipo_documento": employee.tipo_documento,
            "numero_documento": employee.numero_documento,
            "fecha_nacimiento": str(employee.fecha_nacimiento),
            "correo_electronico": employee.correo_electronico,
            "direccion": employee.direccion,
            "cargo": employee.cargo,
            "eps": employee.eps,
            "tipo_contrato": "por_horas",
            "salario_mensual": None,
            "salario_por_hora": 30000,
            "arl": None,
            "fondo_pension": None,
            "banco": employee.banco,
            "tipo_cuenta": employee.tipo_cuenta,
            "numero_cuenta": employee.numero_cuenta,
            "fecha_ingreso": str(employee.fecha_ingreso),
        },
    )

    summary = (
        await admin_client.get(
            "/api/shifts", params={"employee_id": employee.id, "year": 2026, "month": 3}
        )
    ).json()

    assert summary["shifts"][0]["tarifa_hora_cop"] == 15000
    assert summary["total_cop"] == 60000


async def test_monthly_summary_filters_by_month(db_session, admin_client):
    employee = await make_hourly_employee(db_session)

    for fecha in ["2026-03-01", "2026-03-15", "2026-04-01"]:
        await admin_client.post(
            "/api/shifts",
            json={
                "employee_id": employee.id,
                "fecha": fecha,
                "hora_inicio": "08:00:00",
                "hora_fin": "10:00:00",
            },
        )

    summary = (
        await admin_client.get(
            "/api/shifts", params={"employee_id": employee.id, "year": 2026, "month": 3}
        )
    ).json()

    assert len(summary["shifts"]) == 2
    assert summary["total_horas"] == 4.0
    assert summary["total_cop"] == 60000


async def test_delete_shift(db_session, admin_client):
    employee = await make_hourly_employee(db_session)

    created = await admin_client.post(
        "/api/shifts",
        json={
            "employee_id": employee.id,
            "fecha": "2026-03-10",
            "hora_inicio": "08:00:00",
            "hora_fin": "10:00:00",
        },
    )
    shift_id = created.json()["id"]

    response = await admin_client.delete(f"/api/shifts/{shift_id}")
    assert response.status_code == 204

    summary = (
        await admin_client.get(
            "/api/shifts", params={"employee_id": employee.id, "year": 2026, "month": 3}
        )
    ).json()
    assert summary["shifts"] == []
