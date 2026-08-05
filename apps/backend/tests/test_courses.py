from tests.conftest import make_course


async def test_courses_are_paginated_four_per_page(db_session, client):
    for i in range(5):
        await make_course(db_session, slug=f"curso-{i}", title_es=f"Curso {i}", title_en=f"Course {i}")

    page_1 = (await client.get("/api/courses?page=1")).json()
    assert page_1["page_size"] == 4
    assert page_1["total"] == 5
    assert page_1["total_pages"] == 2
    assert len(page_1["items"]) == 4


async def test_course_detail_by_slug(db_session, client):
    await make_course(db_session, slug="mi-curso", title_es="Mi Curso", title_en="My Course")

    response = await client.get("/api/courses/mi-curso")
    body = response.json()

    assert response.status_code == 200
    assert body["slug"] == "mi-curso"
    assert len(body["objectives"]) == 1
    assert len(body["content"]) == 1
    assert body["content"][0]["duration"] == "1h"


async def test_course_detail_not_found_returns_404(client):
    response = await client.get("/api/courses/no-existe")

    assert response.status_code == 404


async def test_inactive_course_not_found(db_session, client):
    await make_course(db_session, slug="inactivo", is_active=False)

    response = await client.get("/api/courses/inactivo")

    assert response.status_code == 404
