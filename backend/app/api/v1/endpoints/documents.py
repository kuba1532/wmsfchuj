from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.db.database import get_db
from app.middleware.auth import require_permission
from app.models.models import (
    User,
    Document,
    DocumentItem,
    Stock,
    StockLedger,
    Task,
    Product,
    Location,
    Supplier,
    SupplierProduct,
    DocumentTypeEnum,
    DocumentStatusEnum,
    StockStatusEnum,
    MovementTypeEnum,
    TaskTypeEnum,
    TaskStatusEnum,
    LocationTypeEnum,
)
from app.schemas.schemas import (
    DocumentCreatePZ, DocumentCreateMM, DocumentCreateRW,
    DocumentResponse, DocumentItemResponse, ProductResponse, PaginatedResponse,
)
from app.services.audit import log_action
from app.services.numbering import generate_document_number

router = APIRouter(prefix="/documents", tags=["Documents"])


def _serialize_document(doc: Document) -> DocumentResponse:
    """Zwraca pełny DocumentResponse z pozycjami, kodami lokalizacji i produktami."""
    items_out: list[DocumentItemResponse] = []
    for it in (doc.items or []):
        product = ProductResponse.model_validate(it.product) if it.product else None
        items_out.append(
            DocumentItemResponse(
                id=it.id,
                product_id=it.product_id,
                quantity=it.quantity,
                product=product,
            )
        )
    return DocumentResponse(
        id=doc.id,
        number=doc.number,
        type=doc.type.value if hasattr(doc.type, "value") else str(doc.type),
        status=doc.status.value if hasattr(doc.status, "value") else str(doc.status),
        supplier_id=doc.supplier_id,
        supplier=doc.supplier,
        from_location_id=doc.from_location_id,
        to_location_id=doc.to_location_id,
        from_location_code=(doc.from_location.code if doc.from_location else None),
        to_location_code=(doc.to_location.code if doc.to_location else None),
        recipient=doc.recipient,
        created_by_id=doc.created_by_id,
        created_at=doc.created_at,
        items=items_out,
    )


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


def _pz_putaway_tasks(doc: Document, db: Session, user_id: int) -> int:
    n = 0
    for item in doc.items:
        db.add(
            Task(
                type=TaskTypeEnum.PUTAWAY,
                status=TaskStatusEnum.ASSIGNED,
                product_id=item.product_id,
                from_location_id=doc.from_location_id,
                to_location_id=doc.to_location_id,
                quantity=item.quantity,
                assigned_to_id=user_id,
                document_id=doc.id,
                created_by_id=user_id,
            )
        )
        n += 1
    return n


def _create_tasks_for_document(doc: Document, db: Session, user_id: int) -> int:
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
                status=TaskStatusEnum.ASSIGNED,
                product_id=item.product_id,
                from_location_id=doc.from_location_id,
                to_location_id=doc.to_location_id,
                quantity=item.quantity,
                assigned_to_id=user_id,
                document_id=doc.id,
                created_by_id=user_id,
            )
        )
        tasks_created += 1
    return tasks_created


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
        .options(
            joinedload(Document.items).joinedload(DocumentItem.product),
            joinedload(Document.from_location),
            joinedload(Document.to_location),
        )
        .order_by(Document.created_at.desc())
    )

    if doc_type:
        data_query = data_query.filter(Document.type == DocumentTypeEnum(doc_type))

    if search:
        s = f"%{search.strip().lower()}%"
        data_query = data_query.filter(func.lower(Document.number).like(s))

    docs = data_query.offset((page - 1) * page_size).limit(page_size).all()

    return PaginatedResponse[DocumentResponse](
        items=[_serialize_document(d) for d in docs],
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
        .options(joinedload(Document.items).joinedload(DocumentItem.product), joinedload(Document.from_location), joinedload(Document.to_location))
        .filter(Document.id == document_id)
        .first()
    )
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dokument nie znaleziony.",
        )
    return _serialize_document(doc)


@router.post("/pz", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
def create_pz(
    data: DocumentCreatePZ,
    current_user: User = require_permission("documents", "OPERATIONAL"),
    db: Session = Depends(get_db),
):
    sup = (
        db.query(Supplier)
        .filter(Supplier.id == data.supplier_id, Supplier.is_active.is_(True))
        .first()
    )
    if not sup:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Dostawca nie istnieje lub jest nieaktywny.",
        )

    allowed_rows = (
        db.query(SupplierProduct.product_id)
        .filter(SupplierProduct.supplier_id == data.supplier_id)
        .all()
    )
    allowed_ids = {r[0] for r in allowed_rows}
    if not allowed_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Dostawca nie ma przypisanych produktow — uzupelnij katalog powiazan.",
        )

    for item in data.items:
        if item.product_id not in allowed_ids:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Produkt ID {item.product_id} nie jest przypisany do wybranego dostawcy.",
            )
        if not db.query(Product).filter(Product.id == item.product_id, Product.is_active.is_(True)).first():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Produkt ID {item.product_id} nie istnieje lub jest nieaktywny.",
            )

    number = generate_document_number(db, DocumentTypeEnum.PZ)
    doc = Document(
        number=number,
        type=DocumentTypeEnum.PZ,
        status=DocumentStatusEnum.DRAFT,
        supplier_id=data.supplier_id,
        supplier=sup.name,
        created_by_id=current_user.id,
    )
    db.add(doc)
    db.flush()

    for item in data.items:
        db.add(DocumentItem(document_id=doc.id, product_id=item.product_id, quantity=item.quantity))

    log_action(
        db, "CREATE", "Document", doc.id,
        details={"type": "PZ", "number": number, "supplier_id": data.supplier_id, "supplier": sup.name},
        user_id=current_user.id,
    )
    db.commit()
    db.refresh(doc)
    return _serialize_document(doc)


@router.post("/{document_id}/pz/start", response_model=DocumentResponse)
def pz_start_receipt(
    document_id: int,
    current_user: User = require_permission("documents", "OPERATIONAL"),
    db: Session = Depends(get_db),
):
    doc = (
        db.query(Document)
        .options(joinedload(Document.items).joinedload(DocumentItem.product), joinedload(Document.from_location), joinedload(Document.to_location))
        .filter(Document.id == document_id, Document.type == DocumentTypeEnum.PZ)
        .first()
    )
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Przyjecie PZ nie znalezione.")
    if doc.status != DocumentStatusEnum.DRAFT:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tylko przyjecie w statusie Nowy (DRAFT) mozna rozpoczac.",
        )

    doc.status = DocumentStatusEnum.IN_PROGRESS
    log_action(
        db, "PZ_START", "Document", doc.id,
        details={"number": doc.number},
        user_id=current_user.id,
    )
    db.commit()
    db.refresh(doc)
    return _serialize_document(doc)


@router.post("/{document_id}/pz/complete", response_model=DocumentResponse)
def pz_complete_receipt(
    document_id: int,
    current_user: User = require_permission("documents", "OPERATIONAL"),
    db: Session = Depends(get_db),
):
    doc = (
        db.query(Document)
        .options(joinedload(Document.items).joinedload(DocumentItem.product), joinedload(Document.from_location), joinedload(Document.to_location))
        .filter(Document.id == document_id, Document.type == DocumentTypeEnum.PZ)
        .first()
    )
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Przyjecie PZ nie znalezione.")
    if doc.status != DocumentStatusEnum.IN_PROGRESS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Zakonczyc mozna tylko przyjecie w trakcie (IN_PROGRESS).",
        )

    _confirm_pz(doc, db, current_user.id)
    tasks_n = _pz_putaway_tasks(doc, db, current_user.id)
    doc.status = DocumentStatusEnum.COMPLETED

    log_action(
        db, "PZ_COMPLETE", "Document", doc.id,
        details={"number": doc.number, "putaway_tasks": tasks_n},
        user_id=current_user.id,
    )
    db.commit()
    db.refresh(doc)
    return _serialize_document(doc)


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
    return _serialize_document(doc)


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
    return _serialize_document(doc)


@router.post("/{document_id}/confirm", response_model=DocumentResponse)
def confirm_document(
    document_id: int,
    current_user: User = require_permission("documents", "FULL"),
    db: Session = Depends(get_db),
):
    doc = (
        db.query(Document)
        .options(joinedload(Document.items).joinedload(DocumentItem.product), joinedload(Document.from_location), joinedload(Document.to_location))
        .filter(Document.id == document_id)
        .first()
    )
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dokument nie znaleziony.")
    if doc.type == DocumentTypeEnum.PZ:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Przyjec PZ nie zatwierdza sie tym endpointem — uzyj: POST .../pz/start, potem POST .../pz/complete.",
        )
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

    # Dla MM i RW zadania dla magazyniera tworzą się od razu po zatwierdzeniu —
    # nie trzeba oddzielnego kliknięcia "Generuj zadania".
    tasks_created = 0
    if doc.type in (DocumentTypeEnum.MM, DocumentTypeEnum.RW):
        tasks_created = _create_tasks_for_document(doc, db, current_user.id)
        doc.status = DocumentStatusEnum.IN_PROGRESS

    log_action(
        db, "CONFIRM", "Document", doc.id,
        details={
            "type": doc.type.value,
            "number": doc.number,
            "tasks_created": tasks_created,
        },
        user_id=current_user.id,
    )
    db.commit()
    db.refresh(doc)
    return _serialize_document(doc)


@router.post("/{document_id}/generate-tasks")
def generate_tasks(
    document_id: int,
    current_user: User = require_permission("documents", "OPERATIONAL"),
    db: Session = Depends(get_db),
):
    doc = (
        db.query(Document)
        .options(joinedload(Document.items).joinedload(DocumentItem.product), joinedload(Document.from_location), joinedload(Document.to_location))
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

    tasks_created = _create_tasks_for_document(doc, db, current_user.id)

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


@router.post("/{document_id}/submit-to-tasks", response_model=DocumentResponse)
def submit_document_to_tasks(
    document_id: int,
    current_user: User = require_permission("documents", "OPERATIONAL"),
    db: Session = Depends(get_db),
):
    """
    Mobilny, intuicyjny flow dla MM/RW:
    DRAFT -> CONFIRMED -> IN_PROGRESS (+ zadania) jednym kliknieciem.
    """
    doc = (
        db.query(Document)
        .options(joinedload(Document.items).joinedload(DocumentItem.product), joinedload(Document.from_location), joinedload(Document.to_location))
        .filter(Document.id == document_id)
        .first()
    )
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dokument nie znaleziony.")
    if doc.type == DocumentTypeEnum.PZ:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Dla PZ uzyj dedykowanego procesu: /pz/start i /pz/complete.",
        )
    if doc.status != DocumentStatusEnum.DRAFT:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Do zadan mozna przekazac tylko dokument w statusie DRAFT.",
        )

    handler = _CONFIRM_HANDLERS.get(doc.type)
    if not handler:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Nieobslugiwany typ dokumentu: {doc.type}.",
        )
    handler(doc, db, current_user.id)
    tasks_created = _create_tasks_for_document(doc, db, current_user.id)
    doc.status = DocumentStatusEnum.IN_PROGRESS

    log_action(
        db, "SUBMIT_TO_TASKS", "Document", doc.id,
        details={"type": doc.type.value, "number": doc.number, "tasks_created": tasks_created},
        user_id=current_user.id,
    )
    db.commit()
    db.refresh(doc)
    return _serialize_document(doc)