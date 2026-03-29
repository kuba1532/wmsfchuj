"""rename role enum values to english

Revision ID: 0002
Revises: 0001
Create Date: 2025-01-15 00:00:00.000000
"""
from alembic import op

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None

# MySQL wymaga ALTER COLUMN z nowym ENUM — nie da się po prostu UPDATE
# Strategia: zmień kolumnę na VARCHAR, zaktualizuj dane, zmień z powrotem na ENUM

ROLE_MAP = {
    "ADMINISTRATOR": "ADMIN",
    "KIEROWNIK": "MANAGER",
    "BRYGADZISTA": "FOREMAN",
    "MAGAZYNIER": "WORKER",
}

ROLE_MAP_REVERSE = {v: k for k, v in ROLE_MAP.items()}


def upgrade() -> None:
    # 1. Zmień kolumnę na VARCHAR tymczasowo
    op.alter_column(
        "users", "role",
        type_=__import__("sqlalchemy").String(20),
        existing_nullable=False,
    )

    # 2. Zaktualizuj wartości
    for old, new in ROLE_MAP.items():
        op.execute(f"UPDATE users SET role = '{new}' WHERE role = '{old}'")

    # 3. Zmień z powrotem na ENUM z nowymi wartościami
    op.alter_column(
        "users", "role",
        type_=__import__("sqlalchemy").Enum("ADMIN", "MANAGER", "FOREMAN", "WORKER", name="roleenum"),
        existing_nullable=False,
    )


def downgrade() -> None:
    op.alter_column(
        "users", "role",
        type_=__import__("sqlalchemy").String(20),
        existing_nullable=False,
    )

    for new, old in ROLE_MAP_REVERSE.items():
        op.execute(f"UPDATE users SET role = '{old}' WHERE role = '{new}'")

    op.alter_column(
        "users", "role",
        type_=__import__("sqlalchemy").Enum("ADMINISTRATOR", "KIEROWNIK", "BRYGADZISTA", "MAGAZYNIER", name="roleenum"),
        existing_nullable=False,
    )