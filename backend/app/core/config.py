from functools import lru_cache
from pathlib import Path

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# Zawsze `backend/.env` — bez wzgledu na CWD przy `uvicorn` (np. uruchomienie z katalogu nadrzednym).
_BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
_ENV_FILE = _BACKEND_DIR / ".env"


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str
    DB_POOL_SIZE: int = 30
    DB_MAX_OVERFLOW: int = 60
    DB_POOL_TIMEOUT_SECONDS: int = 30
    DB_POOL_RECYCLE_SECONDS: int = 1800

    # JWT
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # App
    APP_NAME: str = "WMS System"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False

    # CORS — lista dokładnych originów (np. frontend Vite)
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000"
    # True = dopuść też localhost / 127.0.0.1 z dowolnym portem (Flutter Web, inne narzędzia)
    CORS_ALLOW_LOCALHOST_REGEX: bool = True
    # True = dopuść origin http(s)://192.168.x.x:port i 10.x.x.x (demo w sieci LAN — tablet/telefon)
    CORS_ALLOW_LAN: bool = True

    # Session / security
    SESSION_TIMEOUT_MINUTES: int = 30
    MAX_LOGIN_ATTEMPTS: int = 5
    LOCKOUT_DURATION_MINUTES: int = 5

    # Admin (first run)
    ADMIN_EMAIL: str = "admin@wms.pl"
    ADMIN_PASSWORD: str

    # Przykładowe zadania (tylko gdy tabela tasks jest pusta)
    SEED_DEMO_TASKS: bool = True
    # Konto operatora mobilnego (zadania przypisane do tego użytkownika)
    DEMO_WORKER_EMAIL: str = "operator@wms.pl"
    DEMO_WORKER_PASSWORD: str = "Demo1234"

    # Frontend URL used in e-mail links
    FRONTEND_BASE_URL: str = "http://localhost:5173"

    # SMTP (account setup mails)
    SMTP_ENABLED: bool = False
    SMTP_HOST: str = "localhost"
    SMTP_PORT: int = 1025
    SMTP_USE_TLS: bool = False
    SMTP_USERNAME: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM: str = "no-reply@wms.pl"

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
                "ADMIN_PASSWORD zawiera domyslna/niedozwolona wartosc. "
                "W backend/.env ustaw inne haslo (np. DevWmsAdmin2026). "
                "Na Windows zmienna srodowiskowa ADMIN_PASSWORD ma priorytet "
                "nad plikiem .env — jesli edytujesz .env a nadal widzisz ten blad, "
                "usun ADMIN_PASSWORD z: Ustawienia -> Zmienne srodowiskowe lub "
                "w PowerShell: Remove-Item Env:ADMIN_PASSWORD. "
                "Sprawdz tez profil PowerShell ($PROFILE) czy nie ma tam "
                "$env:ADMIN_PASSWORD=..."
            )
        return v

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    model_config = SettingsConfigDict(
        env_file=_ENV_FILE,
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache()
def get_settings() -> Settings:
    return Settings()