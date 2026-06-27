from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import ObligationAuditLog


class AuditRepo:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def log(
        self,
        obligation_id: str,
        from_status: str,
        to_status: str,
    ) -> None:
        entry = ObligationAuditLog(
            obligation_id=obligation_id,
            from_status=from_status,
            to_status=to_status,
        )
        self._session.add(entry)
        await self._session.flush()
