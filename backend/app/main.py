import logging
from contextlib import asynccontextmanager

from alembic import command
from alembic.config import Config
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.db.database import SessionLocal
from app.api.v1.router import api_router

logger = logging.getLogger(__name__)
settings = get_settings()


def run_migrations() -> None:
    try:
        alembic_cfg = Config("alembic.ini")
        command.upgrade(alembic_cfg, "head")
        logger.info("Migracje bazy danych zakonczone pomyslnie.")
    except Exception:
        logger.exception("Blad podczas wykonywania migracji bazy danych.")
        raise


def seed_admin() -> None:
    from app.models.models import User, RoleEnum
    from app.core.security import hash_password, generate_login_code

    db = SessionLocal()
    try:
        admin = db.query(User).filter(User.email == settings.ADMIN_EMAIL).first()
        if admin:
            return

        existing_codes = {code for (code,) in db.query(User.login_code).all()}
        preferred = "00001"
        login_code = preferred if preferred not in existing_codes else generate_login_code(existing_codes)

        admin = User(
            login_code=login_code,
            email=settings.ADMIN_EMAIL,
            password_hash=hash_password(settings.ADMIN_PASSWORD),
            first_name="Admin",
            last_name="System",
            role=RoleEnum.ADMIN,
        )
        db.add(admin)
        db.commit()
        logger.info("Konto administratora zostalo utworzone (login_code=%s).", login_code)
    except Exception:
        db.rollback()
        logger.exception("Blad podczas tworzenia konta administratora.")
        raise
    finally:
        db.close()


@asynccontextmanager
async def lifespan(_: FastAPI):
    run_migrations()
    seed_admin()
    yield


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)


@app.get("/api/health")
def health_check():
    from sqlalchemy import text
    try:
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
        db_status = "ok"
    except Exception:
        db_status = "error"

    return {
        "status": "ok" if db_status == "ok" else "degraded",
        "version": settings.APP_VERSION,
        "database": db_status,
    }