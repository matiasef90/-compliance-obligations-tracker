"""encrypt company_tax_id data with AES-256-GCM

Revision ID: 0003
Revises: 0002
Create Date: 2026-06-29
"""
import base64
import os

from alembic import op
from sqlalchemy import text

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    encryption_key_b64 = os.environ.get("ENCRYPTION_KEY")
    if not encryption_key_b64:
        raise RuntimeError(
            "ENCRYPTION_KEY environment variable is required to run this migration. "
            "Generate one with: python -c \"import os,base64; print(base64.b64encode(os.urandom(32)).decode())\""
        )

    from app.crypto import encrypt

    key = base64.b64decode(encryption_key_b64)

    conn = op.get_bind()
    rows = conn.execute(text("SELECT id, company_tax_id FROM obligations")).fetchall()
    for row_id, tax_id in rows:
        encrypted = encrypt(tax_id, key)
        conn.execute(
            text("UPDATE obligations SET company_tax_id = :val WHERE id = :id"),
            {"val": encrypted, "id": row_id},
        )


def downgrade() -> None:
    raise NotImplementedError(
        "Downgrade not implemented: decrypting requires the encryption key available at rollback time. "
        "Restore from a backup created before migration 0003."
    )
