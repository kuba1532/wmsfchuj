"""suppliers, supplier_products, documents.supplier_id

Revision ID: 0004
Revises: 0003
"""
from alembic import op
import sqlalchemy as sa

revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "suppliers",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("code", sa.String(50), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("1"), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column("version", sa.Integer(), server_default="1", nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("code"),
    )
    op.create_table(
        "supplier_products",
        sa.Column("supplier_id", sa.Integer(), nullable=False),
        sa.Column("product_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["product_id"], ["products.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["supplier_id"], ["suppliers.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("supplier_id", "product_id"),
    )
    op.add_column("documents", sa.Column("supplier_id", sa.Integer(), nullable=True))
    op.create_foreign_key(
        "fk_documents_supplier_id",
        "documents",
        "suppliers",
        ["supplier_id"],
        ["id"],
    )


def downgrade() -> None:
    op.drop_constraint("fk_documents_supplier_id", "documents", type_="foreignkey")
    op.drop_column("documents", "supplier_id")
    op.drop_table("supplier_products")
    op.drop_table("suppliers")
