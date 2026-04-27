import secrets
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.core.security import hash_setup_token
from app.models.models import PasswordSetupToken, User


TOKEN_TTL_HOURS = 24


def issue_password_setup_token(db: Session, user: User) -> str:
    raw_token = secrets.token_urlsafe(48)
    token_hash = hash_setup_token(raw_token)
    expires_at = datetime.now(timezone.utc) + timedelta(hours=TOKEN_TTL_HOURS)

    db.query(PasswordSetupToken).filter(
        PasswordSetupToken.user_id == user.id,
        PasswordSetupToken.used_at.is_(None),
    ).delete(synchronize_session=False)

    db.add(
        PasswordSetupToken(
            user_id=user.id,
            token_hash=token_hash,
            expires_at=expires_at,
        )
    )
    db.flush()
    return raw_token

