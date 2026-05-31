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


def seed_demo_worker() -> None:
    """Konto magazyniera (WORKER) do demo — tylko gdy brak użytkownika z DEMO_WORKER_EMAIL."""
    if not settings.SEED_DEMO_TASKS:
        return

    from app.models.models import User, RoleEnum
    from app.core.security import hash_password, generate_login_code

    db = SessionLocal()
    try:
        if db.query(User).filter(User.email == settings.DEMO_WORKER_EMAIL).first():
            return

        existing_codes = {code for (code,) in db.query(User.login_code).all()}
        preferred = "00002"
        login_code = preferred if preferred not in existing_codes else generate_login_code(existing_codes)

        worker = User(
            login_code=login_code,
            email=settings.DEMO_WORKER_EMAIL,
            password_hash=hash_password(settings.DEMO_WORKER_PASSWORD),
            first_name="Operator",
            last_name="Magazynu",
            role=RoleEnum.WORKER,
        )
        db.add(worker)
        db.commit()
        logger.info("Konto magazyniera demo zostalo utworzone (login_code=%s).", login_code)
    except Exception:
        db.rollback()
        logger.exception("Blad podczas tworzenia konta magazyniera demo.")
        raise
    finally:
        db.close()


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


def seed_demo_tasks() -> None:
    """Przykładowe zadania (preferencyjnie dla konta magazyniera demo) — tylko gdy brak zadań w bazie."""
    if not settings.SEED_DEMO_TASKS:
        return

    from datetime import datetime, timezone
    from decimal import Decimal

    from app.seed_presentation import DEMO_PRODUCTS

    _demo_names = {x["sku"]: x["name"] for x in DEMO_PRODUCTS}

    from app.models.models import (
        User,
        Product,
        Location,
        Task,
        TaskTypeEnum,
        TaskStatusEnum,
        LocationTypeEnum,
    )

    db = SessionLocal()
    try:
        if db.query(Task).count() > 0:
            return

        admin = db.query(User).filter(User.email == settings.ADMIN_EMAIL).first()
        worker = db.query(User).filter(User.email == settings.DEMO_WORKER_EMAIL).first()
        assignee = worker or admin
        if not assignee:
            return

        p1 = db.query(Product).filter(Product.sku == "PRD-1001").first()
        if not p1:
            p1 = Product(
                sku="PRD-1001",
                name=_demo_names["PRD-1001"],
                unit="szt",
                is_active=True,
            )
            db.add(p1)
            db.flush()

        p2 = db.query(Product).filter(Product.sku == "PRD-1002").first()
        if not p2:
            p2 = Product(
                sku="PRD-1002",
                name=_demo_names["PRD-1002"],
                unit="szt",
                is_active=True,
            )
            db.add(p2)
            db.flush()

        buf = db.query(Location).filter(Location.code == "BUF-01").first()
        if not buf:
            buf = Location(code="BUF-01", type=LocationTypeEnum.BUFFER, is_active=True)
            db.add(buf)
            db.flush()

        sto = db.query(Location).filter(Location.code == "STO-01").first()
        if not sto:
            sto = Location(code="STO-01", type=LocationTypeEnum.STORAGE, is_active=True)
            db.add(sto)
            db.flush()

        pick = db.query(Location).filter(Location.code == "PICK-01").first()
        if not pick:
            pick = Location(code="PICK-01", type=LocationTypeEnum.PICKING_ZONE, is_active=True)
            db.add(pick)
            db.flush()

        now = datetime.now(timezone.utc)
        for t in (
            Task(
                type=TaskTypeEnum.PUTAWAY,
                status=TaskStatusEnum.ASSIGNED,
                product_id=p1.id,
                to_location_id=buf.id,
                quantity=Decimal("12"),
                assigned_to_id=assignee.id,
                created_by_id=admin.id if admin else assignee.id,
            ),
            Task(
                type=TaskTypeEnum.MOVE,
                status=TaskStatusEnum.ASSIGNED,
                product_id=p1.id,
                from_location_id=buf.id,
                to_location_id=sto.id,
                quantity=Decimal("4"),
                assigned_to_id=assignee.id,
                created_by_id=admin.id if admin else assignee.id,
            ),
            Task(
                type=TaskTypeEnum.PICKING,
                status=TaskStatusEnum.IN_PROGRESS,
                product_id=p2.id,
                from_location_id=pick.id,
                quantity=Decimal("1"),
                assigned_to_id=assignee.id,
                created_by_id=admin.id if admin else assignee.id,
                started_at=now,
            ),
            Task(
                type=TaskTypeEnum.INVENTORY,
                status=TaskStatusEnum.ASSIGNED,
                product_id=p2.id,
                from_location_id=sto.id,
                quantity=Decimal("0"),
                assigned_to_id=assignee.id,
                created_by_id=admin.id if admin else assignee.id,
            ),
        ):
            db.add(t)

        db.commit()
        logger.info("Dodano przykladowe zadania demo (przypisane do konta admina).")
    except Exception:
        db.rollback()
        logger.exception("Blad podczas tworzenia zadan demo.")
        raise
    finally:
        db.close()


def seed_recipients() -> None:
    """Katalog odbiorców RW (wybór z listy) — tylko gdy tabela pusta."""
    from app.models.models import Recipient

    db = SessionLocal()
    try:
        if db.query(Recipient).first():
            return
        catalog = [
            ("ODB-001", "Janex Sp. z o.o. — odbiór Warszawa Mokotów"),
            ("ODB-002", "Sklep „Narzędzie+” — salon Kraków, ul. Fabryczna"),
            ("ODB-003", "Zakład produkcyjny — Hala B, Łódź"),
            ("ODB-004", "DPD Polska — nadanie zbiorcze (B2B)"),
            ("ODB-005", "Odbiór osobisty — biuro centralne"),
            ("ODB-006", "Market budowlany „Dom i Ogród” — Poznań"),
        ]
        for code, name in catalog:
            db.add(Recipient(code=code, name=name, is_active=True))
        db.commit()
        logger.info("Dodano %s odbiorcow demo (recipients).", len(catalog))
    except Exception:
        db.rollback()
        logger.exception("Blad podczas seedu odbiorcow.")
        raise
    finally:
        db.close()


def seed_suppliers() -> None:
    """Domyślny dostawca + powiązania aktywnych produktów (dla PZ)."""
    from app.models.models import Supplier, SupplierProduct, Product

    db = SessionLocal()
    try:
        if db.query(Supplier).first():
            return
        s = Supplier(code="SUP-001", name="Northwind Supplies", is_active=True)
        db.add(s)
        db.flush()
        for p in db.query(Product).filter(Product.is_active.is_(True)).all():
            db.add(SupplierProduct(supplier_id=s.id, product_id=p.id))
        db.commit()
        logger.info("Dodano dostawce SUP-001 i powiazania produktow (supplier_products).")
    except Exception:
        db.rollback()
        logger.exception("Blad podczas seedu dostawcow.")
        raise
    finally:
        db.close()


def ensure_supplier_product_links() -> None:
    """Dopisuje brakujące powiązania SUP-001 ↔ produkty (PZ po skanie SKU).

    Pierwszy seed dostawcy robił `if Supplier.first(): return`, więc nowe produkty
    mogły trafić do bazy bez wpisu w supplier_products — wtedy mobilka pokazuje
    „Brak produktów” przy wybranym dostawcy."""
    from app.models.models import Supplier, SupplierProduct, Product

    db = SessionLocal()
    try:
        s = db.query(Supplier).filter(Supplier.code == "SUP-001").first()
        if not s or not s.is_active:
            return
        linked = {
            sp.product_id
            for sp in db.query(SupplierProduct).filter(SupplierProduct.supplier_id == s.id).all()
        }
        added = 0
        for p in db.query(Product).filter(Product.is_active.is_(True)).all():
            if p.id not in linked:
                db.add(SupplierProduct(supplier_id=s.id, product_id=p.id))
                added += 1
        if added:
            db.commit()
            logger.info("Uzupelniono supplier_products: +%s produktow dla SUP-001.", added)
    except Exception:
        db.rollback()
        logger.exception("Blad podczas uzupelniania supplier_products.")
        raise
    finally:
        db.close()


@asynccontextmanager
async def lifespan(_: FastAPI):
    run_migrations()
    seed_admin()
    seed_demo_worker()
    seed_demo_tasks()
    from app.seed_presentation import run_presentation_seed_if_enabled

    run_presentation_seed_if_enabled(settings)
    seed_recipients()
    seed_suppliers()
    ensure_supplier_product_links()
    yield


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    lifespan=lifespan,
)

_cors_kw: dict = {
    "allow_origins": settings.cors_origins_list,
    "allow_credentials": True,
    "allow_methods": ["*"],
    "allow_headers": ["*"],
}
_cors_regex_parts: list[str] = []
if settings.CORS_ALLOW_LOCALHOST_REGEX:
    _cors_regex_parts.append(r"https?://(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?")
if settings.CORS_ALLOW_LAN:
    # RFC1918: 192.168/8, 10/8, 172.16–172.31 (m.in. hotspot iPhone → 172.20.x.x)
    _cors_regex_parts.append(
        r"https?://(192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|"
        r"172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3})(:\d+)?"
    )
if _cors_regex_parts:
    _cors_kw["allow_origin_regex"] = (
        "|".join(f"({p})" for p in _cors_regex_parts)
        if len(_cors_regex_parts) > 1
        else _cors_regex_parts[0]
    )
app.add_middleware(CORSMiddleware, **_cors_kw)

# ── Bezpieczeństwo: nagłówki ochronne, limit żądań, kontrola hosta ──
# Uwaga: kolejność add_middleware jest odwrotna do wykonania (ostatni dodany
# wykonuje się jako pierwszy), dlatego rate-limit/host dodajemy po nagłówkach.
from app.middleware.security import SecurityHeadersMiddleware, RateLimitMiddleware
from starlette.middleware.trustedhost import TrustedHostMiddleware

if settings.SECURITY_HEADERS_ENABLED:
    app.add_middleware(
        SecurityHeadersMiddleware,
        hsts_enabled=settings.HSTS_ENABLED,
        hsts_max_age=settings.HSTS_MAX_AGE_SECONDS,
    )

if settings.RATE_LIMIT_PER_MINUTE > 0:
    app.add_middleware(RateLimitMiddleware, limit_per_minute=settings.RATE_LIMIT_PER_MINUTE)

_trusted = settings.trusted_hosts_list
if _trusted != ["*"]:
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=_trusted)

app.include_router(api_router)


# Exception handler for unhandled server errors — loguje pełny traceback,
# żeby 500-ki nie kończyły się cichym "Internal Server Error" bez śladu.
import sys
import traceback
from fastapi import Request
from fastapi.responses import JSONResponse


@app.exception_handler(Exception)
async def _unhandled_exception_handler(request: Request, exc: Exception):
    traceback.print_exception(type(exc), exc, exc.__traceback__, file=sys.stderr)
    sys.stderr.flush()
    logger.exception("Unhandled exception for %s %s", request.method, request.url.path)
    # W produkcji (DEBUG=false) nie ujawniamy typu/treści wyjątku klientowi —
    # ogranicza information disclosure wykrywany przez skanery bezpieczeństwa.
    detail = f"{type(exc).__name__}: {exc}" if settings.DEBUG else "Wewnetrzny blad serwera."
    return JSONResponse(
        status_code=500,
        content={"detail": detail},
    )


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