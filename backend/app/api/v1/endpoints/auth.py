from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import (
    verify_password,
    hash_password,
    create_access_token,
    create_refresh_token,
    decode_token,
    validate_password_policy,
)
from app.db.database import get_db
from app.middleware.auth import get_current_user
from app.models.models import User, RoleEnum
from app.schemas.schemas import (
    LoginRequest,
    TokenResponse,
    RefreshRequest,
    ChangePasswordRequest,
    UserResponse,
)
from app.services.audit import log_action

router = APIRouter(prefix="/auth", tags=["Authentication"])
settings = get_settings()


@router.post("/login", response_model=TokenResponse)
def login(data: LoginRequest, db: Session = Depends(get_db)):
    # Generyczny komunikat — nie ujawniamy czy konto istnieje
    GENERIC_ERROR = "Nieprawidlowy login lub haslo."

    user = db.query(User).filter(User.login_code == data.login).first()

    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=GENERIC_ERROR)

    # Zablokowane konto — nie ujawniamy, zwracamy ten sam 401
    if user.locked_until and user.locked_until > datetime.now(timezone.utc):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=GENERIC_ERROR)

    if not verify_password(data.password, user.password_hash):
        user.failed_login_attempts += 1

        if user.failed_login_attempts >= settings.MAX_LOGIN_ATTEMPTS:
            user.locked_until = datetime.now(timezone.utc) + timedelta(minutes=settings.LOCKOUT_DURATION_MINUTES)
            log_action(db, "ACCOUNT_LOCKED", "User", user.id, {"reason": "Exceeded login attempts"})

        db.commit()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=GENERIC_ERROR)

    # Nieaktywne konto — ten sam 401
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=GENERIC_ERROR)

    user.failed_login_attempts = 0
    user.locked_until = None

    token_data = {"sub": str(user.id), "role": user.role.value, "login": user.login_code}
    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)

    log_action(db, "LOGIN", "User", user.id, user_id=user.id)
    db.commit()

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserResponse.model_validate(user),
    )


@router.post("/refresh", response_model=TokenResponse)
def refresh_token(data: RefreshRequest, db: Session = Depends(get_db)):
    payload = decode_token(data.refresh_token)

    if payload is None or payload.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Nieprawidlowy refresh token.")

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Nieprawidlowy refresh token.")

    user = db.query(User).filter(User.id == int(user_id)).first()
    if user is None or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Uzytkownik nie istnieje lub jest nieaktywny.")

    token_data = {"sub": str(user.id), "role": user.role.value, "login": user.login_code}

    return TokenResponse(
        access_token=create_access_token(token_data),
        refresh_token=create_refresh_token(token_data),
        user=UserResponse.model_validate(user),
    )


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return UserResponse.model_validate(current_user)


@router.post("/change-password")
def change_password(
    data: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not verify_password(data.current_password, current_user.password_hash):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Obecne haslo jest nieprawidlowe.")

    valid, msg = validate_password_policy(data.new_password)
    if not valid:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=msg)

    current_user.password_hash = hash_password(data.new_password)
    log_action(db, "PASSWORD_CHANGED", "User", current_user.id, user_id=current_user.id)
    db.commit()

    return {"message": "Haslo zostalo zmienione."}


@router.post("/unlock/{user_id}")
def unlock_account(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != RoleEnum.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Tylko administrator moze odblokowac konta.")

    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Uzytkownik nie znaleziony.")

    user.failed_login_attempts = 0
    user.locked_until = None

    log_action(db, "ACCOUNT_UNLOCKED", "User", user.id, user_id=current_user.id)
    db.commit()

    return {"message": f"Konto {user.login_code} zostalo odblokowane."}