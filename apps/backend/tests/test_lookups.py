from app.models.product import product_presentations
from tests.conftest import make_presentation, make_product


async def test_list_presentations_is_public(client):
    response = await client.get("/api/presentations")

    assert response.status_code == 200
    assert response.json() == []


async def test_create_presentation_requires_auth(client):
    response = await client.post(
        "/api/presentations", json={"name_es": "Molido", "name_en": "Ground"}
    )

    assert response.status_code == 401


async def test_create_presentation_as_admin(admin_client):
    response = await admin_client.post(
        "/api/presentations", json={"name_es": "Molido", "name_en": "Ground"}
    )

    assert response.status_code == 201
    assert response.json()["name"]["es"] == "Molido"


async def test_update_presentation_as_admin(db_session, admin_client):
    presentation = await make_presentation(db_session)

    response = await admin_client.put(
        f"/api/presentations/{presentation.id}",
        json={"name_es": "Actualizada", "name_en": "Updated"},
    )

    assert response.status_code == 200
    assert response.json()["name"]["es"] == "Actualizada"


async def test_delete_presentation_as_admin(db_session, admin_client):
    presentation = await make_presentation(db_session)

    response = await admin_client.delete(f"/api/presentations/{presentation.id}")

    assert response.status_code == 204


async def test_delete_presentation_in_use_detaches_it_from_product(db_session, admin_client):
    presentation = await make_presentation(db_session)
    product = await make_product(db_session)
    await db_session.execute(
        product_presentations.insert().values(product_id=product.id, presentation_id=presentation.id)
    )
    await db_session.commit()

    response = await admin_client.delete(f"/api/presentations/{presentation.id}")

    assert response.status_code == 204
    products_response = await admin_client.get("/api/products/admin")
    assert products_response.json()["items"][0]["presentations"] == []
