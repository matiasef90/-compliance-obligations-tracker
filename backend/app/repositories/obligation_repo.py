from math import ceil
from datetime import date, timedelta
from sqlalchemy import select, delete, func, or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import settings
from app.crypto import CryptoError, decrypt, encrypt
from app.db.models import Obligation


class ConcurrencyError(Exception):
    pass


class NotFoundError(Exception):
    pass


class PersistenceError(Exception):
    pass


class ObligationRepo:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    def _decrypt_obligation(self, obligation: Obligation) -> Obligation:
        # Write directly to __dict__ to bypass SQLAlchemy's change tracking,
        # preventing the decrypted plaintext from being flushed back to DB.
        try:
            obligation.__dict__["company_tax_id"] = decrypt(
                obligation.company_tax_id, settings.encryption_key_bytes
            )
        except CryptoError as exc:
            raise CryptoError(f"Failed to decrypt obligation {obligation.id}") from exc
        return obligation

    async def get_paginated(
        self,
        page: int,
        limit: int,
        status: str | None,
        search: str | None,
    ) -> list[Obligation]:
        query = select(Obligation).options(selectinload(Obligation.audit_logs))
        if status:
            query = query.where(Obligation.status == status)
        if search:
            pattern = f"%{search}%"
            query = query.where(
                or_(
                    Obligation.title.ilike(pattern),
                    Obligation.owner.ilike(pattern),
                    Obligation.type.ilike(pattern),
                )
            )
        query = query.execution_options(populate_existing=True)
        query = query.order_by(Obligation.due_date.asc())
        query = query.limit(limit).offset((page - 1) * limit)
        result = await self._session.execute(query)
        obligations = list(result.scalars().all())
        return [self._decrypt_obligation(o) for o in obligations]

    async def count(self, status: str | None, search: str | None) -> int:
        query = select(func.count()).select_from(Obligation)
        if status:
            query = query.where(Obligation.status == status)
        if search:
            pattern = f"%{search}%"
            query = query.where(
                or_(
                    Obligation.title.ilike(pattern),
                    Obligation.owner.ilike(pattern),
                    Obligation.type.ilike(pattern),
                )
            )
        result = await self._session.execute(query)
        return result.scalar_one()

    async def get_stats(self) -> dict:
        today = date.today()
        upcoming_limit = today + timedelta(days=7)

        by_status_result = await self._session.execute(
            select(Obligation.status, func.count()).group_by(Obligation.status)
        )
        by_status: dict[str, int] = {"pending": 0, "in_progress": 0, "submitted": 0, "done": 0}
        total = 0
        for row_status, row_count in by_status_result.all():
            by_status[row_status] = row_count
            total += row_count

        overdue_result = await self._session.execute(
            select(func.count()).select_from(Obligation).where(
                Obligation.due_date < today,
                Obligation.status.not_in(["submitted", "done"]),
            )
        )
        overdue = overdue_result.scalar_one()

        upcoming_result = await self._session.execute(
            select(func.count()).select_from(Obligation).where(
                Obligation.due_date >= today,
                Obligation.due_date <= upcoming_limit,
                Obligation.status.not_in(["submitted", "done"]),
            )
        )
        upcoming = upcoming_result.scalar_one()

        return {
            "total": total,
            "overdue": overdue,
            "upcoming_7_days": upcoming,
            "by_status": by_status,
        }

    async def get_by_id(self, id: str) -> Obligation | None:
        result = await self._session.execute(
            select(Obligation)
            .where(Obligation.id == id)
            .options(selectinload(Obligation.audit_logs))
            .execution_options(populate_existing=True)
        )
        obligation = result.scalar_one_or_none()
        if obligation is not None:
            self._decrypt_obligation(obligation)
        return obligation

    async def create(self, data: dict) -> Obligation:
        data = dict(data)
        data["company_tax_id"] = encrypt(data["company_tax_id"], settings.encryption_key_bytes)
        obligation = Obligation(**data)
        self._session.add(obligation)
        try:
            await self._session.flush()
        except IntegrityError as exc:
            raise PersistenceError("Failed to persist obligation") from exc
        return await self.get_by_id(obligation.id)  # type: ignore[return-value]

    async def update(self, id: str, data: dict, expected_version: int) -> Obligation:
        result = await self._session.execute(
            select(Obligation)
            .where(Obligation.id == id)
            .options(selectinload(Obligation.audit_logs))
        )
        obligation = result.scalar_one_or_none()
        if obligation is None:
            raise NotFoundError(f"Obligation {id} not found")
        if obligation.version != expected_version:
            raise ConcurrencyError("Obligation was modified concurrently")
        for key, value in data.items():
            setattr(obligation, key, value)
        obligation.version = expected_version + 1
        try:
            await self._session.flush()
        except IntegrityError as exc:
            raise PersistenceError("Failed to persist obligation") from exc
        return await self.get_by_id(id)  # type: ignore[return-value]

    async def delete(self, id: str) -> None:
        result = await self._session.execute(
            delete(Obligation).where(Obligation.id == id)
        )
        if result.rowcount == 0:
            raise NotFoundError(f"Obligation {id} not found")
