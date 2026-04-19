from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.middleware.auth import require_permission
from app.models.models import User, Supplier
from app.schemas.schemas import SupplierResponse, PaginatedResponse

router = APIRouter(prefix="/suppliers", tags=["Suppliers"])


@router.get("", response_model=PaginatedResponse[SupplierResponse])
def list_suppliers(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    search: str = Query("", max_length=100),
    current_user: User = require_permission("dictionaries", "READ"),
    db: Session = Depends(get_db),
):
    q = db.query(Supplier).filter(Supplier.is_active.is_(True))
    if search.strip():
        s = f"%{search.strip().lower()}%"
        q = q.filter(
            or_(
                func.lower(Supplier.code).like(s),
                func.lower(Supplier.name).like(s),
            ),
        )
    total = q.count()
    rows = q.order_by(Supplier.name).offset((page - 1) * page_size).limit(page_size).all()
    return PaginatedResponse[SupplierResponse](
        items=[SupplierResponse.model_validate(x) for x in rows],
        total=total,
        page=page,
        page_size=page_size,
        pages=(total + page_size - 1) // page_size,
    )
