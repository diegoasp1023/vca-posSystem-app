from collections.abc import AsyncGenerator
from datetime import date

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from app.core.auth import AuthenticatedUser, require_admin
from app.core.config import settings
from app.core.database import Base, get_db
from app.main import app
from app.models.course import Course, CourseContentModule, CourseCost, CourseObjective
from app.models.employee import Employee
from app.models.product import Presentation, Product


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
    app.dependency_overrides[require_admin] = lambda: AuthenticatedUser(
        subject="test-admin", username="admin@example.com", roles=["Administrador"]
    )
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    del app.dependency_overrides[require_admin]


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
