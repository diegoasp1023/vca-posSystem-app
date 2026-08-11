from pydantic_settings import BaseSettings, SettingsConfigDict


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
        return (
            f"postgresql+asyncpg://{self.app_db_username}:{self.app_db_password}"
            f"@{self.app_db_host}:{self.db_port}/{self.app_db_name}"
        )

    @property
    def kc_issuer(self) -> str:
        return f"http://{self.kc_hostname}:{self.kc_port}/realms/{self.kc_realm}"

    @property
    def kc_jwks_uri(self) -> str:
        return f"{self.kc_issuer}/protocol/openid-connect/certs"


settings = Settings()
