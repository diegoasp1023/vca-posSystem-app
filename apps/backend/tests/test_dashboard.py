from datetime import date, datetime, time, timezone

from app.models.payroll import TipPool
from app.models.shift import Shift
from tests.conftest import (
    make_employee,
    make_tab,
    make_tab_item,
    make_tab_payment,
    make_tab_payment_method,
)

YEAR, MONTH = 2026, 3


async def make_paid_tab(session, *, opened_at, paid_at, **overrides):
    defaults = {"status": "paid", "opened_at": opened_at, "paid_at": paid_at}
    defaults.update(overrides)
    return await make_tab(session, **defaults)


async def test_empty_range_returns_zeros(admin_client):
    response = await admin_client.get(
        "/api/dashboard/metrics",
        params={"start_date": "2026-01-01", "end_date": "2026-01-31"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["sales"] == {
        "total_revenue_cop": 0,
        "closed_tabs_count": 0,
        "average_ticket_cop": 0,
        "daily_series": [],
    }
    assert body["top_products"] == []
    assert body["payment_methods"] == []
    assert body["tips"] == {
        "calculated_total_cop": 0,
        "declared_total_cop": None,
        "average_tip_per_tab_cop": 0,
    }
    assert body["busy_hours"] == []
    assert body["average_tab_duration_minutes"] == 0.0
    assert body["labor_cost"] == {"total_hours": 0.0, "total_cost_cop": 0}


async def test_requires_admin_role(cajero_client):
    response = await cajero_client.get("/api/dashboard/metrics")
    assert response.status_code == 403


async def test_sales_top_products_and_payment_methods(db_session, admin_client):
    efectivo = await make_tab_payment_method(db_session, name="Efectivo")
    tarjeta = await make_tab_payment_method(db_session, name="Tarjeta")

    tab1 = await make_paid_tab(
        db_session,
        opened_at=datetime(YEAR, MONTH, 5, 9, 0, tzinfo=timezone.utc),
        paid_at=datetime(YEAR, MONTH, 5, 9, 30, tzinfo=timezone.utc),
    )
    await make_tab_item(
        db_session, tab1, name_es="Latte", name_en="Latte", unit_price_cop=10000, quantity=2
    )
    await make_tab_payment(
        db_session, tab1, payment_method_id=efectivo.id, amount_cop=20000, tip_cop=2000
    )

    tab2 = await make_paid_tab(
        db_session,
        opened_at=datetime(YEAR, MONTH, 6, 14, 0, tzinfo=timezone.utc),
        paid_at=datetime(YEAR, MONTH, 6, 14, 20, tzinfo=timezone.utc),
    )
    await make_tab_item(
        db_session, tab2, name_es="Latte", name_en="Latte", unit_price_cop=10000, quantity=1
    )
    await make_tab_item(
        db_session, tab2, name_es="Croissant", name_en="Croissant", unit_price_cop=8000, quantity=1
    )
    await make_tab_payment(
        db_session, tab2, payment_method_id=tarjeta.id, amount_cop=18000, tip_cop=0
    )

    response = await admin_client.get(
        "/api/dashboard/metrics",
        params={"start_date": f"{YEAR}-{MONTH:02d}-01", "end_date": f"{YEAR}-{MONTH:02d}-28"},
    )

    assert response.status_code == 200
    body = response.json()

    assert body["sales"]["total_revenue_cop"] == 38000
    assert body["sales"]["closed_tabs_count"] == 2
    assert body["sales"]["average_ticket_cop"] == 19000
    assert len(body["sales"]["daily_series"]) == 2

    top_products = body["top_products"]
    assert top_products[0]["name"]["es"] == "Latte"
    assert top_products[0]["quantity"] == 3
    assert top_products[0]["revenue_cop"] == 30000

    methods_by_name = {m["name"]: m for m in body["payment_methods"]}
    assert methods_by_name["Efectivo"]["revenue_cop"] == 20000
    assert methods_by_name["Efectivo"]["tips_cop"] == 2000
    assert methods_by_name["Tarjeta"]["revenue_cop"] == 18000

    assert body["tips"]["calculated_total_cop"] == 2000
    assert body["tips"]["average_tip_per_tab_cop"] == 1000

    assert body["average_tab_duration_minutes"] == 25.0

    hours = {point["hour"]: point["tabs_opened_count"] for point in body["busy_hours"]}
    assert hours == {9: 1, 14: 1}


async def test_declared_tip_total_only_for_full_calendar_month(db_session, admin_client):
    db_session.add(TipPool(year=YEAR, month=MONTH, monto_total_cop=50000))
    await db_session.commit()

    last_day = 31
    full_month = await admin_client.get(
        "/api/dashboard/metrics",
        params={
            "start_date": f"{YEAR}-{MONTH:02d}-01",
            "end_date": f"{YEAR}-{MONTH:02d}-{last_day}",
        },
    )
    assert full_month.json()["tips"]["declared_total_cop"] == 50000

    partial_month = await admin_client.get(
        "/api/dashboard/metrics",
        params={
            "start_date": f"{YEAR}-{MONTH:02d}-01",
            "end_date": f"{YEAR}-{MONTH:02d}-15",
        },
    )
    assert partial_month.json()["tips"]["declared_total_cop"] is None


async def test_date_range_excludes_tabs_outside_it(db_session, admin_client):
    tab = await make_paid_tab(
        db_session,
        opened_at=datetime(YEAR, MONTH, 5, 9, 0, tzinfo=timezone.utc),
        paid_at=datetime(YEAR, MONTH, 5, 9, 30, tzinfo=timezone.utc),
    )
    await make_tab_item(db_session, tab, unit_price_cop=5000, quantity=1)

    response = await admin_client.get(
        "/api/dashboard/metrics",
        params={"start_date": f"{YEAR}-04-01", "end_date": f"{YEAR}-04-30"},
    )

    assert response.json()["sales"]["total_revenue_cop"] == 0


async def test_account_type_filter(db_session, admin_client):
    dine_in = await make_paid_tab(
        db_session,
        opened_at=datetime(YEAR, MONTH, 5, 9, 0, tzinfo=timezone.utc),
        paid_at=datetime(YEAR, MONTH, 5, 9, 30, tzinfo=timezone.utc),
        account_type="takeaway",
    )
    await make_tab_item(db_session, dine_in, unit_price_cop=7000, quantity=1)

    other = await make_paid_tab(
        db_session,
        opened_at=datetime(YEAR, MONTH, 5, 10, 0, tzinfo=timezone.utc),
        paid_at=datetime(YEAR, MONTH, 5, 10, 30, tzinfo=timezone.utc),
        account_type="custom",
    )
    await make_tab_item(db_session, other, unit_price_cop=3000, quantity=1)

    response = await admin_client.get(
        "/api/dashboard/metrics",
        params={
            "start_date": f"{YEAR}-{MONTH:02d}-01",
            "end_date": f"{YEAR}-{MONTH:02d}-28",
            "account_type": "takeaway",
        },
    )

    assert response.json()["sales"]["total_revenue_cop"] == 7000


async def test_payment_method_filter(db_session, admin_client):
    efectivo = await make_tab_payment_method(db_session, name="Efectivo")
    tarjeta = await make_tab_payment_method(db_session, name="Tarjeta")

    cash_tab = await make_paid_tab(
        db_session,
        opened_at=datetime(YEAR, MONTH, 5, 9, 0, tzinfo=timezone.utc),
        paid_at=datetime(YEAR, MONTH, 5, 9, 30, tzinfo=timezone.utc),
    )
    await make_tab_item(db_session, cash_tab, unit_price_cop=10000, quantity=1)
    await make_tab_payment(db_session, cash_tab, payment_method_id=efectivo.id, amount_cop=10000)

    card_tab = await make_paid_tab(
        db_session,
        opened_at=datetime(YEAR, MONTH, 5, 10, 0, tzinfo=timezone.utc),
        paid_at=datetime(YEAR, MONTH, 5, 10, 30, tzinfo=timezone.utc),
    )
    await make_tab_item(db_session, card_tab, unit_price_cop=6000, quantity=1)
    await make_tab_payment(db_session, card_tab, payment_method_id=tarjeta.id, amount_cop=6000)

    response = await admin_client.get(
        "/api/dashboard/metrics",
        params={
            "start_date": f"{YEAR}-{MONTH:02d}-01",
            "end_date": f"{YEAR}-{MONTH:02d}-28",
            "payment_method_id": efectivo.id,
        },
    )

    assert response.json()["sales"]["total_revenue_cop"] == 10000
    assert response.json()["sales"]["closed_tabs_count"] == 1


async def test_labor_cost_sums_hourly_shifts_in_range(db_session, admin_client):
    employee = await make_employee(db_session, tipo_contrato="por_horas", numero_documento="999")
    db_session.add_all(
        [
            Shift(
                employee_id=employee.id,
                fecha=date(YEAR, MONTH, 5),
                hora_inicio=time(8, 0),
                hora_fin=time(12, 0),
                tarifa_hora_cop=15000,
            ),
            Shift(
                employee_id=employee.id,
                fecha=date(YEAR, MONTH, 20),
                hora_inicio=time(8, 0),
                hora_fin=time(10, 0),
                tarifa_hora_cop=15000,
            ),
            # Outside the filtered range, should not be counted.
            Shift(
                employee_id=employee.id,
                fecha=date(YEAR, 4, 1),
                hora_inicio=time(8, 0),
                hora_fin=time(10, 0),
                tarifa_hora_cop=15000,
            ),
        ]
    )
    await db_session.commit()

    response = await admin_client.get(
        "/api/dashboard/metrics",
        params={"start_date": f"{YEAR}-{MONTH:02d}-01", "end_date": f"{YEAR}-{MONTH:02d}-28"},
    )

    assert response.json()["labor_cost"] == {"total_hours": 6.0, "total_cost_cop": 90000}
