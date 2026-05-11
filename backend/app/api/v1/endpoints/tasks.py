from datetime import datetime, timezone
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.db.database import get_db
from app.middleware.auth import require_permission
from app.models.models import (
    User, Task, Product, Location,
    Stock, StockLedger, Document,
    TaskStatusEnum, TaskTypeEnum, RoleEnum,
    StockStatusEnum, MovementTypeEnum,
    DocumentStatusEnum, DocumentTypeEnum,
)
from app.schemas.schemas import TaskCreate, TaskResponse, PaginatedResponse
from app.services.audit import log_action

router = APIRouter(prefix="/tasks", tags=["Tasks"])


def _move_stock_for_putaway(task: Task, db: Session, user_id: int) -> None:
    """Fizyczne przesunięcie towaru z bufora na lokalizację docelową przy zakończeniu PUTAWAY."""
    if task.from_location_id is None or task.to_location_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Zadanie odlozenia nie ma ustawionej lokalizacji zrodlowej lub docelowej.",
        )
    qty = Decimal(task.quantity or 0)
    if qty <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ilosc na zadaniu odlozenia musi byc wieksza od zera.",
        )

    from_stock = (
        db.query(Stock)
        .filter(
            Stock.product_id == task.product_id,
            Stock.location_id == task.from_location_id,
            Stock.status == StockStatusEnum.AVAILABLE,
        )
        .with_for_update()
        .first()
    )
    available_qty = Decimal(from_stock.quantity) if from_stock else Decimal("0")
    if available_qty < qty:
        from_code = task.from_location.code if task.from_location else f"#{task.from_location_id}"
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Niewystarczajacy stan na lokalizacji zrodlowej do dokonczenia odlozenia. "
                f"Wymagane: {qty}, dostepne: {available_qty} (lokalizacja: {from_code})."
            ),
        )

    from_stock.quantity = Decimal(from_stock.quantity) - qty

    to_stock = (
        db.query(Stock)
        .filter(Stock.product_id == task.product_id, Stock.location_id == task.to_location_id)
        .with_for_update()
        .first()
    )
    if not to_stock:
        to_stock = Stock(
            product_id=task.product_id,
            location_id=task.to_location_id,
            quantity=Decimal("0"),
            status=StockStatusEnum.AVAILABLE,
        )
        db.add(to_stock)
        db.flush()
    to_stock.quantity = Decimal(to_stock.quantity) + qty

    doc_number = task.document.number if task.document else f"TASK-{task.id}"
    db.add(
        StockLedger(
            movement_type=MovementTypeEnum.PUTAWAY,
            product_id=task.product_id,
            from_location_id=task.from_location_id,
            to_location_id=task.to_location_id,
            quantity=qty,
            document_number=doc_number,
            user_id=user_id,
        )
    )


def _maybe_close_pz_document(task: Task, db: Session) -> None:
    """Jeśli wszystkie PUTAWAY danego PZ są zakończone — zamknij dokument."""
    if not task.document_id:
        return
    doc = db.query(Document).filter(Document.id == task.document_id).first()
    if not doc or doc.type != DocumentTypeEnum.PZ:
        return
    open_tasks = (
        db.query(func.count(Task.id))
        .filter(
            Task.document_id == doc.id,
            Task.type == TaskTypeEnum.PUTAWAY,
            Task.status.notin_([TaskStatusEnum.COMPLETED, TaskStatusEnum.CANCELLED]),
        )
        .scalar()
    )
    if open_tasks == 0 and doc.status != DocumentStatusEnum.COMPLETED:
        doc.status = DocumentStatusEnum.COMPLETED


def _task_eager_opts():
    return (
        joinedload(Task.product),
        joinedload(Task.from_location),
        joinedload(Task.to_location),
    )


@router.get("", response_model=PaginatedResponse[TaskResponse])
def list_tasks(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    status_filter: str = Query("", max_length=20),
    omit_terminal: bool = Query(
        False,
        description="True: pomin zadania COMPLETED i CANCELLED (np. mobilka — tylko do zrobienia)",
    ),
    current_user: User = require_permission("tasks", "EXECUTE"),
    db: Session = Depends(get_db),
):
    count_query = db.query(func.count(Task.id))
    data_query = db.query(Task).options(*_task_eager_opts())

    if current_user.role == RoleEnum.WORKER:
        # WORKER widzi swoje zadania + zadania z puli (NEW bez przypisania).
        worker_scope = (
            (Task.assigned_to_id == current_user.id)
            | ((Task.assigned_to_id.is_(None)) & (Task.status == TaskStatusEnum.NEW))
        )
        count_query = count_query.filter(worker_scope)
        data_query = data_query.filter(worker_scope)

    if status_filter:
        try:
            task_status = TaskStatusEnum(status_filter)
            count_query = count_query.filter(Task.status == task_status)
            data_query = data_query.filter(Task.status == task_status)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Nieprawidlowy status zadania.",
            )
    elif omit_terminal:
        terminal = (TaskStatusEnum.COMPLETED, TaskStatusEnum.CANCELLED)
        count_query = count_query.filter(Task.status.notin_(terminal))
        data_query = data_query.filter(Task.status.notin_(terminal))

    total = count_query.scalar()
    tasks = data_query.order_by(Task.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()

    return PaginatedResponse[TaskResponse](
        items=[TaskResponse.model_validate(t) for t in tasks],
        total=total,
        page=page,
        page_size=page_size,
        pages=(total + page_size - 1) // page_size,
    )


@router.post("", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
def create_task(
    data: TaskCreate,
    current_user: User = require_permission("taskManagement", "FULL"),
    db: Session = Depends(get_db),
):
    if not db.query(User).filter(User.id == data.assigned_to_id, User.is_active.is_(True)).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Przypisany uzytkownik nie istnieje lub jest nieaktywny.",
        )

    if data.product_id and not db.query(Product).filter(
        Product.id == data.product_id, Product.is_active.is_(True)
    ).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Produkt ID {data.product_id} nie istnieje lub jest nieaktywny.",
        )

    for loc_id in filter(None, [data.from_location_id, data.to_location_id]):
        if not db.query(Location).filter(
            Location.id == loc_id, Location.is_active.is_(True)
        ).first():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Lokalizacja ID {loc_id} nie istnieje lub jest nieaktywna.",
            )

    task = Task(
        type=TaskTypeEnum(data.type),
        status=TaskStatusEnum.ASSIGNED,
        product_id=data.product_id,
        from_location_id=data.from_location_id,
        to_location_id=data.to_location_id,
        quantity=data.quantity,
        assigned_to_id=data.assigned_to_id,
        created_by_id=current_user.id,
    )

    db.add(task)
    db.flush()
    log_action(
        db, "CREATE", "Task", task.id,
        details={"type": data.type, "assigned_to": data.assigned_to_id},
        user_id=current_user.id,
    )
    db.commit()
    db.refresh(task)
    return TaskResponse.model_validate(task)


@router.post("/{task_id}/start", response_model=TaskResponse)
def start_task(
    task_id: int,
    current_user: User = require_permission("tasks", "EXECUTE"),
    db: Session = Depends(get_db),
):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Zadanie nie znalezione.")

    if current_user.role == RoleEnum.WORKER and task.assigned_to_id not in (None, current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Nie mozesz rozpoczac cudzego zadania.",
        )

    if task.status not in (TaskStatusEnum.NEW, TaskStatusEnum.ASSIGNED):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Zadanie nie moze zostac rozpoczete.",
        )

    # Pobranie zadania z puli: pierwsze rozpoczecie przypisuje zadanie do aktualnego usera.
    if task.assigned_to_id is None:
        task.assigned_to_id = current_user.id

    task.status = TaskStatusEnum.IN_PROGRESS
    task.started_at = datetime.now(timezone.utc)

    log_action(db, "START", "Task", task.id, user_id=current_user.id)
    db.commit()
    db.refresh(task)
    return TaskResponse.model_validate(task)


@router.post("/{task_id}/complete", response_model=TaskResponse)
def complete_task(
    task_id: int,
    current_user: User = require_permission("tasks", "EXECUTE"),
    db: Session = Depends(get_db),
):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Zadanie nie znalezione.")

    if current_user.role == RoleEnum.WORKER and task.assigned_to_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Nie mozesz zakonczyc cudzego zadania.",
        )

    if task.status != TaskStatusEnum.IN_PROGRESS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tylko zadania w toku mozna zakonczyc.",
        )

    if task.type == TaskTypeEnum.PUTAWAY:
        _move_stock_for_putaway(task, db, current_user.id)

    task.status = TaskStatusEnum.COMPLETED
    task.completed_at = datetime.now(timezone.utc)
    db.flush()

    if task.type == TaskTypeEnum.PUTAWAY:
        _maybe_close_pz_document(task, db)

    log_action(db, "COMPLETE", "Task", task.id, user_id=current_user.id)
    db.commit()
    db.refresh(task)
    return TaskResponse.model_validate(task)


@router.post("/{task_id}/cancel", response_model=TaskResponse)
def cancel_task(
    task_id: int,
    current_user: User = require_permission("taskManagement", "FULL"),
    db: Session = Depends(get_db),
):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Zadanie nie znalezione.")

    if task.status in (TaskStatusEnum.COMPLETED, TaskStatusEnum.CANCELLED):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nie mozna anulowac zadania ktore jest zakonczone lub juz anulowane.",
        )

    task.status = TaskStatusEnum.CANCELLED

    log_action(db, "CANCEL", "Task", task.id, user_id=current_user.id)
    db.commit()
    db.refresh(task)
    return TaskResponse.model_validate(task)