from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.middleware.auth import require_permission
from app.models.models import User, Product
from app.schemas.schemas import ProductCreate, ProductUpdate, ProductResponse, PaginatedResponse
from app.services.audit import log_action

router = APIRouter(prefix="/products", tags=["Products"])


@router.get("", response_model=PaginatedResponse)
def list_products(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    search: str = Query("", max_length=100),
    current_user: User = require_permission("dictionaries", "READ"),
    db: Session = Depends(get_db),
):
    query = db.query(Product).filter(Product.is_active.is_(True))

    if search:
        s = f"%{search.strip().lower()}%"
        query = query.filter(
            or_(
                func.lower(Product.sku).like(s),
                func.lower(Product.name).like(s),
            )
        )

    total = query.count()
    products = query.offset((page - 1) * page_size).limit(page_size).all()

    return PaginatedResponse(
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
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"SKU '{data.sku}' już istnieje.")

    product = Product(**data.model_dump())
    db.add(product)
    log_action(db, "CREATE", "Product", details={"sku": data.sku, "name": data.name}, user_id=current_user.id)
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
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Produkt nie znaleziony.")
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
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Produkt nie znaleziony.")

    changes = {}
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(product, field, value)
        changes[field] = value

    log_action(db, "UPDATE", "Product", product.id, details=changes, user_id=current_user.id)
    db.commit()
    db.refresh(product)
    return ProductResponse.model_validate(product)