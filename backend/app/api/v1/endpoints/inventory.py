from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.db.database import get_db
from app.middleware.auth import require_permission, require_roles
from app.models.models import (
    User, Inventory, InventoryItem, Stock, StockLedger,
    InventoryTypeEnum, DocumentStatusEnum, MovementTypeEnum, RoleEnum,
)
from app.schemas.schemas import (
    InventoryCreate, InventoryResponse, InventoryItemResponse, PaginatedResponse,
)
from app.services.audit import log_action
from app.services.numbering import generate_inventory_number

router = APIRouter(prefix="/inventory", tags=["Inventory"])


def _serialize_inventory(inv: Inventory) -> InventoryResponse:
    items_out: list[InventoryItemResponse] = []
    for it in (inv.items or []):
        items_out.append(
            InventoryItemResponse(
                id=it.id,
                location_id=it.location_id,
                product_id=it.product_id,
                system_quantity=it.system_quantity,
                actual_quantity=it.actual_quantity,
                difference=it.difference,
                location_code=(it.location.code if getattr(it, "location", None) else None),
                product_sku=(it.product.sku if getattr(it, "product", None) else None),
                product_name=(it.product.name if getattr(it, "product", None) else None),
            )
        )
    return InventoryResponse(
        id=inv.id,
        number=inv.number,
        type=inv.type.value if hasattr(inv.type, "value") else str(inv.type),
        status=inv.status.value if hasattr(inv.status, "value") else str(inv.status),
        counted_by_id=inv.counted_by_id,
        approved_by_id=inv.approved_by_id,
        created_at=inv.created_at,
        approved_at=inv.approved_at,
        items=items_out,
    )


def _inventory_eager_opts():
    return (
        joinedload(Inventory.items).joinedload(InventoryItem.product),
        joinedload(Inventory.items).joinedload(InventoryItem.location),
    )


@router.get("", response_model=PaginatedResponse[InventoryResponse])
def list_inventories(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    current_user: User = require_permission("inventory", "OPERATIONAL"),
    db: Session = Depends(get_db),
):
    # Oddzielne query dla count — unika błędów z joinedload
    total = db.query(func.count(Inventory.id)).scalar()

    items = (
        db.query(Inventory)
        .options(*_inventory_eager_opts())
        .order_by(Inventory.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    return PaginatedResponse[InventoryResponse](
        items=[_serialize_inventory(inv) for inv in items],
        total=total,
        page=page,
        page_size=page_size,
        pages=(total + page_size - 1) // page_size,
    )


@router.post("", response_model=InventoryResponse, status_code=status.HTTP_201_CREATED)
def create_inventory(
    data: InventoryCreate,
    current_user: User = require_permission("inventory", "OPERATIONAL"),
    db: Session = Depends(get_db),
):
    number = generate_inventory_number(db)

    inventory = Inventory(
        number=number,
        type=InventoryTypeEnum(data.type),
        counted_by_id=current_user.id,
    )
    db.add(inventory)
    db.flush()

    for item_data in data.items:
        stock = (
            db.query(Stock)
            .filter(
                Stock.product_id == item_data.product_id,
                Stock.location_id == item_data.location_id,
            )
            .first()
        )

        system_qty = stock.quantity if stock else 0
        difference = item_data.actual_quantity - system_qty

        db.add(
            InventoryItem(
                inventory_id=inventory.id,
                location_id=item_data.location_id,
                product_id=item_data.product_id,
                system_quantity=system_qty,
                actual_quantity=item_data.actual_quantity,
                difference=difference,
            )
        )

    log_action(
        db, "CREATE", "Inventory", inventory.id,
        details={"number": number, "type": data.type, "items_count": len(data.items)},
        user_id=current_user.id,
    )
    db.commit()
    db.refresh(inventory)
    return _serialize_inventory(inventory)


@router.get("/{inventory_id}", response_model=InventoryResponse)
def get_inventory(
    inventory_id: int,
    current_user: User = require_permission("inventory", "OPERATIONAL"),
    db: Session = Depends(get_db),
):
    inventory = (
        db.query(Inventory)
        .options(*_inventory_eager_opts())
        .filter(Inventory.id == inventory_id)
        .first()
    )
    if not inventory:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inwentaryzacja nie znaleziona.",
        )
    return _serialize_inventory(inventory)


@router.post("/{inventory_id}/approve", response_model=InventoryResponse)
def approve_inventory(
    inventory_id: int,
    current_user: User = require_roles(RoleEnum.ADMIN, RoleEnum.MANAGER),
    db: Session = Depends(get_db),
):
    inventory = (
        db.query(Inventory)
        .options(*_inventory_eager_opts())
        .filter(Inventory.id == inventory_id)
        .first()
    )
    if not inventory:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inwentaryzacja nie znaleziona.",
        )
    if inventory.status != DocumentStatusEnum.DRAFT:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tylko inwentaryzacje w statusie Szkic mozna zatwierdzic.",
        )

    for item in inventory.items:
        if item.difference == 0:
            continue

        stock = (
            db.query(Stock)
            .filter(
                Stock.product_id == item.product_id,
                Stock.location_id == item.location_id,
            )
            .first()
        )

        if stock:
            stock.quantity = item.actual_quantity
        else:
            db.add(Stock(
                product_id=item.product_id,
                location_id=item.location_id,
                quantity=item.actual_quantity,
            ))

        db.add(StockLedger(
            movement_type=MovementTypeEnum.INVENTORY_CORRECTION,
            product_id=item.product_id,
            from_location_id=item.location_id,
            quantity=item.difference,
            document_number=inventory.number,
            user_id=current_user.id,
        ))

    inventory.status = DocumentStatusEnum.CONFIRMED
    inventory.approved_by_id = current_user.id
    inventory.approved_at = datetime.now(timezone.utc)

    log_action(
        db, "APPROVE", "Inventory", inventory.id,
        details={"number": inventory.number, "approved_by": current_user.id},
        user_id=current_user.id,
    )
    db.commit()
    db.refresh(inventory)
    return _serialize_inventory(inventory)