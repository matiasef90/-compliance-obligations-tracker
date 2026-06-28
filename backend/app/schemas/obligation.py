from datetime import date, datetime

from pydantic import BaseModel

from app.domain.obligation import ObligationStatus, ObligationType


class AuditEntryResponse(BaseModel):
    from_status: str
    to_status: str
    changed_at: datetime


class ObligationResponse(BaseModel):
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
    audit_trail: list[AuditEntryResponse]
    created_at: datetime
    updated_at: datetime


class ObligationListResponse(BaseModel):
    items: list[ObligationResponse]
    total: int
    page: int
    limit: int
    pages: int


class ObligationStatsResponse(BaseModel):
    total: int
    overdue: int
    upcoming_7_days: int
    by_status: dict[str, int]


class ObligationCreate(BaseModel):
    type: ObligationType
    title: str
    description: str | None = None
    due_date: date
    owner: str
    requires_document: bool = False
    document_url: str | None = None
    company_tax_id: str


class ObligationUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    due_date: date | None = None
    owner: str | None = None
    requires_document: bool | None = None
    document_url: str | None = None
    version: int


class TransitionRequest(BaseModel):
    to_status: ObligationStatus
    version: int
