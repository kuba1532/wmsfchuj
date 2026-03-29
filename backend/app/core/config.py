from functools import lru_cache

from pydantic import field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str

    # JWT
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # App
    APP_NAME: str = "WMS System"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False

    # CORS
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000"

    # Session / security
    SESSION_TIMEOUT_MINUTES: int = 30
    MAX_LOGIN_ATTEMPTS: int = 5
    LOCKOUT_DURATION_MINUTES: int = 5

    # Admin (first run)
    ADMIN_EMAIL: str = "admin@wms.pl"
    ADMIN_PASSWORD: str

    @field_validator("JWT_SECRET_KEY")
    @classmethod
    def jwt_secret_must_be_strong(cls, v: str) -> str:
        if len(v) < 32:
            raise ValueError(
                "JWT_SECRET_KEY musi miec co najmniej 32 znaki. "
                "Wygeneruj bezpieczny klucz np.: openssl rand -hex 32"
            )
        if v in ("change-me-in-production", "your-super-secret-key-change-in-production"):
            raise ValueError(
                "JWT_SECRET_KEY zawiera domyslna wartosc. "
                "Ustaw unikalny klucz w pliku .env"
            )
        return v

    @field_validator("ADMIN_PASSWORD")
    @classmethod
    def admin_password_must_be_set(cls, v: str) -> str:
        if not v or v == "Admin123!":
            raise ValueError(
                "ADMIN_PASSWORD zawiera domyslna wartosc. "
                "Ustaw bezpieczne haslo administratora w pliku .env"
            )
        return v

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    model_config = {"env_file": ".env", "extra": "ignore"}


@lru_cache()
def get_settings() -> Settings:
    return Settings()