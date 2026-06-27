from sqlalchemy import select, delete
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

    async def get_all(self) -> list[Obligation]:
        result = await self._session.execute(
            select(Obligation).options(selectinload(Obligation.audit_logs))
        )
        return list(result.scalars().all())

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
