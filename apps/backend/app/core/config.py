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
        return f"http://{self.kc_hostname}:{self.kc_port}/realms/{self.kc_realm}"

    @property
    def kc_jwks_uri(self) -> str:
        return f"{self.kc_issuer}/protocol/openid-connect/certs"


settings = Settings()
