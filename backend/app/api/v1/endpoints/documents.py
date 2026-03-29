from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.db.database import get_db
from app.middleware.auth import require_permission
from app.models.models import (
    User, Document, DocumentItem, Stock, StockLedger, Task, Product, Location,
    DocumentTypeEnum, DocumentStatusEnum, StockStatusEnum,
    MovementTypeEnum, TaskTypeEnum, TaskStatusEnum, LocationTypeEnum,
)
from app.schemas.schemas import (
    DocumentCreatePZ, DocumentCreateMM, DocumentCreateRW,
    DocumentResponse, PaginatedResponse,
)
from app.services.audit import log_action
from app.services.numbering import generate_document_number

router = APIRouter(prefix="/documents", tags=["Documents"])


# ─────────────────────────────
# HELPERS
# ─────────────────────────────

def _get_or_create_stock(db: Session, product_id: int, location_id: int) -> Stock:
    """Pobiera lub tworzy rekord stanu z blokada FOR UPDATE."""
    stock = (
        db.query(Stock)
        .filter(Stock.product_id == product_id, Stock.location_id == location_id)
        .with_for_update()
        .first()
    )
    if not stock:
        stock = Stock(product_id=product_id, location_id=location_id, quantity=Decimal("0"))
        db.add(stock)
        db.flush()
    return stock


def _record_movement(
    db: Session,
    movement_type: MovementTypeEnum,
    product_id: int,
    quantity: Decimal,
    user_id: int,
    document_number: str,
    from_location_id: int | None = None,
    to_location_id: int | None = None,
) -> None:
    db.add(
        StockLedger(
            movement_type=movement_type,
            product_id=product_id,
            from_location_id=from_location_id,
            to_location_id=to_location_id,
            quantity=quantity,
            document_number=document_number,
            user_id=user_id,
        )
    )


def _confirm_pz(doc: Document, db: Session, user_id: int) -> None:
    buffer = (
        db.query(Location)
        .filter(
            Location.type == LocationTypeEnum.BUFFER,
            Location.is_active.is_(True),
        )
        .first()
    )
    if not buffer:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Brak zdefiniowanej strefy przyjec (BUFFER).",
        )

    for item in doc.items:
        stock = _get_or_create_stock(db, item.product_id, buffer.id)
        stock.quantity += item.quantity
        _record_movement(
            db,
            MovementTypeEnum.RECEIPT,
            item.product_id,
            item.quantity,
            user_id,
            doc.number,
            to_location_id=buffer.id,
        )


def _confirm_mm(doc: Document, db: Session, user_id: int) -> None:
    # Validate source location is active
    from_location = (
        db.query(Location)
        .filter(Location.id == doc.from_location_id, Location.is_active.is_(True))
        .first()
    )
    if not from_location:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Lokalizacja zrodlowa nie istnieje lub jest nieaktywna.",
        )

    to_location = (
        db.query(Location)
        .filter(Location.id == doc.to_location_id, Location.is_active.is_(True))
        .first()
    )
    if not to_location:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Lokalizacja docelowa nie istnieje lub jest nieaktywna.",
        )

    # Validate + move w jednej petli z FOR UPDATE (brak race condition)
    for item in doc.items:
        from_stock = (
            db.query(Stock)
            .filter(
                Stock.product_id == item.product_id,
                Stock.location_id == doc.from_location_id,
                Stock.status == StockStatusEnum.AVAILABLE,
            )
            .with_for_update()
            .first()
        )
        if not from_stock or from_stock.quantity < item.quantity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Niewystarczajacy stan dla produktu ID {item.product_id}.",
            )

        from_stock.quantity -= item.quantity
        to_stock = _get_or_create_stock(db, item.product_id, doc.to_location_id)
        to_stock.quantity += item.quantity
        _record_movement(
            db,
            MovementTypeEnum.MOVE,
            item.product_id,
            item.quantity,
            user_id,
            doc.number,
            from_location_id=doc.from_location_id,
            to_location_id=doc.to_location_id,
        )


def _confirm_rw(doc: Document, db: Session, user_id: int) -> None:
    picking_zone = (
        db.query(Location)
        .filter(
            Location.type == LocationTypeEnum.PICKING_ZONE,
            Location.is_active.is_(True),
        )
        .first()
    )
    if not picking_zone:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Brak zdefiniowanej strefy kompletacji (PICKING_ZONE).",
        )

    # Validate + deduct w jednej petli z FOR UPDATE
    for item in doc.items:
        stock = (
            db.query(Stock)
            .filter(
                Stock.product_id == item.product_id,
                Stock.location_id == picking_zone.id,
                Stock.status == StockStatusEnum.AVAILABLE,
            )
            .with_for_update()
            .first()
        )
        if not stock or stock.quantity < item.quantity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Niewystarczajacy stan do RW dla produktu ID {item.product_id} w strefie kompletacji.",
            )

        stock.quantity -= item.quantity
        _record_movement(
            db,
            MovementTypeEnum.PICK,
            item.product_id,
            item.quantity,
            user_id,
            doc.number,
            from_location_id=picking_zone.id,
            to_location_id=None,
        )


_CONFIRM_HANDLERS = {
    DocumentTypeEnum.PZ: _confirm_pz,
    DocumentTypeEnum.MM: _confirm_mm,
    DocumentTypeEnum.RW: _confirm_rw,
}

_TASK_TYPE_MAP = {
    DocumentTypeEnum.PZ: TaskTypeEnum.PUTAWAY,
    DocumentTypeEnum.MM: TaskTypeEnum.MOVE,
    DocumentTypeEnum.RW: TaskTypeEnum.PICKING,
}


# ─────────────────────────────
# ENDPOINTS
# ─────────────────────────────

@router.get("", response_model=PaginatedResponse[DocumentResponse])
def list_documents(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    doc_type: str = Query("", max_length=5),
    search: str = Query("", max_length=100),
    current_user: User = require_permission("documents", "READ"),
    db: Session = Depends(get_db),
):
    # Oddzielne query dla count — unika błędów z joinedload
    count_query = db.query(func.count(Document.id))

    if doc_type:
        try:
            doc_type_enum = DocumentTypeEnum(doc_type)
            count_query = count_query.filter(Document.type == doc_type_enum)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Nieprawidlowy typ dokumentu.",
            )

    if search:
        s = f"%{search.strip().lower()}%"
        count_query = count_query.filter(func.lower(Document.number).like(s))

    total = count_query.scalar()

    # Osobne query z joinedload dla danych
    data_query = (
        db.query(Document)
        .options(joinedload(Document.items).joinedload(DocumentItem.product))
        .order_by(Document.created_at.desc())
    )

    if doc_type:
        data_query = data_query.filter(Document.type == DocumentTypeEnum(doc_type))

    if search:
        s = f"%{search.strip().lower()}%"
        data_query = data_query.filter(func.lower(Document.number).like(s))

    docs = data_query.offset((page - 1) * page_size).limit(page_size).all()

    return PaginatedResponse[DocumentResponse](
        items=[DocumentResponse.model_validate(d) for d in docs],
        total=total,
        page=page,
        page_size=page_size,
        pages=(total + page_size - 1) // page_size,
    )


@router.get("/{document_id}", response_model=DocumentResponse)
def get_document(
    document_id: int,
    current_user: User = require_permission("documents", "READ"),
    db: Session = Depends(get_db),
):
    doc = (
        db.query(Document)
        .options(joinedload(Document.items).joinedload(DocumentItem.product))
        .filter(Document.id == document_id)
        .first()
    )
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dokument nie znaleziony.",
        )
    return DocumentResponse.model_validate(doc)


@router.post("/pz", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
def create_pz(
    data: DocumentCreatePZ,
    current_user: User = require_permission("documents", "OPERATIONAL"),
    db: Session = Depends(get_db),
):
    for item in data.items:
        if not db.query(Product).filter(Product.id == item.product_id, Product.is_active.is_(True)).first():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Produkt ID {item.product_id} nie istnieje lub jest nieaktywny.",
            )

    number = generate_document_number(db, DocumentTypeEnum.PZ)
    doc = Document(
        number=number,
        type=DocumentTypeEnum.PZ,
        supplier=data.supplier,
        created_by_id=current_user.id,
    )
    db.add(doc)
    db.flush()

    for item in data.items:
        db.add(DocumentItem(document_id=doc.id, product_id=item.product_id, quantity=item.quantity))

    log_action(
        db, "CREATE", "Document", doc.id,
        details={"type": "PZ", "number": number, "supplier": data.supplier},
        user_id=current_user.id,
    )
    db.commit()
    db.refresh(doc)
    return DocumentResponse.model_validate(doc)


@router.post("/mm", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
def create_mm(
    data: DocumentCreateMM,
    current_user: User = require_permission("documents", "OPERATIONAL"),
    db: Session = Depends(get_db),
):
    for loc_id in (data.from_location_id, data.to_location_id):
        if not db.query(Location).filter(Location.id == loc_id, Location.is_active.is_(True)).first():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Lokalizacja ID {loc_id} nie istnieje lub jest nieaktywna.",
            )

    number = generate_document_number(db, DocumentTypeEnum.MM)
    doc = Document(
        number=number,
        type=DocumentTypeEnum.MM,
        from_location_id=data.from_location_id,
        to_location_id=data.to_location_id,
        created_by_id=current_user.id,
    )
    db.add(doc)
    db.flush()

    for item in data.items:
        db.add(DocumentItem(document_id=doc.id, product_id=item.product_id, quantity=item.quantity))

    log_action(
        db, "CREATE", "Document", doc.id,
        details={"type": "MM", "number": number},
        user_id=current_user.id,
    )
    db.commit()
    db.refresh(doc)
    return DocumentResponse.model_validate(doc)


@router.post("/rw", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
def create_rw(
    data: DocumentCreateRW,
    current_user: User = require_permission("documents", "OPERATIONAL"),
    db: Session = Depends(get_db),
):
    for item in data.items:
        if not db.query(Product).filter(Product.id == item.product_id, Product.is_active.is_(True)).first():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Produkt ID {item.product_id} nie istnieje lub jest nieaktywny.",
            )

    number = generate_document_number(db, DocumentTypeEnum.RW)
    doc = Document(
        number=number,
        type=DocumentTypeEnum.RW,
        recipient=data.recipient,
        created_by_id=current_user.id,
    )
    db.add(doc)
    db.flush()

    for item in data.items:
        db.add(DocumentItem(document_id=doc.id, product_id=item.product_id, quantity=item.quantity))

    log_action(
        db, "CREATE", "Document", doc.id,
        details={"type": "RW", "number": number, "recipient": data.recipient},
        user_id=current_user.id,
    )
    db.commit()
    db.refresh(doc)
    return DocumentResponse.model_validate(doc)


@router.post("/{document_id}/confirm", response_model=DocumentResponse)
def confirm_document(
    document_id: int,
    current_user: User = require_permission("documents", "FULL"),
    db: Session = Depends(get_db),
):
    doc = (
        db.query(Document)
        .options(joinedload(Document.items))
        .filter(Document.id == document_id)
        .first()
    )
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dokument nie znaleziony.")
    if doc.status != DocumentStatusEnum.DRAFT:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tylko dokumenty w statusie Szkic mozna zatwierdzic.",
        )

    handler = _CONFIRM_HANDLERS.get(doc.type)
    if not handler:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Nieobslugiwany typ dokumentu: {doc.type}.",
        )

    handler(doc, db, current_user.id)

    doc.status = DocumentStatusEnum.CONFIRMED
    log_action(
        db, "CONFIRM", "Document", doc.id,
        details={"type": doc.type.value, "number": doc.number},
        user_id=current_user.id,
    )
    db.commit()
    db.refresh(doc)
    return DocumentResponse.model_validate(doc)


@router.post("/{document_id}/generate-tasks")
def generate_tasks(
    document_id: int,
    current_user: User = require_permission("taskManagement", "FULL"),
    db: Session = Depends(get_db),
):
    doc = (
        db.query(Document)
        .options(joinedload(Document.items))
        .filter(Document.id == document_id)
        .first()
    )
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dokument nie znaleziony.")
    if doc.status != DocumentStatusEnum.CONFIRMED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Zadania mozna generowac tylko dla zatwierdzonych dokumentow.",
        )

    task_type = _TASK_TYPE_MAP.get(doc.type)
    if not task_type:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Nieobslugiwany typ dokumentu: {doc.type}.",
        )

    tasks_created = 0
    for item in doc.items:
        db.add(
            Task(
                type=task_type,
                status=TaskStatusEnum.NEW,
                product_id=item.product_id,
                from_location_id=doc.from_location_id,
                to_location_id=doc.to_location_id,
                quantity=item.quantity,
                document_id=doc.id,
                created_by_id=current_user.id,
            )
        )
        tasks_created += 1

    doc.status = DocumentStatusEnum.IN_PROGRESS
    log_action(
        db, "GENERATE_TASKS", "Document", doc.id,
        details={"tasks_created": tasks_created, "number": doc.number},
        user_id=current_user.id,
    )
    db.commit()
    return {
        "message": f"Wygenerowano {tasks_created} zadan dla {doc.number}.",
        "tasks_created": tasks_created,
    }