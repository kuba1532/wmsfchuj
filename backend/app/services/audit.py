import json
from typing import Optional

from sqlalchemy.orm import Session

from app.models.models import AuditLog


def log_action(
    db: Session,
    action: str,
    entity_type: str,
    entity_id: Optional[int] = None,
    details: Optional[dict] = None,
    user_id: Optional[int] = None,
):
    entry = AuditLog(
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        details=json.dumps(details, ensure_ascii=False, default=str) if details else None,
        user_id=user_id,
    )
    db.add(entry)