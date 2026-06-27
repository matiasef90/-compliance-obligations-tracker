from datetime import date
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.domain.obligation import DocumentRequiredError, InvalidTransitionError, ObligationStatus
from app.repositories.obligation_repo import NotFoundError
from app.services.obligation_service import ObligationService


def make_mock_obligation(**overrides):
    o = MagicMock()
    o.id = "test-id"
    o.type = "annual_report"
    o.title = "Test"
    o.description = None
    o.status = "pending"
    o.due_date = date(2027, 1, 1)
    o.owner = "owner"
    o.requires_document = False
    o.document_url = None
    o.company_tax_id = "30-12345678-9"
    o.version = 1
    o.audit_logs = []
    o.created_at = MagicMock()
    o.updated_at = MagicMock()
    for k, v in overrides.items():
        setattr(o, k, v)
    return o


@pytest.fixture
def session():
    s = AsyncMock()
    s.commit = AsyncMock()
    return s


@pytest.fixture
def service(session):
    return ObligationService(session)


async def test_transition_invalid_raises_before_touching_repo(service):
    obligation = make_mock_obligation(status="pending")
    service._repo.get_by_id = AsyncMock(return_value=obligation)
    service._repo.update = AsyncMock()

    with pytest.raises(InvalidTransitionError):
        await service.transition_status("test-id", ObligationStatus.submitted, version=1)

    service._repo.update.assert_not_called()


async def test_transition_document_required_raises_before_touching_repo(service):
    obligation = make_mock_obligation(
        status="in_progress",
        requires_document=True,
        document_url=None,
    )
    service._repo.get_by_id = AsyncMock(return_value=obligation)
    service._repo.update = AsyncMock()

    with pytest.raises(DocumentRequiredError):
        await service.transition_status("test-id", ObligationStatus.submitted, version=1)

    service._repo.update.assert_not_called()


async def test_transition_success_logs_audit(service):
    obligation = make_mock_obligation(status="pending")
    updated = make_mock_obligation(status="in_progress", version=2)

    service._repo.get_by_id = AsyncMock(side_effect=[obligation, updated])
    service._repo.update = AsyncMock(return_value=updated)
    service._audit_repo.log = AsyncMock()

    await service.transition_status("test-id", ObligationStatus.in_progress, version=1)

    service._audit_repo.log.assert_called_once_with("test-id", "pending", "in_progress")


async def test_to_dto_masks_company_tax_id(service):
    obligation = make_mock_obligation(company_tax_id="30-12345678-9")

    dto = service._to_dto(obligation)

    assert dto.company_tax_id == "••••78-9"
    assert "12345678" not in dto.company_tax_id


async def test_get_obligation_raises_not_found_when_missing(service):
    service._repo.get_by_id = AsyncMock(return_value=None)

    with pytest.raises(NotFoundError):
        await service.get_obligation("nonexistent-id")
