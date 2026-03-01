from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field, field_validator


# -- AUTH --

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


# -- USER --

class UserCreate(BaseModel):
    email: EmailStr
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    role: str = Field(..., pattern=r"^(ADMINISTRATOR|KIEROWNIK|BRYGADZISTA|MAGAZYNIER)$")
    password: str = Field(..., min_length=8)


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    first_name: Optional[str] = Field(None, max_length=100)
    last_name: Optional[str] = Field(None, max_length=100)
    role: Optional[str] = Field(None, pattern=r"^(ADMINISTRATOR|KIEROWNIK|BRYGADZISTA|MAGAZYNIER)$")
    is_active: Optional[bool] = None


# -- PRODUCT --

class ProductCreate(BaseModel):
    sku: str = Field(..., min_length=1, max_length=50, pattern=r"^[A-Za-z0-9\-]+$")
    name: str = Field(..., min_length=1, max_length=255)
    unit: str = Field("szt", max_length=20)
    description: Optional[str] = None


class ProductUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=255)
    unit: Optional[str] = Field(None, max_length=20)
    description: Optional[str] = None
    is_active: Optional[bool] = None


class ProductResponse(BaseModel):
    id: int
    sku: str
    name: str
    unit: str
    description: Optional[str]
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


# -- LOCATION --

class LocationCreate(BaseModel):
    code: str = Field(..., min_length=1, max_length=50)
    type: str = Field(..., pattern=r"^(BUFFER|STORAGE|PICKING_ZONE)$")
    is_buffer: bool = False
    row: Optional[str] = Field(None, max_length=10)
    rack: Optional[str] = Field(None, max_length=10)
    shelf: Optional[str] = Field(None, max_length=10)


class LocationUpdate(BaseModel):
    code: Optional[str] = Field(None, max_length=50)
    type: Optional[str] = Field(None, pattern=r"^(BUFFER|STORAGE|PICKING_ZONE)$")
    is_buffer: Optional[bool] = None
    row: Optional[str] = Field(None, max_length=10)
    rack: Optional[str] = Field(None, max_length=10)
    shelf: Optional[str] = Field(None, max_length=10)
    is_active: Optional[bool] = None


class LocationResponse(BaseModel):
    id: int
    code: str
    type: str
    is_buffer: bool
    row: Optional[str]
    rack: Optional[str]
    shelf: Optional[str]
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


# -- STOCK (Fix: added product/location nested) --

class StockResponse(BaseModel):
    id: int
    product_id: int
    location_id: int
    quantity: float
    status: str
    product: Optional[ProductResponse] = None
    location: Optional[LocationResponse] = None

    model_config = {"from_attributes": True}


class StockStatusChange(BaseModel):
    status: str = Field(..., pattern=r"^(AVAILABLE|BLOCKED)$")


# -- DOCUMENT (Fix: added items + DocumentItemResponse) --

class DocumentItemCreate(BaseModel):
    product_id: int
    quantity: float = Field(..., gt=0)


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


class DocumentItemResponse(BaseModel):
    id: int
    product_id: int
    quantity: float
    product: Optional[ProductResponse] = None

    model_config = {"from_attributes": True}


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
    items: list[DocumentItemResponse] = []
    created_at: datetime

    model_config = {"from_attributes": True}


# -- TASK --

class TaskCreate(BaseModel):
    type: str = Field(..., pattern=r"^(PUTAWAY|PICKING|MOVE|INVENTORY)$")
    product_id: Optional[int] = None
    from_location_id: Optional[int] = None
    to_location_id: Optional[int] = None
    quantity: float = Field(0, ge=0)
    assigned_to_id: int


class TaskResponse(BaseModel):
    id: int
    type: str
    status: str
    product_id: Optional[int]
    from_location_id: Optional[int]
    to_location_id: Optional[int]
    quantity: float
    assigned_to_id: Optional[int]
    document_id: Optional[int]
    created_at: datetime
    started_at: Optional[datetime]
    completed_at: Optional[datetime]

    model_config = {"from_attributes": True}


# -- INVENTORY (Fix: added items) --

class InventoryItemCreate(BaseModel):
    location_id: int
    product_id: int
    actual_quantity: float = Field(..., ge=0)


class InventoryCreate(BaseModel):
    type: str = Field(..., pattern=r"^(FULL|PARTIAL)$")
    items: list[InventoryItemCreate] = Field(..., min_length=1)


class InventoryItemResponse(BaseModel):
    id: int
    location_id: int
    product_id: int
    system_quantity: float
    actual_quantity: float
    difference: float

    model_config = {"from_attributes": True}


class InventoryResponse(BaseModel):
    id: int
    number: str
    type: str
    status: str
    counted_by_id: int
    approved_by_id: Optional[int]
    items: list[InventoryItemResponse] = []
    created_at: datetime
    approved_at: Optional[datetime]

    model_config = {"from_attributes": True}


# -- LEDGER / AUDIT --

class StockLedgerResponse(BaseModel):
    id: int
    movement_type: str
    product_id: int
    from_location_id: Optional[int]
    to_location_id: Optional[int]
    quantity: float
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


# -- PAGINATION --

class PaginatedResponse(BaseModel):
    items: list
    total: int
    page: int
    page_size: int
    pages: int