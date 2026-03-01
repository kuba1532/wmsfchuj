from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.core.security import hash_password, generate_login_code
from app.middleware.auth import require_permission
from app.models.models import User, RoleEnum
from app.schemas.schemas import UserCreate, UserUpdate, UserResponse, PaginatedResponse
from app.services.audit import log_action

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("", response_model=PaginatedResponse)
def list_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    search: str = Query("", max_length=100),
    current_user: User = require_permission("users", "READ"),
    db: Session = Depends(get_db),
):
    query = db.query(User)

    if search:
        s = f"%{search.strip().lower()}%"
        query = query.filter(
            or_(
                func.lower(User.first_name).like(s),
                func.lower(User.last_name).like(s),
                func.lower(User.email).like(s),
                func.lower(User.login_code).like(s),
            )
        )

    total = query.count()
    users = query.offset((page - 1) * page_size).limit(page_size).all()

    return PaginatedResponse(
        items=[UserResponse.model_validate(u) for u in users],
        total=total,
        page=page,
        page_size=page_size,
        pages=(total + page_size - 1) // page_size,
    )


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    data: UserCreate,
    current_user: User = require_permission("users", "FULL"),
    db: Session = Depends(get_db),
):
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email już istnieje.")

    # FIX: query(User.login_code).all() zwraca tuple/Row, więc bierzemy (code,)
    existing_codes = {code for (code,) in db.query(User.login_code).all()}
    login_code = generate_login_code(existing_codes)

    user = User(
        login_code=login_code,
        email=data.email,
        password_hash=hash_password(data.password),
        first_name=data.first_name,
        last_name=data.last_name,
        role=RoleEnum(data.role),
    )

    db.add(user)
    log_action(
        db,
        "CREATE",
        "User",
        details={"email": data.email, "role": data.role, "login_code": login_code},
        user_id=current_user.id,
    )
    db.commit()
    db.refresh(user)
    return UserResponse.model_validate(user)


@router.get("/{user_id}", response_model=UserResponse)
def get_user(
    user_id: int,
    current_user: User = require_permission("users", "READ"),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Użytkownik nie znaleziony.")
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
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Użytkownik nie znaleziony.")

    payload = data.model_dump(exclude_unset=True)

    # Najpierw walidacja konfliktu email/code, potem ustawianie
    if "email" in payload and payload["email"]:
        dup = db.query(User).filter(User.email == payload["email"], User.id != user_id).first()
        if dup:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email już istnieje.")

    changes = {}
    for field, value in payload.items():
        if field == "role" and value is not None:
            setattr(user, field, RoleEnum(value))
        else:
            setattr(user, field, value)
        changes[field] = value

    log_action(db, "UPDATE", "User", user.id, details=changes, user_id=current_user.id)
    db.commit()
    db.refresh(user)
    return UserResponse.model_validate(user)