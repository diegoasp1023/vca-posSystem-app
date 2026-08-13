import os

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


COURSE_PAYLOAD = {
    "slug": "curso-nuevo",
    "title_es": "Curso Nuevo",
    "title_en": "New Course",
    "tagline_es": "Tagline",
    "tagline_en": "Tagline",
    "duration_text_es": "2 horas",
    "duration_text_en": "2 hours",
    "image_url": "/images/courses/nuevo.jpg",
    "objectives": [{"es": "Objetivo", "en": "Objective"}],
    "content": [{"module_es": "Modulo 1", "module_en": "Module 1", "duration_label": "1h"}],
    "cost": [{"es": "$100.000", "en": "$100,000"}],
}


async def test_create_course_requires_auth(client):
    response = await client.post("/api/courses", json=COURSE_PAYLOAD)

    assert response.status_code == 401


async def test_create_course_as_admin(admin_client):
    response = await admin_client.post("/api/courses", json=COURSE_PAYLOAD)

    assert response.status_code == 201
    body = response.json()
    assert body["slug"] == "curso-nuevo"
    assert body["objectives"] == [{"es": "Objetivo", "en": "Objective"}]


async def test_create_course_without_image_defaults_to_null(admin_client):
    payload = {**COURSE_PAYLOAD, "slug": "curso-sin-imagen"}
    del payload["image_url"]

    response = await admin_client.post("/api/courses", json=payload)

    assert response.status_code == 201
    assert response.json()["image_url"] is None


async def test_public_course_list_returns_null_image_url(db_session, client):
    await make_course(db_session, slug="curso-sin-imagen", image_url=None)

    response = await client.get("/api/courses?page=1")

    assert response.json()["items"][0]["image_url"] is None


async def test_create_course_rejects_duplicate_slug(db_session, admin_client):
    await make_course(db_session, slug="curso-nuevo")

    response = await admin_client.post("/api/courses", json=COURSE_PAYLOAD)

    assert response.status_code == 400


async def test_update_course_replaces_children(db_session, admin_client):
    course = await make_course(db_session)

    payload = {**COURSE_PAYLOAD, "slug": "curso-test", "objectives": [
        {"es": "Nuevo objetivo", "en": "New objective"}
    ]}
    response = await admin_client.put(f"/api/courses/{course.id}", json=payload)

    assert response.status_code == 200
    body = response.json()
    assert len(body["objectives"]) == 1
    assert body["objectives"][0]["es"] == "Nuevo objetivo"


async def test_delete_course_as_admin(db_session, admin_client):
    course = await make_course(db_session)

    response = await admin_client.delete(f"/api/courses/{course.id}")
    assert response.status_code == 204

    listing = (await admin_client.get("/api/courses/admin?page=1")).json()
    assert listing["total"] == 0


async def test_delete_course_removes_uploaded_image(db_session, admin_client, upload_dir):
    course_images_dir = upload_dir / "courses"
    course_images_dir.mkdir()
    (course_images_dir / "photo.jpg").write_bytes(b"data")
    course = await make_course(db_session, image_url="/uploads/courses/photo.jpg")

    response = await admin_client.delete(f"/api/courses/{course.id}")

    assert response.status_code == 204
    assert not (course_images_dir / "photo.jpg").exists()


async def test_update_course_removes_replaced_image(db_session, admin_client, upload_dir):
    course_images_dir = upload_dir / "courses"
    course_images_dir.mkdir()
    (course_images_dir / "old.jpg").write_bytes(b"data")
    course = await make_course(db_session, image_url="/uploads/courses/old.jpg")

    payload = {**COURSE_PAYLOAD, "slug": "curso-test", "image_url": "/uploads/courses/new.jpg"}
    response = await admin_client.put(f"/api/courses/{course.id}", json=payload)

    assert response.status_code == 200
    assert not os.path.isfile(course_images_dir / "old.jpg")
