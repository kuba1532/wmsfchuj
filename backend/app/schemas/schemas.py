from datetime import datetime
from decimal import Decimal
from typing import Generic, Optional, TypeVar

from pydantic import BaseModel, EmailStr, Field, field_validator

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


# ── USER ─────────────────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    email: EmailStr
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    role: str = Field(..., pattern=r"^(ADMIN|MANAGER|FOREMAN|WORKER)$")
    password: str = Field(..., min_length=8)


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
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


class LocationUpdate(BaseModel):
    code: Optional[str] = Field(None, max_length=50)
    type: Optional[str] = Field(None, pattern=r"^(BUFFER|STORAGE|PICKING_ZONE)$")
    row: Optional[str] = Field(None, max_length=10)
    rack: Optional[str] = Field(None, max_length=10)
    shelf: Optional[str] = Field(None, max_length=10)
    is_active: Optional[bool] = None
    version: int = Field(..., description="Wersja rekordu (optimistic locking)")


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

    model_config = {"from_attributes": True}


class StockStatusChange(BaseModel):
    status: str = Field(..., pattern=r"^(AVAILABLE|BLOCKED)$")
    version: int = Field(..., description="Wersja rekordu (optimistic locking)")


# ── DOCUMENT ─────────────────────────────────────────────────────────────────

class DocumentItemCreate(BaseModel):
    product_id: int
    quantity: Decimal = Field(..., gt=0)


class DocumentCreatePZ(BaseModel):
    supplier: str = Field(..., min_length=1, max_length=255)
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
    recipient: str = Field(..., min_length=1, max_length=255)
    items: list[DocumentItemCreate] = Field(..., min_length=1)


class DocumentResponse(BaseModel):
    id: int
    number: str
    type: str
    status: str
    supplier: Optional[str]
    from_location_id: Optional[int]
    to_location_id: Optional[int]
    recipient: Optional[str]
    created_by_id: int
    created_at: datetime

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
    product_id: Optional[int]
    from_location_id: Optional[int]
    to_location_id: Optional[int]
    quantity: Decimal
    assigned_to_id: Optional[int]
    document_id: Optional[int]
    created_at: datetime
    started_at: Optional[datetime]
    completed_at: Optional[datetime]

    model_config = {"from_attributes": True}


# ── INVENTORY ────────────────────────────────────────────────────────────────

class InventoryItemCreate(BaseModel):
    location_id: int
    product_id: int
    actual_quantity: Decimal = Field(..., ge=0)


class InventoryCreate(BaseModel):
    type: str = Field(..., pattern=r"^(FULL|PARTIAL)$")
    items: list[InventoryItemCreate] = Field(..., min_length=1)


class InventoryResponse(BaseModel):
    id: int
    number: str
    type: str
    status: str
    counted_by_id: int
    approved_by_id: Optional[int]
    created_at: datetime
    approved_at: Optional[datetime]

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


# ── PAGINATION ──────────────────────────────────────────────────────────────

class PaginatedResponse(BaseModel, Generic[T]):
    items: list[T]
    total: int
    page: int
    page_size: int
    pages: int