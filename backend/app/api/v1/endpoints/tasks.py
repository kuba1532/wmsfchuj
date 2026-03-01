from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.middleware.auth import require_permission
from app.models.models import User, Task, TaskStatusEnum, TaskTypeEnum, RoleEnum
from app.schemas.schemas import TaskCreate, TaskResponse, PaginatedResponse
from app.services.audit import log_action

router = APIRouter(prefix="/tasks", tags=["Tasks"])


@router.get("", response_model=PaginatedResponse)
def list_tasks(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    status_filter: str = Query("", max_length=20),
    current_user: User = require_permission("tasks", "EXECUTE"),
    db: Session = Depends(get_db),
):
    query = db.query(Task)

    if current_user.role == RoleEnum.MAGAZYNIER:
        query = query.filter(Task.assigned_to_id == current_user.id)

    if status_filter:
        query = query.filter(Task.status == TaskStatusEnum(status_filter))

    query = query.order_by(Task.created_at.desc())
    total = query.count()
    tasks = query.offset((page - 1) * page_size).limit(page_size).all()

    return PaginatedResponse(
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
    if not db.query(User).filter(User.id == data.assigned_to_id).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Przypisany uzytkownik nie istnieje.")

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
    log_action(db, "CREATE", "Task", details={"type": data.type, "assigned_to": data.assigned_to_id}, user_id=current_user.id)
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

    if current_user.role == RoleEnum.MAGAZYNIER and task.assigned_to_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Nie mozesz rozpoczac cudzego zadania.")

    if task.status not in (TaskStatusEnum.NEW, TaskStatusEnum.ASSIGNED):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Zadanie nie moze zostac rozpoczete.")

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

    if current_user.role == RoleEnum.MAGAZYNIER and task.assigned_to_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Nie mozesz zakonczyc cudzego zadania.")

    if task.status != TaskStatusEnum.IN_PROGRESS:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Tylko zadania w trakcie realizacji mozna zakonczyc.")

    task.status = TaskStatusEnum.COMPLETED
    task.completed_at = datetime.now(timezone.utc)

    log_action(db, "COMPLETE", "Task", task.id, user_id=current_user.id)
    db.commit()
    db.refresh(task)

    return TaskResponse.model_validate(task)