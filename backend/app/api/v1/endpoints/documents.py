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
    Recipient,
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
    DocumentResponse, DocumentItemResponse, DocumentLinkedTaskBrief, ProductResponse, PaginatedResponse,
)
from app.services.audit import log_action
from app.services.numbering import generate_document_number

router = APIRouter(prefix="/documents", tags=["Documents"])


def _tasks_for_document_id(db: Session, document_id: int) -> list[Task]:
    return (
        db.query(Task)
        .filter(Task.document_id == document_id)
        .order_by(Task.id)
        .all()
    )


def _tasks_grouped_by_document_ids(db: Session, doc_ids: list[int]) -> dict[int, list[Task]]:
    if not doc_ids:
        return {}
    rows = (
        db.query(Task)
        .filter(Task.document_id.in_(doc_ids))
        .order_by(Task.document_id, Task.id)
        .all()
    )
    out: dict[int, list[Task]] = {}
    for t in rows:
        if t.document_id is None:
            continue
        out.setdefault(t.document_id, []).append(t)
    return out


def _serialize_document(doc: Document, related: list[Task] | None = None) -> DocumentResponse:
    """Zwraca pełny DocumentResponse z pozycjami, kodami lokalizacji i produktami."""
    related = related or []
    tasks_out = [
        DocumentLinkedTaskBrief(
            id=t.id,
            type=t.type.value if hasattr(t.type, "value") else str(t.type),
            status=t.status.value if hasattr(t.status, "value") else str(t.status),
        )
        for t in related
    ]
    items_out: list[DocumentItemResponse] = []
    for it in (doc.items or []):
        product = ProductResponse.model_validate(it.product) if it.product else None
        items_out.append(
            DocumentItemResponse(
                id=it.id,
                product_id=it.product_id,
                quantity=it.quantity,
                putaway_to_location_id=it.putaway_to_location_id,
                putaway_to_location_code=(
                    it.putaway_to_location.code if it.putaway_to_location else None
                ),
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
        related_tasks=tasks_out,
    )


# ─────────────────────────────
# HELPERS
# ─────────────────────────────

def _get_or_create_stock(
    db: Session,
    product_id: int,
    location_id: int,
    stock_status: StockStatusEnum = StockStatusEnum.AVAILABLE,
) -> Stock:
    """Pobiera lub tworzy rekord stanu (dla wskazanego statusu) z blokadą FOR UPDATE."""
    stock = (
        db.query(Stock)
        .filter(
            Stock.product_id == product_id,
            Stock.location_id == location_id,
            Stock.status == stock_status,
        )
        .with_for_update()
        .first()
    )
    if not stock:
        stock = Stock(
            product_id=product_id,
            location_id=location_id,
            quantity=Decimal("0"),
            status=stock_status,
        )
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


def _receipt_buffer_location(db: Session) -> Location:
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
    return buffer


def _ensure_not_buffer_source(db: Session, location_id: int, *, doc_type: str) -> Location:
    """MM/RW nie powinny pobierać towaru ze strefy przyjęć (BUFFER)."""
    loc = (
        db.query(Location)
        .filter(Location.id == location_id, Location.is_active.is_(True))
        .first()
    )
    if not loc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Lokalizacja zrodlowa nie istnieje lub jest nieaktywna.",
        )
    if loc.type == LocationTypeEnum.BUFFER:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"{doc_type}: nie wolno pobierac ze strefy przyjec (BUFFER). "
                "Najpierw wykonaj odlozenie PZ na lokalizacje skladowa/picking."
            ),
        )
    return loc


def _confirm_pz(doc: Document, db: Session, user_id: int, target_location: Location) -> None:
    for item in doc.items:
        stock = _get_or_create_stock(db, item.product_id, target_location.id)
        stock.quantity += item.quantity
        _record_movement(
            db,
            MovementTypeEnum.RECEIPT,
            item.product_id,
            item.quantity,
            user_id,
            doc.number,
            to_location_id=target_location.id,
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
    if not doc.from_location_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Dokument RW musi miec wskazana lokalizacje zrodlowa (skad pobieramy towar).",
        )
    src_loc = (
        db.query(Location)
        .filter(Location.id == doc.from_location_id, Location.is_active.is_(True))
        .first()
    )
    if not src_loc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Lokalizacja zrodlowa RW nie istnieje lub jest nieaktywna.",
        )

    # Validate + deduct w jednej petli z FOR UPDATE (z wybranej lokalizacji)
    for item in doc.items:
        stock = (
            db.query(Stock)
            .filter(
                Stock.product_id == item.product_id,
                Stock.location_id == src_loc.id,
                Stock.status == StockStatusEnum.AVAILABLE,
            )
            .with_for_update()
            .first()
        )
        if not stock or stock.quantity < item.quantity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Niewystarczajacy stan do RW dla produktu ID {item.product_id} "
                    f"w lokalizacji {src_loc.code}."
                ),
            )

        stock.quantity -= item.quantity
        _record_movement(
            db,
            MovementTypeEnum.PICK,
            item.product_id,
            item.quantity,
            user_id,
            doc.number,
            from_location_id=src_loc.id,
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


def _pz_putaway_tasks(doc: Document, db: Session, user_id: int, buffer: Location) -> int:
    n = 0
    for item in doc.items:
        if item.putaway_to_location_id is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Kazda pozycja PZ musi miec wskazana lokalizacje odlozenia.",
            )
        db.add(
            Task(
                type=TaskTypeEnum.PUTAWAY,
                # Gielda zadan: nowo-utworzone zadania trafiaja do puli (bez przypisania).
                status=TaskStatusEnum.NEW,
                product_id=item.product_id,
                from_location_id=buffer.id,
                to_location_id=item.putaway_to_location_id,
                quantity=item.quantity,
                assigned_to_id=None,
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
                # Gielda zadan: zadania MOVE/PICKING powstaja jako NEW i sa pobierane przez workerow.
                status=TaskStatusEnum.NEW,
                product_id=item.product_id,
                from_location_id=doc.from_location_id,
                to_location_id=doc.to_location_id,
                quantity=item.quantity,
                assigned_to_id=None,
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
            joinedload(Document.items).joinedload(DocumentItem.putaway_to_location),
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
    doc_ids = [d.id for d in docs]
    task_map = _tasks_grouped_by_document_ids(db, doc_ids)

    return PaginatedResponse[DocumentResponse](
        items=[_serialize_document(d, task_map.get(d.id, [])) for d in docs],
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
        .options(joinedload(Document.items).joinedload(DocumentItem.product),
            joinedload(Document.items).joinedload(DocumentItem.putaway_to_location), joinedload(Document.from_location), joinedload(Document.to_location))
        .filter(Document.id == document_id)
        .first()
    )
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dokument nie znaleziony.",
        )
    return _serialize_document(doc, _tasks_for_document_id(db, doc.id))


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

    target_location = (
        db.query(Location)
        .filter(Location.id == data.to_location_id, Location.is_active.is_(True))
        .first()
    )
    if not target_location:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Lokalizacja docelowa przyjecia nie istnieje lub jest nieaktywna.",
        )
    if target_location.type == LocationTypeEnum.BUFFER:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="PZ: wybierz lokalizacje magazynowa/picking jako miejsce przyjecia (nie BUFFER).",
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
        to_location_id=data.to_location_id,
        created_by_id=current_user.id,
    )
    db.add(doc)
    db.flush()

    for item in data.items:
        db.add(
            DocumentItem(
                document_id=doc.id,
                product_id=item.product_id,
                quantity=item.quantity,
            )
        )

    log_action(
        db, "CREATE", "Document", doc.id,
        details={
            "type": "PZ",
            "number": number,
            "supplier_id": data.supplier_id,
            "supplier": sup.name,
            "to_location_id": data.to_location_id,
        },
        user_id=current_user.id,
    )
    db.commit()
    db.refresh(doc)
    return _serialize_document(doc, _tasks_for_document_id(db, doc.id))


@router.post("/{document_id}/pz/start", response_model=DocumentResponse)
def pz_start_receipt(
    document_id: int,
    current_user: User = require_permission("documents", "OPERATIONAL"),
    db: Session = Depends(get_db),
):
    doc = (
        db.query(Document)
        .options(joinedload(Document.items).joinedload(DocumentItem.product),
            joinedload(Document.items).joinedload(DocumentItem.putaway_to_location), joinedload(Document.from_location), joinedload(Document.to_location))
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
    return _serialize_document(doc, _tasks_for_document_id(db, doc.id))


@router.post("/{document_id}/pz/complete", response_model=DocumentResponse)
def pz_complete_receipt(
    document_id: int,
    current_user: User = require_permission("documents", "OPERATIONAL"),
    db: Session = Depends(get_db),
):
    doc = (
        db.query(Document)
        .options(joinedload(Document.items).joinedload(DocumentItem.product),
            joinedload(Document.items).joinedload(DocumentItem.putaway_to_location), joinedload(Document.from_location), joinedload(Document.to_location))
        .filter(Document.id == document_id, Document.type == DocumentTypeEnum.PZ)
        .first()
    )
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Przyjecie PZ nie znalezione.")
    if doc.status not in (DocumentStatusEnum.DRAFT, DocumentStatusEnum.IN_PROGRESS):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Zakonczyc mozna tylko przyjecie w statusie Nowy lub W trakcie.",
        )

    if not doc.to_location_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="PZ nie ma ustawionej lokalizacji docelowej przyjecia.",
        )
    target_location = (
        db.query(Location)
        .filter(Location.id == doc.to_location_id, Location.is_active.is_(True))
        .first()
    )
    if not target_location:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Lokalizacja docelowa przyjecia nie istnieje lub jest nieaktywna.",
        )
    _confirm_pz(doc, db, current_user.id, target_location)
    doc.status = DocumentStatusEnum.COMPLETED

    log_action(
        db, "PZ_REGISTER", "Document", doc.id,
        details={"number": doc.number, "target_location": target_location.code},
        user_id=current_user.id,
    )
    db.commit()
    db.refresh(doc)
    return _serialize_document(doc, _tasks_for_document_id(db, doc.id))


@router.post("/mm", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
def create_mm(
    data: DocumentCreateMM,
    current_user: User = require_permission("documents", "OPERATIONAL"),
    db: Session = Depends(get_db),
):
    _ensure_not_buffer_source(db, data.from_location_id, doc_type="MM")
    if not db.query(Location).filter(Location.id == data.to_location_id, Location.is_active.is_(True)).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Lokalizacja ID {data.to_location_id} nie istnieje lub jest nieaktywna.",
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
    return _serialize_document(doc, _tasks_for_document_id(db, doc.id))


@router.post("/rw", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
def create_rw(
    data: DocumentCreateRW,
    current_user: User = require_permission("documents", "OPERATIONAL"),
    db: Session = Depends(get_db),
):
    src_loc = _ensure_not_buffer_source(db, data.from_location_id, doc_type="RW")

    recipient_label: str
    if data.recipient_id is not None:
        rec = (
            db.query(Recipient)
            .filter(Recipient.id == data.recipient_id, Recipient.is_active.is_(True))
            .first()
        )
        if not rec:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Odbiorca (recipient_id) nie istnieje lub jest nieaktywny.",
            )
        recipient_label = f"{rec.code} — {rec.name}"
    else:
        recipient_label = (data.recipient or "").strip()

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
        from_location_id=data.from_location_id,
        recipient=recipient_label,
        created_by_id=current_user.id,
    )
    db.add(doc)
    db.flush()

    for item in data.items:
        db.add(DocumentItem(document_id=doc.id, product_id=item.product_id, quantity=item.quantity))

    log_action(
        db, "CREATE", "Document", doc.id,
        details={"type": "RW", "number": number, "recipient": recipient_label, "from_location_id": data.from_location_id},
        user_id=current_user.id,
    )
    db.commit()
    db.refresh(doc)
    return _serialize_document(doc, _tasks_for_document_id(db, doc.id))


@router.post("/{document_id}/confirm", response_model=DocumentResponse)
def confirm_document(
    document_id: int,
    current_user: User = require_permission("documents", "OPERATIONAL"),
    db: Session = Depends(get_db),
):
    doc = (
        db.query(Document)
        .options(joinedload(Document.items).joinedload(DocumentItem.product),
            joinedload(Document.items).joinedload(DocumentItem.putaway_to_location), joinedload(Document.from_location), joinedload(Document.to_location))
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
    return _serialize_document(doc, _tasks_for_document_id(db, doc.id))


@router.post("/{document_id}/generate-tasks")
def generate_tasks(
    document_id: int,
    current_user: User = require_permission("documents", "OPERATIONAL"),
    db: Session = Depends(get_db),
):
    doc = (
        db.query(Document)
        .options(joinedload(Document.items).joinedload(DocumentItem.product),
            joinedload(Document.items).joinedload(DocumentItem.putaway_to_location), joinedload(Document.from_location), joinedload(Document.to_location))
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
        .options(joinedload(Document.items).joinedload(DocumentItem.product),
            joinedload(Document.items).joinedload(DocumentItem.putaway_to_location), joinedload(Document.from_location), joinedload(Document.to_location))
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
    return _serialize_document(doc, _tasks_for_document_id(db, doc.id))