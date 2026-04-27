"""add password setup tokens and user password setup flags

Revision ID: 0006
Revises: 0005
"""
from alembic import op
import sqlalchemy as sa


revision = "0006"
down_revision = "0005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("must_set_password", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column("users", sa.Column("password_set_at", sa.DateTime(), nullable=True))
    op.alter_column("users", "must_set_password", server_default=None)

    op.create_table(
        "password_setup_tokens",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("token_hash", sa.String(length=255), nullable=False),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("used_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("token_hash", name="uq_password_setup_tokens_hash"),
    )
    op.create_index("ix_password_setup_tokens_user_id", "password_setup_tokens", ["user_id"])
    op.create_index("ix_password_setup_tokens_expires_at", "password_setup_tokens", ["expires_at"])
    op.create_index("ix_password_setup_tokens_used_at", "password_setup_tokens", ["used_at"])


def downgrade() -> None:
    op.drop_index("ix_password_setup_tokens_used_at", table_name="password_setup_tokens")
    op.drop_index("ix_password_setup_tokens_expires_at", table_name="password_setup_tokens")
    op.drop_index("ix_password_setup_tokens_user_id", table_name="password_setup_tokens")
    op.drop_table("password_setup_tokens")

    op.drop_column("users", "password_set_at")
    op.drop_column("users", "must_set_password")
