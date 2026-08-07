from datetime import date

from tests.conftest import make_employee

_TODAY = date.today()
YEAR, MONTH = _TODAY.year, _TODAY.month


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


async def test_period_starts_open(admin_client):
    response = await admin_client.get(
        "/api/payroll/period", params={"year": YEAR, "month": MONTH}
    )
    assert response.json()["estado"] == "abierto"


async def test_close_period_locks_it(admin_client):
    response = await admin_client.post(
        "/api/payroll/period/close", params={"year": YEAR, "month": MONTH}
    )
    assert response.status_code == 200
    body = response.json()
    assert body["estado"] == "cerrado"
    assert body["cerrado_en"] is not None


async def test_close_period_twice_rejected(admin_client):
    first = await admin_client.post(
        "/api/payroll/period/close", params={"year": YEAR, "month": MONTH}
    )
    assert first.status_code == 200

    second = await admin_client.post(
        "/api/payroll/period/close", params={"year": YEAR, "month": MONTH}
    )
    assert second.status_code == 400


async def test_nomina_excludes_employees_hired_after_month_end(db_session, admin_client):
    await make_employee(
        db_session, numero_documento="1", fecha_ingreso=date(YEAR, MONTH, 28)
    )
    late_hire_date = (
        date(YEAR, MONTH + 1, 1) if MONTH < 12 else date(YEAR + 1, 1, 1)
    )
    await make_employee(db_session, numero_documento="2", fecha_ingreso=late_hire_date)

    response = await admin_client.get(
        "/api/payroll/nomina", params={"year": YEAR, "month": MONTH}
    )
    body = response.json()

    assert len(body) == 1


async def test_nomina_includes_recently_deactivated_employee(db_session, admin_client):
    employee = await make_employee(
        db_session,
        numero_documento="1",
        is_active=False,
        fecha_baja=date(YEAR, MONTH, 15),
    )

    response = await admin_client.get(
        "/api/payroll/nomina", params={"year": YEAR, "month": MONTH}
    )
    ids = [item["employee_id"] for item in response.json()]
    assert employee.id in ids


async def test_nomina_indefinido_uses_live_salary_when_open(db_session, admin_client):
    employee = await make_employee(
        db_session, numero_documento="1", salario_mensual=2_000_000
    )

    response = await admin_client.get(
        "/api/payroll/nomina", params={"year": YEAR, "month": MONTH}
    )
    item = next(i for i in response.json() if i["employee_id"] == employee.id)
    assert item["monto_cop"] == 2_000_000


async def test_nomina_indefinido_freezes_salary_after_close(db_session, admin_client):
    employee = await make_employee(
        db_session, numero_documento="1", salario_mensual=2_000_000
    )

    close = await admin_client.post(
        "/api/payroll/period/close", params={"year": YEAR, "month": MONTH}
    )
    assert close.status_code == 200

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
            "tipo_contrato": "indefinido",
            "salario_mensual": 5_000_000,
            "salario_por_hora": None,
            "arl": employee.arl,
            "fondo_pension": employee.fondo_pension,
            "banco": employee.banco,
            "tipo_cuenta": employee.tipo_cuenta,
            "numero_cuenta": employee.numero_cuenta,
            "fecha_ingreso": str(employee.fecha_ingreso),
        },
    )

    response = await admin_client.get(
        "/api/payroll/nomina", params={"year": YEAR, "month": MONTH}
    )
    item = next(i for i in response.json() if i["employee_id"] == employee.id)
    assert item["monto_cop"] == 2_000_000


async def test_bonus_rejected_when_period_closed(db_session, admin_client):
    employee = await make_employee(db_session, numero_documento="1")
    await admin_client.post(
        "/api/payroll/period/close", params={"year": YEAR, "month": MONTH}
    )

    response = await admin_client.post(
        "/api/payroll/bonuses",
        json={
            "employee_id": employee.id,
            "year": YEAR,
            "month": MONTH,
            "monto_cop": 50000,
            "concepto": "Bono",
        },
    )
    assert response.status_code == 400


async def test_bonus_created_when_open_and_appears_in_summary(db_session, admin_client):
    employee = await make_employee(
        db_session, numero_documento="1", salario_mensual=1_000_000
    )

    created = await admin_client.post(
        "/api/payroll/bonuses",
        json={
            "employee_id": employee.id,
            "year": YEAR,
            "month": MONTH,
            "monto_cop": 50000,
            "concepto": "Bono desempeño",
        },
    )
    assert created.status_code == 201

    summary = await admin_client.get(
        "/api/payroll/summary", params={"year": YEAR, "month": MONTH}
    )
    item = next(
        i for i in summary.json()["items"] if i["employee_id"] == employee.id
    )
    assert item["bonos_cop"] == 50000
    assert item["total_cop"] == 1_050_000


async def test_tips_split_evenly_among_participants(db_session, admin_client):
    e1 = await make_employee(db_session, numero_documento="1", salario_mensual=1_000_000)
    e2 = await make_employee(db_session, numero_documento="2", salario_mensual=1_000_000)

    response = await admin_client.put(
        "/api/payroll/tips",
        params={"year": YEAR, "month": MONTH},
        json={"monto_total_cop": 100000, "employee_ids": [e1.id, e2.id]},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["monto_por_persona"] == 50000

    summary = await admin_client.get(
        "/api/payroll/summary", params={"year": YEAR, "month": MONTH}
    )
    item1 = next(i for i in summary.json()["items"] if i["employee_id"] == e1.id)
    assert item1["propina_cop"] == 50000
    assert item1["total_cop"] == 1_050_000


async def test_tips_rejected_when_period_closed(db_session, admin_client):
    e1 = await make_employee(db_session, numero_documento="1")
    await admin_client.post(
        "/api/payroll/period/close", params={"year": YEAR, "month": MONTH}
    )

    response = await admin_client.put(
        "/api/payroll/tips",
        params={"year": YEAR, "month": MONTH},
        json={"monto_total_cop": 100000, "employee_ids": [e1.id]},
    )
    assert response.status_code == 400


async def test_shift_rejected_when_period_closed(db_session, admin_client):
    employee = await make_hourly_employee(db_session)
    await admin_client.post(
        "/api/payroll/period/close", params={"year": YEAR, "month": MONTH}
    )

    response = await admin_client.post(
        "/api/shifts",
        json={
            "employee_id": employee.id,
            "fecha": date(YEAR, MONTH, 10).isoformat(),
            "hora_inicio": "08:00:00",
            "hora_fin": "10:00:00",
        },
    )
    assert response.status_code == 400
