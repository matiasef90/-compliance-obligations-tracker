from math import ceil
from datetime import date, timedelta
from sqlalchemy import select, delete, func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.models import Obligation


class ConcurrencyError(Exception):
    pass


class NotFoundError(Exception):
    pass


class ObligationRepo:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

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
        query = query.order_by(Obligation.due_date.asc())
        query = query.limit(limit).offset((page - 1) * limit)
        result = await self._session.execute(query)
        return list(result.scalars().all())

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
        )
        return result.scalar_one_or_none()

    async def create(self, data: dict) -> Obligation:
        obligation = Obligation(**data)
        self._session.add(obligation)
        await self._session.flush()
        return await self.get_by_id(obligation.id)  # type: ignore[return-value]

    async def update(self, id: str, data: dict, expected_version: int) -> Obligation:
        obligation = await self.get_by_id(id)
        if obligation is None:
            raise NotFoundError(f"Obligation {id} not found")
        if obligation.version != expected_version:
            raise ConcurrencyError("Obligation was modified concurrently")
        for key, value in data.items():
            setattr(obligation, key, value)
        obligation.version = expected_version + 1
        await self._session.flush()
        return await self.get_by_id(id)  # type: ignore[return-value]

    async def delete(self, id: str) -> None:
        result = await self._session.execute(
            delete(Obligation).where(Obligation.id == id)
        )
        if result.rowcount == 0:
            raise NotFoundError(f"Obligation {id} not found")
