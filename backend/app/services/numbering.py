from datetime import datetime

from sqlalchemy.orm import Session
from sqlalchemy import text, select

from app.models.models import DocumentTypeEnum, Document, Inventory


def _dialect_name(db: Session) -> str:
    bind = db.get_bind()
    return bind.dialect.name if bind is not None else ""


def _max_last_segment(numbers: list[str]) -> int:
    """Największa liczba z ostatniego segmentu numeru (po ostatnim '/').

    Odporne na usunięte dokumenty i na nietypowe wartości (pomijamy nieparsowalne).
    """
    best = 0
    for n in numbers:
        if not n:
            continue
        tail = n.rsplit("/", 1)[-1]
        try:
            value = int(tail)
        except (TypeError, ValueError):
            continue
        if value > best:
            best = value
    return best


def generate_document_number(
    db: Session,
    doc_type: DocumentTypeEnum,
) -> str:
    """Generuje numer dokumentu.

    MySQL: pojedyncze zapytanie z `FOR UPDATE` (blokada przed wyścigiem przy
    równoległym tworzeniu). Inne dialekty (np. SQLite w testach): przenośny
    fallback parsujący ostatni segment w Pythonie.
    """
    year = datetime.now().year
    prefix = doc_type.value
    pattern = f"{prefix}/{year}/%"

    if _dialect_name(db) == "mysql":
        row = db.execute(
            text(
                "SELECT MAX(CAST(SUBSTRING_INDEX(number, '/', -1) AS UNSIGNED)) "
                "FROM documents "
                "WHERE type = :doc_type AND number LIKE :pattern "
                "FOR UPDATE"
            ),
            {"doc_type": doc_type.value, "pattern": pattern},
        ).scalar()
        next_num = (row or 0) + 1
    else:
        numbers = (
            db.execute(
                select(Document.number).where(
                    Document.type == doc_type,
                    Document.number.like(pattern),
                )
            )
            .scalars()
            .all()
        )
        next_num = _max_last_segment(list(numbers)) + 1

    return f"{prefix}/{year}/{next_num:03d}"


def generate_inventory_number(db: Session) -> str:
    """Generuje numer inwentaryzacji (analogicznie do numeru dokumentu)."""
    year = datetime.now().year
    pattern = f"INW/{year}/%"

    if _dialect_name(db) == "mysql":
        row = db.execute(
            text(
                "SELECT MAX(CAST(SUBSTRING_INDEX(number, '/', -1) AS UNSIGNED)) "
                "FROM inventories "
                "WHERE number LIKE :pattern "
                "FOR UPDATE"
            ),
            {"pattern": pattern},
        ).scalar()
        next_num = (row or 0) + 1
    else:
        numbers = (
            db.execute(
                select(Inventory.number).where(Inventory.number.like(pattern))
            )
            .scalars()
            .all()
        )
        next_num = _max_last_segment(list(numbers)) + 1

    return f"INW/{year}/{next_num:03d}"
