from datetime import date
from enum import Enum


class ObligationStatus(str, Enum):
    pending = "pending"
    in_progress = "in_progress"
    submitted = "submitted"
    done = "done"


class ObligationType(str, Enum):
    annual_report = "annual_report"
    tax_filing = "tax_filing"
    audit = "audit"
    regulatory_disclosure = "regulatory_disclosure"
    other = "other"


VALID_TRANSITIONS: dict[ObligationStatus, set[ObligationStatus]] = {
    ObligationStatus.pending:     {ObligationStatus.in_progress},
    ObligationStatus.in_progress: {ObligationStatus.submitted, ObligationStatus.pending},
    ObligationStatus.submitted:   {ObligationStatus.done, ObligationStatus.in_progress},
    ObligationStatus.done:        {ObligationStatus.in_progress},
}

NON_OVERDUE_STATUSES = {ObligationStatus.submitted, ObligationStatus.done}


class InvalidTransitionError(Exception):
    pass


class DocumentRequiredError(Exception):
    pass


def validate_transition(current: ObligationStatus, to_status: ObligationStatus) -> None:
    if to_status not in VALID_TRANSITIONS.get(current, set()):
        raise InvalidTransitionError(
            f"Cannot transition from {current.value} to {to_status.value}"
        )


def validate_document_gate(
    requires_document: bool,
    document_url: str | None,
    to_status: ObligationStatus,
) -> None:
    if to_status == ObligationStatus.submitted and requires_document and not document_url:
        raise DocumentRequiredError("Document required before submitting")


def is_overdue(due_date: date, status: ObligationStatus) -> bool:
    return due_date < date.today() and status not in NON_OVERDUE_STATUSES


def mask_tax_id(tax_id: str) -> str:
    return "••••" + tax_id[-4:]


def get_valid_transitions(current: ObligationStatus) -> list[ObligationStatus]:
    return list(VALID_TRANSITIONS.get(current, set()))
