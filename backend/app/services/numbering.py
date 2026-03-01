from datetime import datetime

from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.models import Document, Inventory, DocumentTypeEnum


def generate_document_number(
    db: Session,
    doc_type: DocumentTypeEnum,
) -> str:
    year = datetime.now().year
    prefix = doc_type.value

    count = (
        db.query(func.count(Document.id))
        .filter(Document.type == doc_type)
        .filter(Document.number.like(f"{prefix}/{year}/%"))
        .scalar()
    )

    next_num = (count or 0) + 1

    return f"{prefix}/{year}/{next_num:03d}"


def generate_inventory_number(db: Session) -> str:
    year = datetime.now().year

    count = (
        db.query(func.count(Inventory.id))
        .filter(Inventory.number.like(f"INW/{year}/%"))
        .scalar()
    )

    next_num = (count or 0) + 1

    return f"INW/{year}/{next_num:03d}"