"""document_items.putaway_to_location_id for PZ putaway targets

Revision ID: 0007
Revises: 0006
"""
from alembic import op
import sqlalchemy as sa

revision = "0007"
down_revision = "0006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "document_items",
        sa.Column("putaway_to_location_id", sa.Integer(), nullable=True),
    )
    op.create_foreign_key(
        "fk_document_items_putaway_to_location_id",
        "document_items",
        "locations",
        ["putaway_to_location_id"],
        ["id"],
    )


def downgrade() -> None:
    op.drop_constraint(
        "fk_document_items_putaway_to_location_id",
        "document_items",
        type_="foreignkey",
    )
    op.drop_column("document_items", "putaway_to_location_id")
