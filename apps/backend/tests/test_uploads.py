import os

from app.core.uploads import sweep_orphaned_images

JPEG_BYTES = b"\xff\xd8\xff\xe0fake-jpeg-content"


async def test_upload_course_image_requires_auth(client):
    response = await client.post(
        "/api/uploads/course-images",
        files={"file": ("photo.jpg", JPEG_BYTES, "image/jpeg")},
    )

    assert response.status_code == 401


async def test_upload_course_image_as_admin(admin_client, upload_dir):
    response = await admin_client.post(
        "/api/uploads/course-images",
        files={"file": ("photo.jpg", JPEG_BYTES, "image/jpeg")},
    )

    assert response.status_code == 200
    url = response.json()["url"]
    assert url.startswith("/uploads/courses/")
    assert url.endswith(".jpg")

    saved_path = upload_dir / "courses" / url.removeprefix("/uploads/courses/")
    assert os.path.isfile(saved_path)


async def test_upload_course_image_rejects_unsupported_type(admin_client):
    response = await admin_client.post(
        "/api/uploads/course-images",
        files={"file": ("doc.pdf", b"%PDF-1.4 fake", "application/pdf")},
    )

    assert response.status_code == 422


async def test_upload_course_image_rejects_oversized_file(admin_client):
    oversized = b"0" * (5 * 1024 * 1024 + 1)

    response = await admin_client.post(
        "/api/uploads/course-images",
        files={"file": ("photo.jpg", oversized, "image/jpeg")},
    )

    assert response.status_code == 413


def test_sweep_orphaned_images_removes_unreferenced_files(upload_dir):
    course_images_dir = upload_dir / "courses"
    course_images_dir.mkdir()
    (course_images_dir / "used.jpg").write_bytes(b"data")
    (course_images_dir / "orphan.jpg").write_bytes(b"data")

    removed = sweep_orphaned_images("courses", {"/uploads/courses/used.jpg"})

    assert removed == 1
    assert (course_images_dir / "used.jpg").exists()
    assert not (course_images_dir / "orphan.jpg").exists()


def test_sweep_orphaned_images_handles_missing_dir(upload_dir):
    removed = sweep_orphaned_images("courses", set())

    assert removed == 0


async def test_upload_menu_item_image_as_admin(admin_client, upload_dir):
    response = await admin_client.post(
        "/api/uploads/menu-item-images",
        files={"file": ("photo.jpg", JPEG_BYTES, "image/jpeg")},
    )

    assert response.status_code == 200
    url = response.json()["url"]
    assert url.startswith("/uploads/menu-items/")

    saved_path = upload_dir / "menu-items" / url.removeprefix("/uploads/menu-items/")
    assert os.path.isfile(saved_path)
