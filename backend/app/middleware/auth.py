from datetime import datetime, timezone

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.core.security import decode_token, ensure_aware
from app.db.database import get_db
from app.models.models import User, RoleEnum


security_scheme = HTTPBearer()


# ─────────────────────────────
# CURRENT USER
# ─────────────────────────────

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security_scheme),
    db: Session = Depends(get_db),
) -> User:

    token = credentials.credentials
    payload = decode_token(token)

    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token nieprawidlowy lub wygasl.",
        )

    if payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Nieprawidlowy typ tokena.",
        )

    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token nie zawiera identyfikatora uzytkownika.",
        )

    user = db.query(User).filter(User.id == int(user_id)).first()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Uzytkownik nie istnieje.",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Konto uzytkownika jest zablokowane.",
        )

    if user.locked_until and ensure_aware(user.locked_until) > datetime.now(timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sesja wygasla — konto zostalo tymczasowo zablokowane. Zaloguj sie ponownie po odblokowaniu.",
        )

    return user


# ─────────────────────────────
# PERMISSION MATRIX
# ─────────────────────────────

PERMISSION_MATRIX: dict[str, dict[RoleEnum, str]] = {
    "users": {
        RoleEnum.ADMIN: "FULL",
        RoleEnum.MANAGER: "READ",
        RoleEnum.FOREMAN: "NONE",
        RoleEnum.WORKER: "NONE",
    },
    "systemConfig": {
        RoleEnum.ADMIN: "FULL",
        RoleEnum.MANAGER: "NONE",
        RoleEnum.FOREMAN: "NONE",
        RoleEnum.WORKER: "NONE",
    },
    "dictionaries": {
        RoleEnum.ADMIN: "FULL",
        RoleEnum.MANAGER: "FULL",
        RoleEnum.FOREMAN: "FULL",
        RoleEnum.WORKER: "READ",
    },
    "documents": {
        RoleEnum.ADMIN: "FULL",
        RoleEnum.MANAGER: "FULL",
        RoleEnum.FOREMAN: "FULL",
        RoleEnum.WORKER: "OPERATIONAL",
    },
    "tasks": {
        RoleEnum.ADMIN: "FULL",
        RoleEnum.MANAGER: "FULL",
        RoleEnum.FOREMAN: "FULL",
        RoleEnum.WORKER: "EXECUTE",
    },
    "taskManagement": {
        RoleEnum.ADMIN: "FULL",
        RoleEnum.MANAGER: "FULL",
        RoleEnum.FOREMAN: "FULL",
        RoleEnum.WORKER: "NONE",
    },
    "movements": {
        RoleEnum.ADMIN: "FULL",
        RoleEnum.MANAGER: "FULL",
        RoleEnum.FOREMAN: "FULL",
        RoleEnum.WORKER: "EXECUTE",
    },
    "stockStatus": {
        RoleEnum.ADMIN: "FULL",
        RoleEnum.MANAGER: "FULL",
        RoleEnum.FOREMAN: "FULL",
        RoleEnum.WORKER: "NONE",
    },
    "inventory": {
        RoleEnum.ADMIN: "FULL",
        RoleEnum.MANAGER: "FULL",
        RoleEnum.FOREMAN: "OPERATIONAL",
        RoleEnum.WORKER: "NONE",
    },
    "reports": {
        RoleEnum.ADMIN: "FULL",
        RoleEnum.MANAGER: "FULL",
        RoleEnum.FOREMAN: "FULL",
        RoleEnum.WORKER: "OWN",
    },
}

LEVEL_HIERARCHY = {
    "NONE": 0,
    "OWN": 1,
    "READ": 2,
    "EXECUTE": 3,
    "OPERATIONAL": 3,
    "CREATE": 4,
    "FULL": 5,
}


def get_permission_level(area: str, role: RoleEnum) -> str:
    return PERMISSION_MATRIX.get(area, {}).get(role, "NONE")


def require_permission(area: str, min_level: str = "READ"):
    def dependency(current_user: User = Depends(get_current_user)):
        user_level = get_permission_level(area, current_user.role)

        if LEVEL_HIERARCHY.get(user_level, 0) < LEVEL_HIERARCHY.get(min_level, 0):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Brak uprawnien. Wymagany poziom: {min_level} dla obszaru: {area}.",
            )

        return current_user

    return Depends(dependency)


def require_roles(*roles: RoleEnum):
    def dependency(current_user: User = Depends(get_current_user)):
        if current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Brak uprawnien dla tej roli.",
            )
        return current_user

    return Depends(dependency)