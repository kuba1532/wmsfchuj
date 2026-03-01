from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.db.database import get_db
from app.middleware.auth import require_permission
from app.models.models import (
    User, Document, DocumentItem, Stock, StockLedger, Task, Product, Location,
    DocumentTypeEnum, DocumentStatusEnum, StockStatusEnum,
    MovementTypeEnum, TaskTypeEnum, TaskStatusEnum, LocationTypeEnum
)
from app.schemas.schemas import DocumentCreatePZ, DocumentCreateMM, DocumentCreateRW, DocumentResponse, PaginatedResponse
from app.services.audit import log_action
from app.services.numbering import generate_document_number

router = APIRouter(prefix="/documents", tags=["Documents"])


def _get_or_create_stock(db: Session, product_id: int, location_id: int) -> Stock:
    stock = db.query(Stock).filter(Stock.product_id == product_id, Stock.location_id == location_id).first()
    if not stock:
        stock = Stock(product_id=product_id, location_id=location_id, quantity=0)
        db.add(stock)
        db.flush()
    return stock


def _record_movement(
    db: Session,
    movement_type: MovementTypeEnum,
    product_id: int,
    quantity: float,
    user_id: int,
    document_number: str,
    from_location_id: int | None = None,
    to_location_id: int | None = None,
):
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


@router.get("", response_model=PaginatedResponse)
def list_documents(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    doc_type: str = Query("", max_length=5),
    search: str = Query("", max_length=100),
    current_user: User = require_permission("documents", "READ"),
    db: Session = Depends(get_db),
):
    query = db.query(Document).options(joinedload(Document.items).joinedload(DocumentItem.product))

    if doc_type:
        try:
            query = query.filter(Document.type == DocumentTypeEnum(doc_type))
        except ValueError:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Nieprawidłowy typ dokumentu.")

    if search:
        s = f"%{search.strip().lower()}%"
        query = query.filter(func.lower(Document.number).like(s))

    query = query.order_by(Document.created_at.desc())
    total = query.count()
    docs = query.offset((page - 1) * page_size).limit(page_size).all()

    return PaginatedResponse(
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
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dokument nie znaleziony.")
    return DocumentResponse.model_validate(doc)


@router.post("/pz", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
def create_pz(
    data: DocumentCreatePZ,
    current_user: User = require_permission("documents", "OPERATIONAL"),
    db: Session = Depends(get_db),
):
    for item in data.items:
        if not db.query(Product).filter(Product.id == item.product_id).first():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Produkt ID {item.product_id} nie istnieje.")

    number = generate_document_number(db, DocumentTypeEnum.PZ)
    doc = Document(number=number, type=DocumentTypeEnum.PZ, supplier=data.supplier, created_by_id=current_user.id)
    db.add(doc)
    db.flush()

    for item in data.items:
        db.add(DocumentItem(document_id=doc.id, product_id=item.product_id, quantity=item.quantity))

    log_action(db, "CREATE", "Document", doc.id, details={"type": "PZ", "number": number, "supplier": data.supplier}, user_id=current_user.id)
    db.commit()
    db.refresh(doc)
    return DocumentResponse.model_validate(doc)


@router.post("/mm", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
def create_mm(
    data: DocumentCreateMM,
    current_user: User = require_permission("documents", "OPERATIONAL"),
    db: Session = Depends(get_db),
):
    if not db.query(Location).filter(Location.id == data.from_location_id).first() or not db.query(Location).filter(Location.id == data.to_location_id).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Lokalizacja nie istnieje.")

    number = generate_document_number(db, DocumentTypeEnum.MM)
    doc = Document(number=number, type=DocumentTypeEnum.MM, from_location_id=data.from_location_id, to_location_id=data.to_location_id, created_by_id=current_user.id)
    db.add(doc)
    db.flush()

    for item in data.items:
        db.add(DocumentItem(document_id=doc.id, product_id=item.product_id, quantity=item.quantity))

    log_action(db, "CREATE", "Document", doc.id, details={"type": "MM", "number": number}, user_id=current_user.id)
    db.commit()
    db.refresh(doc)
    return DocumentResponse.model_validate(doc)


@router.post("/rw", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
def create_rw(
    data: DocumentCreateRW,
    current_user: User = require_permission("documents", "OPERATIONAL"),
    db: Session = Depends(get_db),
):
    number = generate_document_number(db, DocumentTypeEnum.RW)
    doc = Document(number=number, type=DocumentTypeEnum.RW, recipient=data.recipient, created_by_id=current_user.id)
    db.add(doc)
    db.flush()

    for item in data.items:
        db.add(DocumentItem(document_id=doc.id, product_id=item.product_id, quantity=item.quantity))

    log_action(db, "CREATE", "Document", doc.id, details={"type": "RW", "number": number, "recipient": data.recipient}, user_id=current_user.id)
    db.commit()
    db.refresh(doc)
    return DocumentResponse.model_validate(doc)


@router.post("/{document_id}/confirm", response_model=DocumentResponse)
def confirm_document(
    document_id: int,
    current_user: User = require_permission("documents", "FULL"),
    db: Session = Depends(get_db),
):
    doc = db.query(Document).options(joinedload(Document.items)).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dokument nie znaleziony.")
    if doc.status != DocumentStatusEnum.DRAFT:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Tylko dokumenty w statusie Szkic można zatwierdzić.")

    if doc.type == DocumentTypeEnum.PZ:
        buffer = db.query(Location).filter(Location.is_buffer.is_(True)).first()
        if not buffer:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Brak zdefiniowanej strefy przyjęć.")

        for item in doc.items:
            stock = _get_or_create_stock(db, item.product_id, buffer.id)
            stock.quantity += item.quantity
            _record_movement(db, MovementTypeEnum.RECEIPT, item.product_id, item.quantity, current_user.id, doc.number, to_location_id=buffer.id)

    elif doc.type == DocumentTypeEnum.MM:
        # Walidacja stanów
        for item in doc.items:
            stock = (
                db.query(Stock)
                .filter(
                    Stock.product_id == item.product_id,
                    Stock.location_id == doc.from_location_id,
                    Stock.status == StockStatusEnum.AVAILABLE,
                )
                .first()
            )
            if not stock or stock.quantity < item.quantity:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Niewystarczający stan dla produktu ID {item.product_id}.")

        for item in doc.items:
            from_stock = _get_or_create_stock(db, item.product_id, doc.from_location_id)
            from_stock.quantity -= item.quantity
            to_stock = _get_or_create_stock(db, item.product_id, doc.to_location_id)
            to_stock.quantity += item.quantity
            _record_movement(
                db,
                MovementTypeEnum.MOVE,
                item.product_id,
                item.quantity,
                current_user.id,
                doc.number,
                from_location_id=doc.from_location_id,
                to_location_id=doc.to_location_id,
            )

    elif doc.type == DocumentTypeEnum.RW:
        # MVP: RW pobieramy z pierwszej strefy PICKING_ZONE (jeśli nie ma — błąd)
        picking_zone = db.query(Location).filter(Location.type == LocationTypeEnum.PICKING_ZONE, Location.is_active.is_(True)).first()
        if not picking_zone:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Brak zdefiniowanej strefy kompletacji (PICKING_ZONE).")

        # Walidacja stanów
        for item in doc.items:
            stock = (
                db.query(Stock)
                .filter(
                    Stock.product_id == item.product_id,
                    Stock.location_id == picking_zone.id,
                    Stock.status == StockStatusEnum.AVAILABLE,
                )
                .first()
            )
            if not stock or stock.quantity < item.quantity:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Niewystarczający stan do RW dla produktu ID {item.product_id} w strefie kompletacji.")

        # Odjęcie stanów + ledger
        for item in doc.items:
            stock = _get_or_create_stock(db, item.product_id, picking_zone.id)
            stock.quantity -= item.quantity
            _record_movement(
                db,
                MovementTypeEnum.PICK,
                item.product_id,
                item.quantity,
                current_user.id,
                doc.number,
                from_location_id=picking_zone.id,
                to_location_id=None,
            )

    doc.status = DocumentStatusEnum.CONFIRMED
    log_action(db, "CONFIRM", "Document", doc.id, details={"type": doc.type.value, "number": doc.number}, user_id=current_user.id)
    db.commit()
    db.refresh(doc)
    return DocumentResponse.model_validate(doc)


@router.post("/{document_id}/generate-tasks")
def generate_tasks(
    document_id: int,
    current_user: User = require_permission("taskManagement", "FULL"),
    db: Session = Depends(get_db),
):
    doc = db.query(Document).options(joinedload(Document.items)).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dokument nie znaleziony.")
    if doc.status != DocumentStatusEnum.CONFIRMED:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Zadania można generować tylko dla zatwierdzonych dokumentów.")

    task_type_map = {
        DocumentTypeEnum.PZ: TaskTypeEnum.PUTAWAY,
        DocumentTypeEnum.MM: TaskTypeEnum.MOVE,
        DocumentTypeEnum.RW: TaskTypeEnum.PICKING,
    }

    tasks_created = 0
    for item in doc.items:
        db.add(
            Task(
                type=task_type_map[doc.type],
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
    log_action(db, "GENERATE_TASKS", "Document", doc.id, details={"tasks_created": tasks_created, "number": doc.number}, user_id=current_user.id)
    db.commit()
    return {"message": f"Wygenerowano {tasks_created} zadań dla {doc.number}.", "tasks_created": tasks_created}