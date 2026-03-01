import enum

from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    Enum,
    Boolean,
    DateTime,
    ForeignKey,
    Float,
    UniqueConstraint,
    Index,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.database import Base


class RoleEnum(str, enum.Enum):
    ADMINISTRATOR = "ADMINISTRATOR"
    KIEROWNIK = "KIEROWNIK"
    BRYGADZISTA = "BRYGADZISTA"
    MAGAZYNIER = "MAGAZYNIER"


class DocumentStatusEnum(str, enum.Enum):
    DRAFT = "DRAFT"
    CONFIRMED = "CONFIRMED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class TaskStatusEnum(str, enum.Enum):
    NEW = "NEW"
    ASSIGNED = "ASSIGNED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class TaskTypeEnum(str, enum.Enum):
    PUTAWAY = "PUTAWAY"
    PICKING = "PICKING"
    MOVE = "MOVE"
    INVENTORY = "INVENTORY"


class StockStatusEnum(str, enum.Enum):
    AVAILABLE = "AVAILABLE"
    BLOCKED = "BLOCKED"


class LocationTypeEnum(str, enum.Enum):
    BUFFER = "BUFFER"
    STORAGE = "STORAGE"
    PICKING_ZONE = "PICKING_ZONE"


class MovementTypeEnum(str, enum.Enum):
    RECEIPT = "RECEIPT"
    PUTAWAY = "PUTAWAY"
    MOVE = "MOVE"
    PICK = "PICK"
    INVENTORY_CORRECTION = "INVENTORY_CORRECTION"


class DocumentTypeEnum(str, enum.Enum):
    PZ = "PZ"
    MM = "MM"
    RW = "RW"


class InventoryTypeEnum(str, enum.Enum):
    FULL = "FULL"
    PARTIAL = "PARTIAL"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    login_code = Column(String(5), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    role = Column(Enum(RoleEnum), nullable=False, default=RoleEnum.MAGAZYNIER)
    is_active = Column(Boolean, default=True, nullable=False)
    failed_login_attempts = Column(Integer, default=0, nullable=False)
    locked_until = Column(DateTime, nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)
    version = Column(Integer, default=1, nullable=False)

    assigned_tasks = relationship(
        "Task",
        back_populates="assigned_to_user",
        foreign_keys="Task.assigned_to_id",
    )
    created_documents = relationship("Document", back_populates="created_by_user")


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, autoincrement=True)
    sku = Column(String(50), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    unit = Column(String(20), nullable=False, default="szt")
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)
    version = Column(Integer, default=1, nullable=False)

    stock_items = relationship("Stock", back_populates="product")


class Location(Base):
    __tablename__ = "locations"

    id = Column(Integer, primary_key=True, autoincrement=True)
    code = Column(String(50), unique=True, nullable=False, index=True)
    type = Column(Enum(LocationTypeEnum), nullable=False, default=LocationTypeEnum.STORAGE)
    is_buffer = Column(Boolean, default=False, nullable=False)
    row = Column(String(10), nullable=True)
    rack = Column(String(10), nullable=True)
    shelf = Column(String(10), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)
    version = Column(Integer, default=1, nullable=False)

    stock_items = relationship("Stock", back_populates="location")


class Stock(Base):
    __tablename__ = "stock"

    id = Column(Integer, primary_key=True, autoincrement=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    location_id = Column(Integer, ForeignKey("locations.id"), nullable=False)
    quantity = Column(Float, nullable=False, default=0)
    status = Column(Enum(StockStatusEnum), nullable=False, default=StockStatusEnum.AVAILABLE)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)
    version = Column(Integer, default=1, nullable=False)

    product = relationship("Product", back_populates="stock_items")
    location = relationship("Location", back_populates="stock_items")

    __table_args__ = (
        UniqueConstraint("product_id", "location_id", name="uq_stock_product_location"),
        Index("ix_stock_product_location", "product_id", "location_id"),
    )


class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, autoincrement=True)
    number = Column(String(50), unique=True, nullable=False, index=True)
    type = Column(Enum(DocumentTypeEnum), nullable=False)
    status = Column(Enum(DocumentStatusEnum), nullable=False, default=DocumentStatusEnum.DRAFT)
    supplier = Column(String(255), nullable=True)
    from_location_id = Column(Integer, ForeignKey("locations.id"), nullable=True)
    to_location_id = Column(Integer, ForeignKey("locations.id"), nullable=True)
    recipient = Column(String(255), nullable=True)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)
    version = Column(Integer, default=1, nullable=False)

    items = relationship("DocumentItem", back_populates="document", cascade="all, delete-orphan")
    created_by_user = relationship("User", back_populates="created_documents")
    from_location = relationship("Location", foreign_keys=[from_location_id])
    to_location = relationship("Location", foreign_keys=[to_location_id])


class DocumentItem(Base):
    __tablename__ = "document_items"

    id = Column(Integer, primary_key=True, autoincrement=True)
    document_id = Column(Integer, ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    quantity = Column(Float, nullable=False)

    document = relationship("Document", back_populates="items")
    product = relationship("Product")


class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, autoincrement=True)
    type = Column(Enum(TaskTypeEnum), nullable=False)
    status = Column(Enum(TaskStatusEnum), nullable=False, default=TaskStatusEnum.NEW)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=True)
    from_location_id = Column(Integer, ForeignKey("locations.id"), nullable=True)
    to_location_id = Column(Integer, ForeignKey("locations.id"), nullable=True)
    quantity = Column(Float, nullable=False, default=0)
    assigned_to_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=True)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    version = Column(Integer, default=1, nullable=False)

    assigned_to_user = relationship("User", back_populates="assigned_tasks", foreign_keys=[assigned_to_id])
    created_by = relationship("User", foreign_keys=[created_by_id])
    product = relationship("Product")
    from_location = relationship("Location", foreign_keys=[from_location_id])
    to_location = relationship("Location", foreign_keys=[to_location_id])
    document = relationship("Document")


class Inventory(Base):
    __tablename__ = "inventories"

    id = Column(Integer, primary_key=True, autoincrement=True)
    number = Column(String(50), unique=True, nullable=False, index=True)
    type = Column(Enum(InventoryTypeEnum), nullable=False)
    status = Column(Enum(DocumentStatusEnum), nullable=False, default=DocumentStatusEnum.DRAFT)
    counted_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    approved_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    approved_at = Column(DateTime, nullable=True)
    version = Column(Integer, default=1, nullable=False)

    items = relationship("InventoryItem", back_populates="inventory", cascade="all, delete-orphan")
    counted_by = relationship("User", foreign_keys=[counted_by_id])
    approved_by = relationship("User", foreign_keys=[approved_by_id])


class InventoryItem(Base):
    __tablename__ = "inventory_items"

    id = Column(Integer, primary_key=True, autoincrement=True)
    inventory_id = Column(Integer, ForeignKey("inventories.id", ondelete="CASCADE"), nullable=False)
    location_id = Column(Integer, ForeignKey("locations.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    system_quantity = Column(Float, nullable=False)
    actual_quantity = Column(Float, nullable=False)
    difference = Column(Float, nullable=False)

    inventory = relationship("Inventory", back_populates="items")
    location = relationship("Location")
    product = relationship("Product")


class StockLedger(Base):
    __tablename__ = "stock_ledger"

    id = Column(Integer, primary_key=True, autoincrement=True)
    movement_type = Column(Enum(MovementTypeEnum), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    from_location_id = Column(Integer, ForeignKey("locations.id"), nullable=True)
    to_location_id = Column(Integer, ForeignKey("locations.id"), nullable=True)
    quantity = Column(Float, nullable=False)
    document_number = Column(String(50), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    product = relationship("Product")
    from_location = relationship("Location", foreign_keys=[from_location_id])
    to_location = relationship("Location", foreign_keys=[to_location_id])
    user = relationship("User")

    __table_args__ = (
        Index("ix_ledger_created", "created_at"),
        Index("ix_ledger_product", "product_id"),
        Index("ix_ledger_document", "document_number"),
    )


class AuditLog(Base):
    __tablename__ = "audit_log"

    id = Column(Integer, primary_key=True, autoincrement=True)
    action = Column(String(50), nullable=False)
    entity_type = Column(String(50), nullable=False)
    entity_id = Column(Integer, nullable=True)
    details = Column(Text, nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    user = relationship("User")

    __table_args__ = (
        Index("ix_audit_created", "created_at"),
        Index("ix_audit_entity", "entity_type", "entity_id"),
        Index("ix_audit_user", "user_id"),
    )