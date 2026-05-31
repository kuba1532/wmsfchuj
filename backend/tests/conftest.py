"""Wspólna konfiguracja testów backendu (pytest).

Testy uruchamiamy na izolowanej bazie SQLite w pamięci (StaticPool — jedno
połączenie współdzielone między sesjami), więc:
- nie dotykamy produkcyjnego MySQL,
- każdy test startuje z czystym schematem (fixture `_fresh_db`).

`DATABASE_URL` ustawiamy na nieużywany URL MySQL tylko po to, by import
`app.db.database` (który tworzy „prawdziwy" engine leniwie) się powiódł.
Realne zapytania idą przez nadpisaną zależność `get_db` → silnik SQLite.
"""

import os
from datetime import datetime, timezone

# ── Zmienne środowiskowe MUSZĄ być ustawione przed importem aplikacji ──
os.environ.setdefault(
    "DATABASE_URL", "mysql+mysqldb://wms:wms@127.0.0.1:3306/wms_tests_unused"
)
os.environ.setdefault(
    "JWT_SECRET_KEY", "pytest-jwt-secret-key-0123456789-abcdefghijklmnop"
)
os.environ.setdefault("ADMIN_PASSWORD", "TestWmsAdmin2026")
os.environ.setdefault("SEED_DEMO_TASKS", "false")
os.environ.setdefault("SMTP_ENABLED", "false")
os.environ.setdefault("DEBUG", "false")
os.environ.setdefault("SECURITY_HEADERS_ENABLED", "false")

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.database import Base, get_db
import app.models.models as m
from app.core.security import hash_password
from app.main import app


_test_engine = create_engine(
    "sqlite+pysqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(bind=_test_engine, autoflush=False, autocommit=False)


def _override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = _override_get_db


@pytest.fixture(autouse=True)
def _fresh_db():
    """Czysty schemat przed i po każdym teście (pełna izolacja)."""
    Base.metadata.drop_all(bind=_test_engine)
    Base.metadata.create_all(bind=_test_engine)
    yield
    Base.metadata.drop_all(bind=_test_engine)


@pytest.fixture
def db():
    s = TestingSessionLocal()
    try:
        yield s
    finally:
        s.close()


@pytest.fixture
def client():
    # Bez context-managera — nie uruchamiamy lifespan (migracje/seed na MySQL).
    return TestClient(app)


# ─────────────────────────────
# FABRYKI / HELPERY
# ─────────────────────────────

@pytest.fixture
def make_user():
    """Tworzy użytkownika w bazie testowej i zwraca obiekt (scalary dostępne po close)."""

    def _make(
        login_code: str,
        role: m.RoleEnum,
        password: str = "Haslo123",
        *,
        is_active: bool = True,
        must_set_password: bool = False,
        password_set_at=...,
    ) -> m.User:
        if password_set_at is ...:
            password_set_at = datetime.now(timezone.utc)
        s = TestingSessionLocal()
        try:
            user = m.User(
                login_code=login_code,
                email=f"user{login_code}@test.pl",
                password_hash=hash_password(password),
                first_name="Test",
                last_name=role.value.title(),
                role=role,
                is_active=is_active,
                must_set_password=must_set_password,
                password_set_at=password_set_at,
            )
            s.add(user)
            s.commit()
            s.refresh(user)
            s.expunge(user)
            return user
        finally:
            s.close()

    return _make


@pytest.fixture
def auth_header(client):
    def _h(login_code: str, password: str = "Haslo123") -> dict:
        r = client.post(
            "/api/v1/auth/login", json={"login": login_code, "password": password}
        )
        assert r.status_code == 200, f"Login nieudany: {r.status_code} {r.text}"
        return {"Authorization": f"Bearer {r.json()['access_token']}"}

    return _h


@pytest.fixture
def stock_qty():
    """Zwraca ilość stanu dla (product_id, location_id) lub None — świeża sesja."""

    def _qty(product_id: int, location_id: int):
        s = TestingSessionLocal()
        try:
            row = (
                s.query(m.Stock)
                .filter(
                    m.Stock.product_id == product_id,
                    m.Stock.location_id == location_id,
                    m.Stock.status == m.StockStatusEnum.AVAILABLE,
                )
                .first()
            )
            return None if row is None else row.quantity
        finally:
            s.close()

    return _qty


@pytest.fixture
def ledger_count():
    """Liczba wpisów w rejestrze ruchów (opcjonalnie dla danego typu)."""

    def _count(movement_type: m.MovementTypeEnum | None = None) -> int:
        s = TestingSessionLocal()
        try:
            q = s.query(m.StockLedger)
            if movement_type is not None:
                q = q.filter(m.StockLedger.movement_type == movement_type)
            return q.count()
        finally:
            s.close()

    return _count


class _Warehouse:
    def __init__(self, supplier_id, location_id, product1_id, product2_id):
        self.supplier_id = supplier_id
        self.location_id = location_id
        self.product1_id = product1_id
        self.product2_id = product2_id


@pytest.fixture
def seed_warehouse():
    """Tworzy 2 produkty, lokalizację STORAGE, dostawcę i powiązania (dla PZ/RW)."""
    s = TestingSessionLocal()
    try:
        p1 = m.Product(sku="PRD-T1", name="Produkt testowy 1", unit="szt", is_active=True)
        p2 = m.Product(sku="PRD-T2", name="Produkt testowy 2", unit="szt", is_active=True)
        loc = m.Location(code="STO-T1", type=m.LocationTypeEnum.STORAGE, is_active=True)
        sup = m.Supplier(code="SUP-T1", name="Dostawca testowy", is_active=True)
        s.add_all([p1, p2, loc, sup])
        s.flush()
        s.add_all(
            [
                m.SupplierProduct(supplier_id=sup.id, product_id=p1.id),
                m.SupplierProduct(supplier_id=sup.id, product_id=p2.id),
            ]
        )
        s.commit()
        return _Warehouse(sup.id, loc.id, p1.id, p2.id)
    finally:
        s.close()
