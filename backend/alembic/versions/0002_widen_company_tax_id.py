"""widen company_tax_id for encryption

Revision ID: 0002
Revises: 0001
Create Date: 2026-06-29
"""
from alembic import op
import sqlalchemy as sa

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column(
        "obligations",
        "company_tax_id",
        existing_type=sa.String(50),
        type_=sa.String(255),
        existing_nullable=False,
    )


def downgrade() -> None:
    op.alter_column(
        "obligations",
        "company_tax_id",
        existing_type=sa.String(255),
        type_=sa.String(50),
        existing_nullable=False,
    )
