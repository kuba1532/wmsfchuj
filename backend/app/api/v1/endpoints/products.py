from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.middleware.auth import require_permission
from app.models.models import User, Product
from app.schemas.schemas import ProductCreate, ProductUpdate, ProductResponse, PaginatedResponse
from app.services.audit import log_action
from app.services.versioning import check_version

router = APIRouter(prefix="/products", tags=["Products"])


@router.get("", response_model=PaginatedResponse[ProductResponse])
def list_products(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    search: str = Query("", max_length=100),
    current_user: User = require_permission("dictionaries", "READ"),
    db: Session = Depends(get_db),
):
    count_query = db.query(Product).filter(Product.is_active.is_(True))
    data_query = db.query(Product).filter(Product.is_active.is_(True))

    if search:
        s = f"%{search.strip().lower()}%"
        search_filter = or_(
            func.lower(Product.sku).like(s),
            func.lower(Product.name).like(s),
            func.lower(Product.ean).like(s),
        )
        count_query = count_query.filter(search_filter)
        data_query = data_query.filter(search_filter)

    total = count_query.count()
    products = data_query.order_by(Product.name).offset((page - 1) * page_size).limit(page_size).all()

    return PaginatedResponse[ProductResponse](
        items=[ProductResponse.model_validate(p) for p in products],
        total=total,
        page=page,
        page_size=page_size,
        pages=(total + page_size - 1) // page_size,
    )


@router.post("", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
def create_product(
    data: ProductCreate,
    current_user: User = require_permission("dictionaries", "FULL"),
    db: Session = Depends(get_db),
):
    if db.query(Product).filter(Product.sku == data.sku).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"SKU '{data.sku}' już istnieje.",
        )

    if data.ean and db.query(Product).filter(Product.ean == data.ean).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"EAN '{data.ean}' już istnieje.",
        )

    product = Product(**data.model_dump())
    db.add(product)
    db.flush()
    log_action(
        db, "CREATE", "Product", product.id,
        details={"sku": data.sku, "ean": data.ean, "name": data.name},
        user_id=current_user.id,
    )
    db.commit()
    db.refresh(product)
    return ProductResponse.model_validate(product)


@router.get("/{product_id}", response_model=ProductResponse)
def get_product(
    product_id: int,
    current_user: User = require_permission("dictionaries", "READ"),
    db: Session = Depends(get_db),
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Produkt nie znaleziony.",
        )
    return ProductResponse.model_validate(product)


@router.patch("/{product_id}", response_model=ProductResponse)
def update_product(
    product_id: int,
    data: ProductUpdate,
    current_user: User = require_permission("dictionaries", "FULL"),
    db: Session = Depends(get_db),
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Produkt nie znaleziony.",
        )

    check_version(product, data.version)

    payload = data.model_dump(exclude_unset=True)
    payload.pop("version", None)

    if "ean" in payload and payload["ean"]:
        dup = db.query(Product).filter(
            Product.ean == payload["ean"],
            Product.id != product_id,
        ).first()
        if dup:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"EAN '{payload['ean']}' już istnieje.",
            )

    changes = {}
    for field, value in payload.items():
        setattr(product, field, value)
        changes[field] = value

    product.version += 1
    log_action(db, "UPDATE", "Product", product.id, details=changes, user_id=current_user.id)
    db.commit()
    db.refresh(product)
    return ProductResponse.model_validate(product)