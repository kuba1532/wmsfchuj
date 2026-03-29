from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.middleware.auth import require_permission
from app.models.models import User, AuditLog, RoleEnum
from app.schemas.schemas import AuditLogResponse, PaginatedResponse

router = APIRouter(tags=["Audit & Reports"])


@router.get("/audit-log", response_model=PaginatedResponse[AuditLogResponse])
def list_audit_log(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    entity_type: str = Query("", max_length=50),
    action: str = Query("", max_length=50),
    current_user: User = require_permission("reports", "READ"),
    db: Session = Depends(get_db),
):
    """SF5, N11, N12: Audit log with filtering."""
    query = db.query(AuditLog).order_by(AuditLog.created_at.desc())

    if current_user.role == RoleEnum.WORKER:
        query = query.filter(AuditLog.user_id == current_user.id)

    if entity_type:
        query = query.filter(AuditLog.entity_type == entity_type)

    if action:
        query = query.filter(AuditLog.action == action)

    total = query.count()
    items = query.offset((page - 1) * page_size).limit(page_size).all()

    return PaginatedResponse(
        items=[AuditLogResponse.model_validate(entry) for entry in items],
        total=total,
        page=page,
        page_size=page_size,
        pages=(total + page_size - 1) // page_size,
    )