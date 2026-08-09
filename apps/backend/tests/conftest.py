from collections.abc import AsyncGenerator
from datetime import date

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from app.core.auth import (
    AuthenticatedUser,
    get_current_user,
    require_admin,
    require_gerente_or_admin,
)
from app.core.config import settings
from app.core.database import Base, get_db
from app.main import app
from app.models.course import Course, CourseContentModule, CourseCost, CourseObjective
from app.models.employee import Employee
from app.models.menu_item import MenuCategory, MenuItem
from app.models.product import Presentation, Product
from app.models.tab import Tab, TabItem, TabPaymentMethod


@pytest.fixture(autouse=True)
def upload_dir(tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "upload_dir", str(tmp_path))
    return tmp_path


@pytest.fixture
async def db_session():
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    async def override_get_db() -> AsyncGenerator:
        async with session_factory() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db

    async with session_factory() as session:
        yield session

    app.dependency_overrides.clear()
    await engine.dispose()


@pytest.fixture
async def client(db_session) -> AsyncGenerator[AsyncClient]:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.fixture
async def admin_client(db_session) -> AsyncGenerator[AsyncClient]:
    admin_user = AuthenticatedUser(
        subject="test-admin", username="admin@example.com", roles=["Administrador"]
    )
    app.dependency_overrides[require_admin] = lambda: admin_user
    app.dependency_overrides[require_gerente_or_admin] = lambda: admin_user
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    del app.dependency_overrides[require_admin]
    del app.dependency_overrides[require_gerente_or_admin]


@pytest.fixture
async def gerente_client(db_session) -> AsyncGenerator[AsyncClient]:
    app.dependency_overrides[get_current_user] = lambda: AuthenticatedUser(
        subject="test-gerente", username="gerente@example.com", roles=["Gerente"]
    )
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    del app.dependency_overrides[get_current_user]


@pytest.fixture
async def employee_client(db_session) -> AsyncGenerator[AsyncClient]:
    app.dependency_overrides[get_current_user] = lambda: AuthenticatedUser(
        subject="test-employee", username="empleado@example.com", roles=["Empleado"]
    )
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    del app.dependency_overrides[get_current_user]


async def make_product(session, **overrides) -> Product:
    defaults = {
        "name_es": "Café Test",
        "name_en": "Test Coffee",
        "description_es": "Descripción",
        "description_en": "Description",
        "weight_grams": 340,
        "price_cop": 40000,
        "is_active": True,
    }
    defaults.update(overrides)
    product = Product(**defaults)
    session.add(product)
    await session.commit()
    return product


async def make_presentation(session, **overrides) -> Presentation:
    defaults = {"name_es": "Molido", "name_en": "Ground"}
    defaults.update(overrides)
    presentation = Presentation(**defaults)
    session.add(presentation)
    await session.commit()
    return presentation


async def make_employee(session, **overrides) -> Employee:
    defaults = {
        "nombre": "Ana",
        "apellido": "Perez",
        "tipo_documento": "CC",
        "numero_documento": "1000000000",
        "fecha_nacimiento": date(1990, 1, 1),
        "correo_electronico": "ana@example.com",
        "direccion": "Calle 1",
        "cargo": "Barista",
        "eps": "Sura",
        "tipo_contrato": "indefinido",
        "salario_mensual": 2000000,
        "salario_por_hora": None,
        "arl": "Sura ARL",
        "fondo_pension": "Porvenir",
        "banco": "Bancolombia",
        "tipo_cuenta": "ahorros",
        "numero_cuenta": "123456",
        "fecha_ingreso": date(2024, 1, 1),
        "is_active": True,
        "fecha_activacion": date(2024, 1, 1),
    }
    defaults.update(overrides)
    employee = Employee(**defaults)
    session.add(employee)
    await session.commit()
    return employee


async def make_course(session, **overrides) -> Course:
    defaults = {
        "slug": "curso-test",
        "title_es": "Curso Test",
        "title_en": "Test Course",
        "tagline_es": "Tagline",
        "tagline_en": "Tagline",
        "duration_text_es": "1 hora",
        "duration_text_en": "1 hour",
        "image_url": "/images/courses/test.jpg",
        "is_active": True,
    }
    defaults.update(overrides)
    course = Course(**defaults)
    course.objectives = [CourseObjective(sort_order=0, text_es="Obj", text_en="Obj")]
    course.content_modules = [
        CourseContentModule(sort_order=0, module_es="Modulo", module_en="Module", duration_label="1h")
    ]
    course.costs = [CourseCost(sort_order=0, text_es="Costo", text_en="Cost")]
    session.add(course)
    await session.commit()
    return course


async def make_menu_category(session, **overrides) -> MenuCategory:
    defaults = {"name_es": "Bebidas calientes", "name_en": "Hot drinks", "sort_order": 1}
    defaults.update(overrides)
    category = MenuCategory(**defaults)
    session.add(category)
    await session.commit()
    return category


async def make_menu_item(session, category=None, **overrides) -> MenuItem:
    if category is None:
        category = await make_menu_category(session)
    defaults = {
        "category_id": category.id,
        "name_es": "Café Latte 9 Oz",
        "name_en": "Café Latte 9 oz",
        "price_cop": 9900,
        "is_active": True,
    }
    defaults.update(overrides)
    item = MenuItem(**defaults)
    session.add(item)
    await session.commit()
    return item


async def make_tab_payment_method(session, **overrides) -> TabPaymentMethod:
    defaults = {"name_es": "Efectivo", "name_en": "Cash", "is_active": True, "sort_order": 0}
    defaults.update(overrides)
    method = TabPaymentMethod(**defaults)
    session.add(method)
    await session.commit()
    return method


async def make_tab(session, **overrides) -> Tab:
    defaults = {"table_number": None, "reference_note": None, "status": "open"}
    defaults.update(overrides)
    tab = Tab(**defaults)
    session.add(tab)
    await session.commit()
    return tab


async def make_tab_item(session, tab, **overrides) -> TabItem:
    defaults = {
        "tab_id": tab.id,
        "source_type": "menu_item",
        "menu_item_id": None,
        "product_id": None,
        "name_es": "Café Latte 9 Oz",
        "name_en": "Café Latte 9 oz",
        "unit_price_cop": 9900,
        "quantity": 1,
    }
    defaults.update(overrides)
    item = TabItem(**defaults)
    session.add(item)
    await session.commit()
    return item
