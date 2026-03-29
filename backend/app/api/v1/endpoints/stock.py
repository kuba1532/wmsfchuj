from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.db.database import get_db
from app.middleware.auth import require_permission
from app.models.models import User, Stock, StockLedger, StockStatusEnum
from app.schemas.schemas import (
    StockResponse,
    StockStatusChange,
    StockLedgerResponse,
    PaginatedResponse,
    ProductResponse,
    LocationResponse,
)
from app.services.audit import log_action

router = APIRouter(tags=["Stock"])


# ─────────────────────────────
# HELPERS
# ─────────────────────────────

def _serialize_stock(s: Stock) -> dict:
    product = ProductResponse.model_validate(s.product).model_dump() if s.product else None
    location = LocationResponse.model_validate(s.location).model_dump() if s.location else None
    return {
        "id": s.id,
        "product_id": s.product_id,
        "location_id": s.location_id,
        "quantity": Decimal(str(s.quantity)),
        "status": s.status.value if hasattr(s.status, "value") else str(s.status),
        "product": product,
        "location": location,
    }


# ─────────────────────────────
# ENDPOINTS
# ─────────────────────────────

@router.get("/stock", response_model=PaginatedResponse[dict])
def list_stock(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    search: str = Query("", max_length=100),
    status_filter: str = Query("", max_length=20),
    current_user: User = require_permission("movements", "READ"),
    db: Session = Depends(get_db),
):
    from app.models.models import Product

    # Bazowe filtry (wspolne dla count i data)
    base_filters = [Stock.quantity > 0]

    if status_filter:
        try:
            base_filters.append(Stock.status == StockStatusEnum(status_filter))
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Nieprawidlowy status magazynowy.",
            )

    if search:
        s = f"%{search.strip().lower()}%"
        base_filters.append(
            Stock.product_id.in_(
                db.query(Product.id).filter(func.lower(Product.name).like(s))
            )
        )

    # Count z tymi samymi filtrami co dane
    total = db.query(func.count(Stock.id)).filter(*base_filters).scalar()

    # Dane z joinedload
    data_query = (
        db.query(Stock)
        .options(joinedload(Stock.product), joinedload(Stock.location))
        .filter(*base_filters)
    )

    rows = data_query.offset((page - 1) * page_size).limit(page_size).all()

    return PaginatedResponse[dict](
        items=[_serialize_stock(s) for s in rows],
        total=total,
        page=page,
        page_size=page_size,
        pages=(total + page_size - 1) // page_size,
    )


@router.patch("/stock/{stock_id}/status")
def change_stock_status(
    stock_id: int,
    data: StockStatusChange,
    current_user: User = require_permission("stockStatus", "FULL"),
    db: Session = Depends(get_db),
):
    stock = (
        db.query(Stock)
        .options(joinedload(Stock.product), joinedload(Stock.location))
        .filter(Stock.id == stock_id)
        .first()
    )
    if not stock:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pozycja magazynowa nie znaleziona.",
        )

    old_status = stock.status.value if hasattr(stock.status, "value") else str(stock.status)
    stock.status = StockStatusEnum(data.status)

    log_action(
        db,
        "STATUS_CHANGE",
        "Stock",
        stock.id,
        details={"old_status": old_status, "new_status": data.status},
        user_id=current_user.id,
    )
    db.commit()
    db.refresh(stock)
    return _serialize_stock(stock)


@router.get("/ledger", response_model=PaginatedResponse[StockLedgerResponse])
def list_ledger(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    search: str = Query("", max_length=100),
    current_user: User = require_permission("movements", "READ"),
    db: Session = Depends(get_db),
):
    # Oddzielne query dla count
    count_query = db.query(func.count(StockLedger.id))

    if search:
        count_query = count_query.filter(
            StockLedger.document_number.ilike(f"%{search}%")
        )

    total = count_query.scalar()

    # Osobne query dla danych
    data_query = db.query(StockLedger).order_by(StockLedger.created_at.desc())

    if search:
        data_query = data_query.filter(
            StockLedger.document_number.ilike(f"%{search}%")
        )

    rows = data_query.offset((page - 1) * page_size).limit(page_size).all()

    return PaginatedResponse[StockLedgerResponse](
        items=[StockLedgerResponse.model_validate(r) for r in rows],
        total=total,
        page=page,
        page_size=page_size,
        pages=(total + page_size - 1) // page_size,
    )