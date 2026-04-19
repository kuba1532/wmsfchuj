"""relax stock unique constraint: (product_id, location_id) -> (product_id, location_id, status)

Revision ID: 0005
Revises: 0004
"""
from alembic import op


revision = "0005"
down_revision = "0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Usuwamy stary constraint (product_id, location_id)
    # i dodajemy szerszy (product_id, location_id, status) — żeby można bylo
    # trzymac dwa rekordy stock dla tej samej pary produkt+lokalizacja,
    # ale o roznych statusach (np. po czesciowym blokowaniu).
    op.drop_constraint(
        "uq_stock_product_location",
        "stock",
        type_="unique",
    )
    op.create_unique_constraint(
        "uq_stock_product_location_status",
        "stock",
        ["product_id", "location_id", "status"],
    )


def downgrade() -> None:
    op.drop_constraint(
        "uq_stock_product_location_status",
        "stock",
        type_="unique",
    )
    op.create_unique_constraint(
        "uq_stock_product_location",
        "stock",
        ["product_id", "location_id"],
    )
