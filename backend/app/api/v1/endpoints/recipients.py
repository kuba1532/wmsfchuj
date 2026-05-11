from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.middleware.auth import require_permission
from app.models.models import Recipient, User
from app.schemas.schemas import PaginatedResponse, RecipientResponse

router = APIRouter(prefix="/recipients", tags=["Recipients"])


@router.get("", response_model=PaginatedResponse[RecipientResponse])
def list_recipients(
    page: int = Query(1, ge=1),
    page_size: int = Query(100, ge=1, le=200),
    search: str = Query("", max_length=100),
    current_user: User = require_permission("dictionaries", "READ"),
    db: Session = Depends(get_db),
):
    q = db.query(Recipient).filter(Recipient.is_active.is_(True))
    if search.strip():
        s = f"%{search.strip().lower()}%"
        q = q.filter(
            (func.lower(Recipient.code).like(s)) | (func.lower(Recipient.name).like(s)),
        )
    total = q.count()
    rows = (
        q.order_by(Recipient.code.asc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return PaginatedResponse[RecipientResponse](
        items=[RecipientResponse.model_validate(r) for r in rows],
        total=total,
        page=page,
        page_size=page_size,
        pages=(total + page_size - 1) // page_size if total else 1,
    )
