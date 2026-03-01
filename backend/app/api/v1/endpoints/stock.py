from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload

from app.db.database import get_db
from app.middleware.auth import require_permission
from app.models.models import User, Stock, StockLedger, StockStatusEnum
from app.schemas.schemas import (
    StockResponse,
    StockStatusChange,
    StockLedgerResponse,
    PaginatedResponse,
)
from app.services.audit import log_action

router = APIRouter(tags=["Stock"])


@router.get("/stock", response_model=PaginatedResponse)
def list_stock(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    search: str = Query("", max_length=100),
    status_filter: str = Query("", max_length=20),
    current_user: User = require_permission("movements", "READ"),
    db: Session = Depends(get_db),
):
    """MF5: Display current stock levels with product/location details."""
    query = (
        db.query(Stock)
        .options(joinedload(Stock.product), joinedload(Stock.location))
        .filter(Stock.quantity > 0)
    )

    if status_filter:
        query = query.filter(Stock.status == StockStatusEnum(status_filter))

    total = query.count()
    items = query.offset((page - 1) * page_size).limit(page_size).all()

    return PaginatedResponse(
        items=[StockResponse.model_validate(s) for s in items],
        total=total,
        page=page,
        page_size=page_size,
        pages=(total + page_size - 1) // page_size,
    )


@router.patch("/stock/{stock_id}/status", response_model=StockResponse)
def change_stock_status(
    stock_id: int,
    data: StockStatusChange,
    current_user: User = require_permission("stockStatus", "FULL"),
    db: Session = Depends(get_db),
):
    """MF16: Change stock quality status (Available/Blocked)."""
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

    return StockResponse.model_validate(stock)


@router.get("/ledger", response_model=PaginatedResponse)
def list_ledger(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    search: str = Query("", max_length=100),
    current_user: User = require_permission("movements", "READ"),
    db: Session = Depends(get_db),
):
    """MF6: Immutable stock movement history."""
    query = db.query(StockLedger).order_by(StockLedger.created_at.desc())

    if search:
        query = query.filter(StockLedger.document_number.ilike(f"%{search}%"))

    total = query.count()
    items = query.offset((page - 1) * page_size).limit(page_size).all()

    return PaginatedResponse(
        items=[StockLedgerResponse.model_validate(entry) for entry in items],
        total=total,
        page=page,
        page_size=page_size,
        pages=(total + page_size - 1) // page_size,
    )