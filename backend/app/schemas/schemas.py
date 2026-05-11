from datetime import datetime
from decimal import Decimal
from typing import Generic, Optional, TypeVar

from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator

T = TypeVar("T")


# ── AUTH ─────────────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    login: str = Field(..., min_length=5, max_length=5, pattern=r"^\d{5}$")
    password: str = Field(..., min_length=1)


class UserResponse(BaseModel):
    id: int
    login_code: str
    email: str
    first_name: str
    last_name: str
    role: str
    is_active: bool
    must_set_password: bool
    created_at: datetime
    version: int

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserResponse


class RefreshRequest(BaseModel):
    refresh_token: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8)

    @field_validator("new_password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if not any(c.isalpha() for c in v):
            raise ValueError("Haslo musi zawierac co najmniej jedna litere.")
        if not any(c.isdigit() for c in v):
            raise ValueError("Haslo musi zawierac co najmniej jedna cyfre.")
        return v


class SetPasswordRequest(BaseModel):
    token: str = Field(..., min_length=32, max_length=1024)
    new_password: str = Field(..., min_length=8)

    @field_validator("new_password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if not any(c.isalpha() for c in v):
            raise ValueError("Haslo musi zawierac co najmniej jedna litere.")
        if not any(c.isdigit() for c in v):
            raise ValueError("Haslo musi zawierac co najmniej jedna cyfre.")
        return v


# ── USER ─────────────────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    email: EmailStr
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    role: str = Field(..., pattern=r"^(ADMIN|MANAGER|FOREMAN|WORKER)$")


class UserCreateResponse(BaseModel):
    user: UserResponse
    setup_password_url: str


class UserUpdate(BaseModel):
    """Email nie jest edytowalny — identyfikator konta pozostaje bez zmian."""
    first_name: Optional[str] = Field(None, max_length=100)
    last_name: Optional[str] = Field(None, max_length=100)
    role: Optional[str] = Field(None, pattern=r"^(ADMIN|MANAGER|FOREMAN|WORKER)$")
    is_active: Optional[bool] = None
    version: int = Field(..., description="Wersja rekordu (optimistic locking)")


# ── PRODUCT ──────────────────────────────────────────────────────────────────

class ProductCreate(BaseModel):
    sku: str = Field(..., min_length=1, max_length=50, pattern=r"^[A-Za-z0-9\-]+$")
    ean: Optional[str] = Field(None, max_length=13, pattern=r"^\d{8,13}$")
    name: str = Field(..., min_length=1, max_length=255)
    unit: str = Field("szt", max_length=20)
    description: Optional[str] = None


class ProductUpdate(BaseModel):
    sku: Optional[str] = Field(None, min_length=1, max_length=50, pattern=r"^[A-Za-z0-9\-]+$")
    name: Optional[str] = Field(None, max_length=255)
    ean: Optional[str] = Field(None, max_length=13, pattern=r"^\d{8,13}$")
    unit: Optional[str] = Field(None, max_length=20)
    description: Optional[str] = None
    is_active: Optional[bool] = None
    version: int = Field(..., description="Wersja rekordu (optimistic locking)")


class ProductResponse(BaseModel):
    id: int
    sku: str
    ean: Optional[str]
    name: str
    unit: str
    description: Optional[str]
    is_active: bool
    created_at: datetime
    version: int

    model_config = {"from_attributes": True}


# ── LOCATION ─────────────────────────────────────────────────────────────────

class LocationCreate(BaseModel):
    code: str = Field(..., min_length=1, max_length=50)
    type: str = Field(..., pattern=r"^(BUFFER|STORAGE|PICKING_ZONE)$")
    row: Optional[str] = Field(None, max_length=10)
    rack: Optional[str] = Field(None, max_length=10)
    shelf: Optional[str] = Field(None, max_length=10)

    @field_validator("code")
    @classmethod
    def normalize_location_code(cls, v: str) -> str:
        value = v.strip().upper()
        if not value:
            raise ValueError("Kod lokalizacji nie moze byc pusty.")
        if not all(ch.isalnum() or ch == "-" for ch in value):
            raise ValueError("Kod lokalizacji moze zawierac tylko A-Z, 0-9 i myślnik.")
        return value


class LocationUpdate(BaseModel):
    code: Optional[str] = Field(None, max_length=50)
    type: Optional[str] = Field(None, pattern=r"^(BUFFER|STORAGE|PICKING_ZONE)$")
    row: Optional[str] = Field(None, max_length=10)
    rack: Optional[str] = Field(None, max_length=10)
    shelf: Optional[str] = Field(None, max_length=10)
    is_active: Optional[bool] = None
    version: int = Field(..., description="Wersja rekordu (optimistic locking)")

    @field_validator("code")
    @classmethod
    def normalize_location_code(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        value = v.strip().upper()
        if not value:
            raise ValueError("Kod lokalizacji nie moze byc pusty.")
        if not all(ch.isalnum() or ch == "-" for ch in value):
            raise ValueError("Kod lokalizacji moze zawierac tylko A-Z, 0-9 i myślnik.")
        return value


class LocationResponse(BaseModel):
    id: int
    code: str
    type: str
    row: Optional[str]
    rack: Optional[str]
    shelf: Optional[str]
    is_active: bool
    created_at: datetime
    version: int

    model_config = {"from_attributes": True}


# ── STOCK ────────────────────────────────────────────────────────────────────

class StockResponse(BaseModel):
    id: int
    product_id: int
    location_id: int
    quantity: Decimal
    status: str
    version: int

    model_config = {"from_attributes": True}


class StockStatusChange(BaseModel):
    status: str = Field(..., pattern=r"^(AVAILABLE|BLOCKED)$")
    version: int = Field(..., description="Wersja rekordu (optimistic locking)")
    quantity: Optional[Decimal] = Field(
        None,
        gt=0,
        description=(
            "Opcjonalna ilość do przełączenia statusu. "
            "Jeśli mniejsza niż bieżąca — rekord zostaje rozdzielony: "
            "pozostała ilość zachowuje stary status, a podana ilość trafia do nowego statusu."
        ),
    )


# ── DOCUMENT ─────────────────────────────────────────────────────────────────

class DocumentItemCreate(BaseModel):
    product_id: int
    quantity: Decimal = Field(..., gt=0)


class DocumentCreatePZ(BaseModel):
    supplier_id: int = Field(..., gt=0, description="Dostawca z katalogu — tylko jego produkty")
    to_location_id: int = Field(..., gt=0, description="Docelowa lokalizacja przyjęcia (magazyn/picking)")
    items: list[DocumentItemCreate] = Field(..., min_length=1)


class DocumentCreateMM(BaseModel):
    from_location_id: int
    to_location_id: int
    items: list[DocumentItemCreate] = Field(..., min_length=1)

    @field_validator("to_location_id")
    @classmethod
    def locations_must_differ(cls, v: int, info) -> int:
        if info.data.get("from_location_id") == v:
            raise ValueError("Lokalizacja zrodlowa i docelowa musza byc rozne.")
        return v


class DocumentCreateRW(BaseModel):
    """RW: jawna lokalizacja pobrania + odbiorca z listy (recipient_id) lub legacy pole recipient."""

    from_location_id: int = Field(..., gt=0)
    recipient_id: Optional[int] = Field(None, gt=0)
    recipient: Optional[str] = Field(None, min_length=1, max_length=255)
    items: list[DocumentItemCreate] = Field(..., min_length=1)

    @model_validator(mode="after")
    def require_recipient_source(self) -> "DocumentCreateRW":
        if self.recipient_id is not None:
            return self
        if self.recipient and str(self.recipient).strip():
            return self
        raise ValueError("Wybierz odbiorce z listy (recipient_id) lub podaj pole recipient (tekst).")


class DocumentItemResponse(BaseModel):
    id: int
    product_id: int
    quantity: Decimal
    putaway_to_location_id: Optional[int] = None
    putaway_to_location_code: Optional[str] = None
    product: Optional[ProductResponse] = None

    model_config = {"from_attributes": True}


class DocumentLinkedTaskBrief(BaseModel):
    """Powiązane zadanie magazynowe (ten sam dokument_id)."""

    id: int
    type: str
    status: str


class DocumentResponse(BaseModel):
    id: int
    number: str
    type: str
    status: str
    supplier_id: Optional[int] = None
    supplier: Optional[str] = None
    from_location_id: Optional[int] = None
    to_location_id: Optional[int] = None
    from_location_code: Optional[str] = None
    to_location_code: Optional[str] = None
    recipient: Optional[str] = None
    created_by_id: int
    created_at: datetime
    items: list[DocumentItemResponse] = []
    related_tasks: list[DocumentLinkedTaskBrief] = []

    model_config = {"from_attributes": True}


class SupplierResponse(BaseModel):
    id: int
    code: str
    name: str
    is_active: bool

    model_config = {"from_attributes": True}


class RecipientResponse(BaseModel):
    id: int
    code: str
    name: str
    is_active: bool

    model_config = {"from_attributes": True}


# ── TASK ─────────────────────────────────────────────────────────────────────

class TaskCreate(BaseModel):
    type: str = Field(..., pattern=r"^(PUTAWAY|PICKING|MOVE|INVENTORY)$")
    product_id: Optional[int] = None
    from_location_id: Optional[int] = None
    to_location_id: Optional[int] = None
    quantity: Decimal = Field(Decimal("0"), ge=0)
    assigned_to_id: int


class TaskResponse(BaseModel):
    id: int
    type: str
    status: str
    product_id: Optional[int] = None
    from_location_id: Optional[int] = None
    to_location_id: Optional[int] = None
    quantity: Decimal
    assigned_to_id: Optional[int] = None
    document_id: Optional[int] = None
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    product: Optional[ProductResponse] = None
    from_location: Optional[LocationResponse] = None
    to_location: Optional[LocationResponse] = None

    model_config = {"from_attributes": True}


# ── INVENTORY ────────────────────────────────────────────────────────────────

class InventoryItemCreate(BaseModel):
    location_id: int
    product_id: int
    actual_quantity: Decimal = Field(..., ge=0)


class InventoryCreate(BaseModel):
    type: str = Field(..., pattern=r"^(FULL|PARTIAL)$")
    items: list[InventoryItemCreate] = Field(..., min_length=1)


class InventoryItemResponse(BaseModel):
    id: int
    location_id: int
    product_id: int
    system_quantity: Decimal
    actual_quantity: Decimal
    difference: Decimal
    location_code: Optional[str] = None
    product_sku: Optional[str] = None
    product_name: Optional[str] = None

    model_config = {"from_attributes": True}


class InventoryResponse(BaseModel):
    id: int
    number: str
    type: str
    status: str
    counted_by_id: int
    approved_by_id: Optional[int] = None
    created_at: datetime
    approved_at: Optional[datetime] = None
    items: list[InventoryItemResponse] = []

    model_config = {"from_attributes": True}


# ── LEDGER / AUDIT ──────────────────────────────────────────────────────────

class StockLedgerResponse(BaseModel):
    id: int
    movement_type: str
    product_id: int
    from_location_id: Optional[int]
    to_location_id: Optional[int]
    quantity: Decimal
    document_number: Optional[str]
    user_id: int
    created_at: datetime

    model_config = {"from_attributes": True}


class AuditLogResponse(BaseModel):
    id: int
    action: str
    entity_type: str
    entity_id: Optional[int]
    details: Optional[str]
    user_id: Optional[int]
    created_at: datetime

    model_config = {"from_attributes": True}


class SyncVersionResponse(BaseModel):
    version: int
    last_event_at: Optional[datetime] = None


# ── PAGINATION ──────────────────────────────────────────────────────────────

class PaginatedResponse(BaseModel, Generic[T]):
    items: list[T]
    total: int
    page: int
    page_size: int
    pages: int