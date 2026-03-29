from datetime import datetime

from sqlalchemy.orm import Session
from sqlalchemy import text

from app.models.models import DocumentTypeEnum


def generate_document_number(
    db: Session,
    doc_type: DocumentTypeEnum,
) -> str:
    """Generuje numer dokumentu z blokada FOR UPDATE.

    Uzywa MAX na ostatnim segmencie numeru (po ostatnim '/'),
    zeby byc odpornym na usuniete dokumenty.
    FOR UPDATE zapobiega wyscigowi przy jednoczesnym tworzeniu.
    """
    year = datetime.now().year
    prefix = doc_type.value
    pattern = f"{prefix}/{year}/%"

    # MySQL: SUBSTRING_INDEX(number, '/', -1) wyciaga ostatni segment
    # FOR UPDATE blokuje pasujace wiersze do konca transakcji
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
    return f"{prefix}/{year}/{next_num:03d}"


def generate_inventory_number(db: Session) -> str:
    """Generuje numer inwentaryzacji z blokada FOR UPDATE."""
    year = datetime.now().year
    pattern = f"INW/{year}/%"

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
    return f"INW/{year}/{next_num:03d}"