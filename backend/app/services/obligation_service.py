from dataclasses import dataclass
from datetime import date, datetime

from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.obligation import (
    ObligationStatus,
    ObligationType,
    get_valid_transitions,
    is_overdue,
    mask_tax_id,
    validate_document_gate,
    validate_transition,
)
from app.repositories.audit_repo import AuditRepo
from app.repositories.obligation_repo import NotFoundError, ObligationRepo
from app.db.models import Obligation


@dataclass
class AuditEntryDTO:
    from_status: str
    to_status: str
    changed_at: datetime


@dataclass
class ObligationDTO:
    id: str
    type: str
    title: str
    description: str | None
    status: str
    due_date: date
    owner: str
    requires_document: bool
    document_url: str | None
    company_tax_id: str
    version: int
    overdue: bool
    valid_transitions: list[str]
    audit_trail: list[AuditEntryDTO]
    created_at: datetime
    updated_at: datetime


class ObligationService:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._repo = ObligationRepo(session)
        self._audit_repo = AuditRepo(session)

    async def list_obligations(self) -> list[ObligationDTO]:
        obligations = await self._repo.get_all()
        return [self._to_dto(o) for o in obligations]

    async def get_obligation(self, id: str) -> ObligationDTO:
        obligation = await self._repo.get_by_id(id)
        if obligation is None:
            raise NotFoundError(f"Obligation {id} not found")
        return self._to_dto(obligation)

    async def create_obligation(self, data: dict) -> ObligationDTO:
        obligation = await self._repo.create(data)
        await self._session.commit()
        await self._session.refresh(obligation)
        return self._to_dto(obligation)

    async def update_obligation(self, id: str, data: dict, version: int) -> ObligationDTO:
        obligation = await self._repo.update(id, data, version)
        await self._session.commit()
        await self._session.refresh(obligation)
        return self._to_dto(obligation)

    async def delete_obligation(self, id: str) -> None:
        await self._repo.delete(id)
        await self._session.commit()

    async def transition_status(
        self, id: str, to_status: ObligationStatus, version: int
    ) -> ObligationDTO:
        obligation = await self._repo.get_by_id(id)
        if obligation is None:
            raise NotFoundError(f"Obligation {id} not found")

        current = ObligationStatus(obligation.status)
        validate_transition(current, to_status)
        validate_document_gate(obligation.requires_document, obligation.document_url, to_status)

        from_status = obligation.status
        obligation = await self._repo.update(
            id, {"status": to_status.value}, version
        )
        await self._audit_repo.log(id, from_status, to_status.value)
        await self._session.commit()
        await self._session.refresh(obligation)
        return self._to_dto(obligation)

    def _to_dto(self, obligation: Obligation) -> ObligationDTO:
        status = ObligationStatus(obligation.status)
        audit_trail = [
            AuditEntryDTO(
                from_status=log.from_status,
                to_status=log.to_status,
                changed_at=log.changed_at,
            )
            for log in (obligation.audit_logs or [])
        ]
        return ObligationDTO(
            id=obligation.id,
            type=obligation.type,
            title=obligation.title,
            description=obligation.description,
            status=obligation.status,
            due_date=obligation.due_date,
            owner=obligation.owner,
            requires_document=obligation.requires_document,
            document_url=obligation.document_url,
            company_tax_id=mask_tax_id(obligation.company_tax_id),
            version=obligation.version,
            overdue=is_overdue(obligation.due_date, status),
            valid_transitions=[s.value for s in get_valid_transitions(status)],
            audit_trail=audit_trail,
            created_at=obligation.created_at,
            updated_at=obligation.updated_at,
        )
