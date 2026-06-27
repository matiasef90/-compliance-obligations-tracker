"""initial

Revision ID: 0001
Revises:
Create Date: 2026-06-27
"""
from alembic import op
import sqlalchemy as sa

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "obligations",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("type", sa.String(50), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="pending"),
        sa.Column("due_date", sa.Date, nullable=False),
        sa.Column("owner", sa.String(255), nullable=False),
        sa.Column("requires_document", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("document_url", sa.String(500), nullable=True),
        sa.Column("company_tax_id", sa.String(50), nullable=False),
        sa.Column("version", sa.Integer, nullable=False, server_default="1"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "obligation_audit_log",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column(
            "obligation_id",
            sa.String(36),
            sa.ForeignKey("obligations.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("from_status", sa.String(20), nullable=False),
        sa.Column("to_status", sa.String(20), nullable=False),
        sa.Column("changed_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_index("ix_audit_log_obligation_id", "obligation_audit_log", ["obligation_id"])


def downgrade() -> None:
    op.drop_table("obligation_audit_log")
    op.drop_table("obligations")
