from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import (
    verify_password,
    hash_setup_token,
    hash_password,
    create_access_token,
    create_refresh_token,
    decode_token,
    validate_password_policy,
    is_password_expired,
    ensure_aware,
)
from app.db.database import get_db
from app.middleware.auth import get_current_user
from app.models.models import User, RoleEnum, PasswordSetupToken
from app.schemas.schemas import (
    LoginRequest,
    TokenResponse,
    RefreshRequest,
    ChangePasswordRequest,
    ChangeExpiredPasswordRequest,
    SetPasswordRequest,
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
    if user.locked_until and ensure_aware(user.locked_until) > datetime.now(timezone.utc):
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
    if user.must_set_password:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Ustaw haslo przez link aktywacyjny wyslany na e-mail.",
        )

    user.failed_login_attempts = 0
    user.locked_until = None

    # N-04: wymuszenie zmiany hasła co PASSWORD_MAX_AGE_DAYS (domyślnie 180 dni).
    # Hasło jest poprawne, ale wygasłe — nie wydajemy tokenu; użytkownik musi je
    # zmienić przez /auth/change-expired-password (login + stare + nowe hasło).
    if is_password_expired(user.password_set_at, settings.PASSWORD_MAX_AGE_DAYS):
        log_action(db, "PASSWORD_EXPIRED", "User", user.id, user_id=user.id)
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "PASSWORD_EXPIRED: Twoje haslo wygaslo "
                f"(starsze niz {settings.PASSWORD_MAX_AGE_DAYS} dni). "
                "Ustaw nowe haslo, aby kontynuowac."
            ),
        )

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

    if user.locked_until and ensure_aware(user.locked_until) > datetime.now(timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sesja wygasla — konto zostalo zablokowane. Zaloguj sie ponownie po odblokowaniu.",
        )

    token_data = {"sub": str(user.id), "role": user.role.value, "login": user.login_code}

    return TokenResponse(
        access_token=create_access_token(token_data),
        refresh_token=create_refresh_token(token_data),
        user=UserResponse.model_validate(user),
    )


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    resp = UserResponse.model_validate(current_user)
    resp.password_expired = is_password_expired(
        current_user.password_set_at, settings.PASSWORD_MAX_AGE_DAYS
    )
    return resp


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

    if verify_password(data.new_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nowe haslo musi byc inne niz obecne.",
        )

    current_user.password_hash = hash_password(data.new_password)
    current_user.must_set_password = False
    current_user.password_set_at = datetime.now(timezone.utc)
    log_action(db, "PASSWORD_CHANGED", "User", current_user.id, user_id=current_user.id)
    db.commit()

    return {"message": "Haslo zostalo zmienione."}


@router.post("/change-expired-password")
def change_expired_password(
    data: ChangeExpiredPasswordRequest,
    db: Session = Depends(get_db),
):
    """N-04: rotacja wygasłego hasła. Nie wymaga JWT (logowanie jest zablokowane),
    ale wymaga podania obecnego hasła — więc tylko właściciel konta może je zmienić."""
    GENERIC_ERROR = "Nieprawidlowy login lub haslo."

    user = db.query(User).filter(User.login_code == data.login).first()
    if user is None or not verify_password(data.current_password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=GENERIC_ERROR)

    if not user.is_active or user.must_set_password:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=GENERIC_ERROR)

    valid, msg = validate_password_policy(data.new_password)
    if not valid:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=msg)

    if verify_password(data.new_password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nowe haslo musi byc inne niz obecne.",
        )

    user.password_hash = hash_password(data.new_password)
    user.password_set_at = datetime.now(timezone.utc)
    user.failed_login_attempts = 0
    user.locked_until = None
    log_action(db, "PASSWORD_ROTATED_EXPIRED", "User", user.id, user_id=user.id)
    db.commit()

    return {"message": "Haslo zostalo zmienione. Mozesz sie zalogowac."}


@router.post("/set-password")
def set_password(
    data: SetPasswordRequest,
    db: Session = Depends(get_db),
):
    now = datetime.now(timezone.utc)
    token_row = (
        db.query(PasswordSetupToken)
        .filter(
            PasswordSetupToken.token_hash == hash_setup_token(data.token),
            PasswordSetupToken.used_at.is_(None),
            PasswordSetupToken.expires_at > now,
        )
        .first()
    )
    if token_row is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Link do ustawienia hasla jest nieprawidlowy lub wygasl.")

    user = db.query(User).filter(User.id == token_row.user_id).first()
    if user is None or not user.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Konto jest nieaktywne lub nie istnieje.")

    valid, msg = validate_password_policy(data.new_password)
    if not valid:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=msg)

    user.password_hash = hash_password(data.new_password)
    user.must_set_password = False
    user.password_set_at = now
    user.failed_login_attempts = 0
    user.locked_until = None
    token_row.used_at = now

    log_action(db, "PASSWORD_SET_FROM_EMAIL", "User", user.id, user_id=user.id)
    db.commit()
    return {"message": "Haslo zostalo ustawione. Mozesz sie zalogowac."}


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