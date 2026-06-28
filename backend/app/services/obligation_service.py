import random
from dataclasses import dataclass
from datetime import date, datetime
from math import ceil

from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
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


@dataclass
class PagedResult:
    items: list[ObligationDTO]
    total: int
    page: int
    limit: int
    pages: int


@dataclass
class StatsDTO:
    total: int
    overdue: int
    upcoming_7_days: int
    by_status: dict[str, int]


_MOCK_DOC_FILENAMES = ["doc1.png", "doc2.png", "doc3.png", "doc4.png"]


class ObligationService:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._repo = ObligationRepo(session)
        self._audit_repo = AuditRepo(session)

    async def list_obligations(
        self,
        page: int = 1,
        limit: int = 10,
        status: str | None = None,
        search: str | None = None,
    ) -> PagedResult:
        items = await self._repo.get_paginated(page, limit, status, search)
        total = await self._repo.count(status, search)
        pages = max(1, ceil(total / limit))
        return PagedResult(
            items=[self._to_dto(o) for o in items],
            total=total,
            page=page,
            limit=limit,
            pages=pages,
        )

    async def get_stats(self) -> StatsDTO:
        raw = await self._repo.get_stats()
        return StatsDTO(
            total=raw["total"],
            overdue=raw["overdue"],
            upcoming_7_days=raw["upcoming_7_days"],
            by_status=raw["by_status"],
        )

    async def get_obligation(self, id: str) -> ObligationDTO:
        obligation = await self._repo.get_by_id(id)
        if obligation is None:
            raise NotFoundError(f"Obligation {id} not found")
        return self._to_dto(obligation)

    async def create_obligation(self, data: dict) -> ObligationDTO:
        obligation = await self._repo.create(data)
        await self._session.commit()
        return self._to_dto(obligation)

    async def update_obligation(self, id: str, data: dict, version: int) -> ObligationDTO:
        obligation = await self._repo.update(id, data, version)
        await self._session.commit()
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
        obligation = await self._repo.get_by_id(id)
        return self._to_dto(obligation)  # type: ignore[arg-type]

    async def upload_document(self, id: str) -> ObligationDTO:
        obligation = await self._repo.get_by_id(id)
        if obligation is None:
            raise NotFoundError(f"Obligation {id} not found")
        filename = random.choice(_MOCK_DOC_FILENAMES)
        url = f"{settings.base_url}/static/mock-docs/{filename}"
        obligation = await self._repo.update(id, {"document_url": url}, obligation.version)
        await self._session.commit()
        obligation = await self._repo.get_by_id(id)
        return self._to_dto(obligation)  # type: ignore[arg-type]

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
