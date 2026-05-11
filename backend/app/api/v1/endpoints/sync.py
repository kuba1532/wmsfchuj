from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.middleware.auth import get_current_user
from app.models.models import AuditLog, User
from app.schemas.schemas import SyncVersionResponse

router = APIRouter(prefix="/sync", tags=["Sync"])


@router.get("/version", response_model=SyncVersionResponse)
def get_sync_version(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """
    Lekki znacznik zmian systemu.
    Zwraca rosnący numer (max ID z audit_log), który zmienia się po każdej akcji zapisującej.
    """
    max_id = db.query(func.max(AuditLog.id)).scalar() or 0
    last_event_at = db.query(func.max(AuditLog.created_at)).scalar()
    return SyncVersionResponse(
        version=int(max_id),
        last_event_at=last_event_at if isinstance(last_event_at, datetime) else None,
    )
