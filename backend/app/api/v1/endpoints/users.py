import secrets

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.database import get_db
from app.core.security import hash_password, generate_login_code
from app.middleware.auth import require_permission
from app.models.models import User, RoleEnum
from app.schemas.schemas import UserCreate, UserUpdate, UserResponse, UserCreateResponse, PaginatedResponse
from app.services.audit import log_action
from app.services.mailer import send_account_setup_email
from app.services.password_setup import issue_password_setup_token
from app.services.versioning import check_version

router = APIRouter(prefix="/users", tags=["Users"])
settings = get_settings()


@router.get("", response_model=PaginatedResponse[UserResponse])
def list_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    search: str = Query("", max_length=100),
    current_user: User = require_permission("users", "READ"),
    db: Session = Depends(get_db),
):
    count_query = db.query(User)
    data_query = db.query(User)

    if search:
        s = f"%{search.strip().lower()}%"
        search_filter = or_(
            func.lower(User.first_name).like(s),
            func.lower(User.last_name).like(s),
            func.lower(User.email).like(s),
            func.lower(User.login_code).like(s),
        )
        count_query = count_query.filter(search_filter)
        data_query = data_query.filter(search_filter)

    total = count_query.count()
    users = data_query.order_by(User.last_name, User.first_name).offset((page - 1) * page_size).limit(page_size).all()

    return PaginatedResponse[UserResponse](
        items=[UserResponse.model_validate(u) for u in users],
        total=total,
        page=page,
        page_size=page_size,
        pages=(total + page_size - 1) // page_size,
    )


@router.post("", response_model=UserCreateResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    data: UserCreate,
    current_user: User = require_permission("users", "FULL"),
    db: Session = Depends(get_db),
):
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email już istnieje.",
        )

    existing_codes = {code for (code,) in db.query(User.login_code).all()}
    login_code = generate_login_code(existing_codes)

    # Konto tworzymy bez znanego hasla docelowego; uzytkownik ustawi je z linku.
    provisional_password = hash_password(secrets.token_urlsafe(24))
    user = User(
        login_code=login_code,
        email=data.email,
        password_hash=provisional_password,
        first_name=data.first_name,
        last_name=data.last_name,
        role=RoleEnum(data.role),
        must_set_password=True,
    )
    db.add(user)
    db.flush()
    raw_token = issue_password_setup_token(db, user)
    setup_url = f"{settings.FRONTEND_BASE_URL.rstrip('/')}/set-password?token={raw_token}"
    send_account_setup_email(to_email=user.email, login_code=user.login_code, setup_url=setup_url)
    log_action(
        db, "CREATE", "User", user.id,
        details={"email": data.email, "role": data.role, "login_code": login_code, "setup_mail_sent": True},
        user_id=current_user.id,
    )
    db.commit()
    db.refresh(user)
    return UserCreateResponse(user=UserResponse.model_validate(user), setup_password_url=setup_url)


@router.get("/{user_id}", response_model=UserResponse)
def get_user(
    user_id: int,
    current_user: User = require_permission("users", "READ"),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Użytkownik nie znaleziony.",
        )
    return UserResponse.model_validate(user)


@router.patch("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    data: UserUpdate,
    current_user: User = require_permission("users", "FULL"),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Użytkownik nie znaleziony.",
        )

    # Zabezpieczenie: admin nie może sam siebie dezaktywować ani zmienić sobie roli
    if user.id == current_user.id:
        payload = data.model_dump(exclude_unset=True)
        if "is_active" in payload and payload["is_active"] is False:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Nie możesz dezaktywować własnego konta.",
            )
        if "role" in payload and payload["role"] != current_user.role.value:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Nie możesz zmienić własnej roli.",
            )

    payload = data.model_dump(exclude_unset=True)
    payload.pop("version", None)  # version nie jest polem modelu do ustawienia

    check_version(user, data.version)

    changes = {}
    for field, value in payload.items():
        if field == "role" and value is not None:
            setattr(user, field, RoleEnum(value))
        else:
            setattr(user, field, value)
        changes[field] = value

    user.version += 1
    log_action(db, "UPDATE", "User", user.id, details=changes, user_id=current_user.id)
    db.commit()
    db.refresh(user)
    return UserResponse.model_validate(user)