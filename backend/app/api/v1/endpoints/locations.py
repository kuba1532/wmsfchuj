from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.middleware.auth import require_permission
from app.models.models import User, Location, LocationTypeEnum
from app.schemas.schemas import LocationCreate, LocationUpdate, LocationResponse, PaginatedResponse
from app.services.audit import log_action
from app.services.versioning import check_version

router = APIRouter(prefix="/locations", tags=["Locations"])


@router.get("", response_model=PaginatedResponse[LocationResponse])
def list_locations(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    search: str = Query("", max_length=100),
    current_user: User = require_permission("dictionaries", "READ"),
    db: Session = Depends(get_db),
):
    count_query = db.query(Location).filter(Location.is_active.is_(True))
    data_query = db.query(Location).filter(Location.is_active.is_(True))

    if search:
        s = f"%{search.strip().lower()}%"
        count_query = count_query.filter(func.lower(Location.code).like(s))
        data_query = data_query.filter(func.lower(Location.code).like(s))

    total = count_query.count()
    locations = data_query.order_by(Location.code).offset((page - 1) * page_size).limit(page_size).all()

    return PaginatedResponse[LocationResponse](
        items=[LocationResponse.model_validate(loc) for loc in locations],
        total=total,
        page=page,
        page_size=page_size,
        pages=(total + page_size - 1) // page_size,
    )


@router.post("", response_model=LocationResponse, status_code=status.HTTP_201_CREATED)
def create_location(
    data: LocationCreate,
    current_user: User = require_permission("dictionaries", "FULL"),
    db: Session = Depends(get_db),
):
    if db.query(Location).filter(Location.code == data.code).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Lokalizacja '{data.code}' już istnieje.",
        )

    location = Location(
        code=data.code,
        type=LocationTypeEnum(data.type),
        row=data.row,
        rack=data.rack,
        shelf=data.shelf,
    )
    db.add(location)
    db.flush()
    log_action(
        db, "CREATE", "Location", location.id,
        details={"code": data.code, "type": data.type},
        user_id=current_user.id,
    )
    db.commit()
    db.refresh(location)
    return LocationResponse.model_validate(location)


@router.get("/{location_id}", response_model=LocationResponse)
def get_location(
    location_id: int,
    current_user: User = require_permission("dictionaries", "READ"),
    db: Session = Depends(get_db),
):
    location = db.query(Location).filter(Location.id == location_id).first()
    if not location:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lokalizacja nie znaleziona.",
        )
    return LocationResponse.model_validate(location)


@router.patch("/{location_id}", response_model=LocationResponse)
def update_location(
    location_id: int,
    data: LocationUpdate,
    current_user: User = require_permission("dictionaries", "FULL"),
    db: Session = Depends(get_db),
):
    location = db.query(Location).filter(Location.id == location_id).first()
    if not location:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lokalizacja nie znaleziona.",
        )

    payload = data.model_dump(exclude_unset=True)
    payload.pop("version", None)

    check_version(location, data.version)

    if "code" in payload and payload["code"]:
        dup = db.query(Location).filter(
            Location.code == payload["code"],
            Location.id != location_id,
        ).first()
        if dup:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Lokalizacja '{payload['code']}' już istnieje.",
            )

    changes = {}
    for field, value in payload.items():
        if field == "type" and value is not None:
            setattr(location, field, LocationTypeEnum(value))
        else:
            setattr(location, field, value)
        changes[field] = value

    location.version += 1
    log_action(db, "UPDATE", "Location", location.id, details=changes, user_id=current_user.id)
    db.commit()
    db.refresh(location)
    return LocationResponse.model_validate(location)