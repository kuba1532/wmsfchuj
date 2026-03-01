from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.db.database import engine, SessionLocal, Base
from app.api.v1.router import api_router

settings = get_settings()


def seed_admin():
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
            role=RoleEnum.ADMINISTRATOR,
        )
        db.add(admin)
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


@asynccontextmanager
async def lifespan(_: FastAPI):
    if settings.DEBUG:
        Base.metadata.create_all(bind=engine)
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
    return {"status": "ok", "version": settings.APP_VERSION}