"""One-off provisioning script for the Keycloak realm this app needs.

Runs against an already-running Keycloak instance via the Admin REST API —
it does NOT touch docker-compose.yml or enable --import-realm (that flow is
intentionally not used yet, see CLAUDE.md). Safe to re-run: every step
checks whether the resource already exists before creating it.

Creates:
  - Realm "vca-pos", with the "vca-pos" login theme (keycloak/themes/vca-pos)
  - Client "vca-pos-frontend" (public, PKCE S256)
  - Client "vca-pos-backend" (confidential, reserved for future use)
  - Realm roles: Administrador, Cajero
  - A test user with the Administrador role (only if --with-test-user is passed)

Usage: uv run python scripts/setup_keycloak.py [--with-test-user]
"""

import argparse
import secrets
import sys

import httpx

sys.path.insert(0, ".")
from app.core.config import settings  # noqa: E402

REALM = "vca-pos"
LOGIN_THEME = "vca-pos"
FRONTEND_CLIENT_ID = "vca-pos-frontend"
BACKEND_CLIENT_ID = "vca-pos-backend"
ROLES = ["Administrador", "Cajero"]
TEST_USER_EMAIL = "admin@valientecafe.co"
DEV_REDIRECT_URI = "http://localhost:5173/*"
DEV_WEB_ORIGIN = "http://localhost:5173"

KC_BASE_URL = f"http://{settings.kc_hostname}:{settings.kc_port}"


def get_admin_token(client: httpx.Client) -> str:
    response = client.post(
        f"{KC_BASE_URL}/realms/master/protocol/openid-connect/token",
        data={
            "grant_type": "password",
            "client_id": "admin-cli",
            "username": settings.keycloak_admin_user,
            "password": settings.keycloak_admin_password,
        },
    )
    response.raise_for_status()
    return response.json()["access_token"]


def ensure_realm(client: httpx.Client) -> None:
    response = client.get(f"{KC_BASE_URL}/admin/realms/{REALM}")
    if response.status_code == 200:
        realm = response.json()
        if realm.get("loginTheme") != LOGIN_THEME:
            client.put(
                f"{KC_BASE_URL}/admin/realms/{REALM}",
                json={**realm, "loginTheme": LOGIN_THEME},
            ).raise_for_status()
            print(f"Realm '{REALM}' already exists, set loginTheme to '{LOGIN_THEME}'.")
        else:
            print(f"Realm '{REALM}' already exists, skipping.")
        return

    client.post(
        f"{KC_BASE_URL}/admin/realms",
        json={"realm": REALM, "enabled": True, "loginTheme": LOGIN_THEME},
    ).raise_for_status()
    print(f"Created realm '{REALM}' with loginTheme '{LOGIN_THEME}'.")


def find_client_uuid(client: httpx.Client, client_id: str) -> str | None:
    response = client.get(
        f"{KC_BASE_URL}/admin/realms/{REALM}/clients",
        params={"clientId": client_id},
    )
    response.raise_for_status()
    clients = response.json()
    return clients[0]["id"] if clients else None


def ensure_frontend_client(client: httpx.Client) -> None:
    if find_client_uuid(client, FRONTEND_CLIENT_ID):
        print(f"Client '{FRONTEND_CLIENT_ID}' already exists, skipping.")
        return

    client.post(
        f"{KC_BASE_URL}/admin/realms/{REALM}/clients",
        json={
            "clientId": FRONTEND_CLIENT_ID,
            "protocol": "openid-connect",
            "publicClient": True,
            "standardFlowEnabled": True,
            "directAccessGrantsEnabled": False,
            "redirectUris": [DEV_REDIRECT_URI],
            "webOrigins": [DEV_WEB_ORIGIN],
            "attributes": {"pkce.code.challenge.method": "S256"},
        },
    ).raise_for_status()
    print(f"Created client '{FRONTEND_CLIENT_ID}' (public, PKCE).")


def ensure_backend_client(client: httpx.Client) -> None:
    if find_client_uuid(client, BACKEND_CLIENT_ID):
        print(f"Client '{BACKEND_CLIENT_ID}' already exists, skipping.")
        return

    client.post(
        f"{KC_BASE_URL}/admin/realms/{REALM}/clients",
        json={
            "clientId": BACKEND_CLIENT_ID,
            "protocol": "openid-connect",
            "publicClient": False,
            "standardFlowEnabled": False,
            "directAccessGrantsEnabled": False,
        },
    ).raise_for_status()
    print(f"Created client '{BACKEND_CLIENT_ID}' (confidential, reserved).")


def ensure_roles(client: httpx.Client) -> None:
    response = client.get(f"{KC_BASE_URL}/admin/realms/{REALM}/roles")
    response.raise_for_status()
    existing = {role["name"] for role in response.json()}

    for role in ROLES:
        if role in existing:
            print(f"Role '{role}' already exists, skipping.")
            continue
        client.post(
            f"{KC_BASE_URL}/admin/realms/{REALM}/roles",
            json={"name": role},
        ).raise_for_status()
        print(f"Created role '{role}'.")


def ensure_test_user(client: httpx.Client) -> None:
    response = client.get(
        f"{KC_BASE_URL}/admin/realms/{REALM}/users",
        params={"email": TEST_USER_EMAIL, "exact": "true"},
    )
    response.raise_for_status()
    users = response.json()

    if users:
        print(f"Test user '{TEST_USER_EMAIL}' already exists, skipping.")
        return

    password = secrets.token_urlsafe(12)

    create_response = client.post(
        f"{KC_BASE_URL}/admin/realms/{REALM}/users",
        json={
            "username": TEST_USER_EMAIL,
            "email": TEST_USER_EMAIL,
            # Keycloak's declarative user profile requires these by default;
            # without them the account is flagged as "not fully set up" and
            # every login attempt fails with invalid_grant.
            "firstName": "Admin",
            "lastName": "Valiente Café",
            "enabled": True,
            "emailVerified": True,
            "credentials": [
                {"type": "password", "value": password, "temporary": False}
            ],
        },
    )
    create_response.raise_for_status()
    user_id = create_response.headers["Location"].rsplit("/", 1)[-1]

    role_response = client.get(
        f"{KC_BASE_URL}/admin/realms/{REALM}/roles/Administrador"
    )
    role_response.raise_for_status()
    admin_role = role_response.json()

    client.post(
        f"{KC_BASE_URL}/admin/realms/{REALM}/users/{user_id}/role-mappings/realm",
        json=[admin_role],
    ).raise_for_status()

    print(f"Created test user '{TEST_USER_EMAIL}' with role Administrador.")
    print(f"  Password: {password}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--with-test-user", action="store_true")
    args = parser.parse_args()

    with httpx.Client() as client:
        token = get_admin_token(client)
        client.headers["Authorization"] = f"Bearer {token}"

        ensure_realm(client)
        ensure_frontend_client(client)
        ensure_backend_client(client)
        ensure_roles(client)

        if args.with_test_user:
            ensure_test_user(client)

    print("\nDone.")


if __name__ == "__main__":
    main()
