from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy.engine import URL


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        # Reuses the repo-root env files (.env.dev/.env.staging/.env.prod)
        # instead of a separate backend-only .env, matching this repo's
        # single-env-file-per-environment convention.
        env_file=("../../.env.dev.local", "../../.env.dev", "../../.env"),
        extra="ignore",
    )

    app_db_host: str = "localhost"
    db_port: int = 5432
    app_db_name: str = "vca_pos_dev"
    app_db_username: str = "vca_pos_user"
    app_db_password: str = "changeme"

    cors_origins: list[str] = ["http://localhost:5173"]

    kc_hostname: str = "localhost"
    kc_port: int = 8080
    kc_realm: str = "valiente-cafe"
    keycloak_admin_user: str = "admin"
    keycloak_admin_password: str = "changeme"

    # Only used by scripts/setup_keycloak.py. kc_hostname is the *public*
    # hostname (baked into issued tokens' iss claim), but in staging/prod
    # that script runs inside the backend container via `docker compose
    # exec`, where Keycloak is only reachable through the Docker network
    # alias ("keycloak"), not the public hostname. None => fall back to
    # kc_hostname, which is correct for dev (script runs on the host).
    kc_admin_hostname: str | None = None

    # Full public base URL (scheme + host, no trailing slash) that ends up
    # in issued tokens' iss claim — e.g. "https://auth-staging.example.com".
    # Only needed in staging/prod, where Keycloak sits behind Caddy on 443
    # with no port in the URL: without this override kc_issuer falls back
    # to "http://{kc_hostname}:{kc_port}", which never matches a real
    # token's issuer behind a proxy and makes every JWT fail validation
    # with a generic 401. None => that legacy behavior, correct for dev
    # (Keycloak reached directly at http://localhost:8080, no proxy).
    kc_issuer_url: str | None = None

    upload_dir: str = "./uploads"

    @property
    def database_url(self) -> str:
        # Built via URL.create (not an f-string) so credentials containing
        # URL-reserved characters (@, /, :, ...) are percent-encoded instead
        # of corrupting the parsed host/user — see incident where an "@" in
        # APP_DB_PASSWORD made asyncpg try to resolve "<rest-of-password>@postgres".
        return URL.create(
            "postgresql+asyncpg",
            username=self.app_db_username,
            password=self.app_db_password,
            host=self.app_db_host,
            port=self.db_port,
            database=self.app_db_name,
        ).render_as_string(hide_password=False)

    @property
    def kc_issuer(self) -> str:
        base = self.kc_issuer_url or f"http://{self.kc_hostname}:{self.kc_port}"
        return f"{base}/realms/{self.kc_realm}"

    @property
    def kc_jwks_uri(self) -> str:
        # A network-fetch target, not a string comparison like kc_issuer —
        # always go through kc_admin_hostname (the internal Docker alias in
        # staging/prod) rather than the public kc_issuer_url, so this never
        # depends on the backend container being able to reach its own
        # public domain/proxy.
        host = self.kc_admin_hostname or self.kc_hostname
        return f"http://{host}:{self.kc_port}/realms/{self.kc_realm}/protocol/openid-connect/certs"


settings = Settings()
