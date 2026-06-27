from datetime import date, timedelta

import pytest

from app.domain.obligation import (
    DocumentRequiredError,
    InvalidTransitionError,
    ObligationStatus,
    get_valid_transitions,
    is_overdue,
    mask_tax_id,
    validate_document_gate,
    validate_transition,
)

yesterday = date.today() - timedelta(days=1)
tomorrow = date.today() + timedelta(days=1)


# --- validate_transition ---

def test_valid_transition_pending_to_in_progress():
    validate_transition(ObligationStatus.pending, ObligationStatus.in_progress)


def test_valid_transition_in_progress_to_submitted():
    validate_transition(ObligationStatus.in_progress, ObligationStatus.submitted)


def test_valid_transition_in_progress_to_pending():
    validate_transition(ObligationStatus.in_progress, ObligationStatus.pending)


def test_valid_transition_submitted_to_done():
    validate_transition(ObligationStatus.submitted, ObligationStatus.done)


def test_valid_transition_submitted_to_in_progress():
    validate_transition(ObligationStatus.submitted, ObligationStatus.in_progress)


def test_valid_transition_done_to_in_progress():
    validate_transition(ObligationStatus.done, ObligationStatus.in_progress)


def test_invalid_transition_pending_to_submitted():
    with pytest.raises(InvalidTransitionError):
        validate_transition(ObligationStatus.pending, ObligationStatus.submitted)


def test_invalid_transition_pending_to_done():
    with pytest.raises(InvalidTransitionError):
        validate_transition(ObligationStatus.pending, ObligationStatus.done)


def test_invalid_transition_done_to_pending():
    with pytest.raises(InvalidTransitionError):
        validate_transition(ObligationStatus.done, ObligationStatus.pending)


def test_invalid_transition_done_to_submitted():
    with pytest.raises(InvalidTransitionError):
        validate_transition(ObligationStatus.done, ObligationStatus.submitted)


def test_invalid_transition_submitted_to_pending():
    with pytest.raises(InvalidTransitionError):
        validate_transition(ObligationStatus.submitted, ObligationStatus.pending)


# --- validate_document_gate ---

def test_document_gate_blocks_submit_when_required_and_missing():
    with pytest.raises(DocumentRequiredError):
        validate_document_gate(
            requires_document=True,
            document_url=None,
            to_status=ObligationStatus.submitted,
        )


def test_document_gate_allows_submit_when_required_and_present():
    validate_document_gate(
        requires_document=True,
        document_url="https://example.com/doc.pdf",
        to_status=ObligationStatus.submitted,
    )


def test_document_gate_allows_submit_when_not_required():
    validate_document_gate(
        requires_document=False,
        document_url=None,
        to_status=ObligationStatus.submitted,
    )


def test_document_gate_does_not_block_non_submit_transitions():
    validate_document_gate(
        requires_document=True,
        document_url=None,
        to_status=ObligationStatus.in_progress,
    )


# --- is_overdue ---

def test_overdue_when_past_due_and_pending():
    assert is_overdue(yesterday, ObligationStatus.pending) is True


def test_overdue_when_past_due_and_in_progress():
    assert is_overdue(yesterday, ObligationStatus.in_progress) is True


def test_not_overdue_when_submitted_even_if_past_due():
    assert is_overdue(yesterday, ObligationStatus.submitted) is False


def test_not_overdue_when_done_even_if_past_due():
    assert is_overdue(yesterday, ObligationStatus.done) is False


def test_not_overdue_when_due_in_future():
    assert is_overdue(tomorrow, ObligationStatus.pending) is False


# --- mask_tax_id ---

def test_mask_tax_id_shows_last_four_digits():
    assert mask_tax_id("12345678") == "••••5678"


def test_mask_tax_id_works_with_any_length():
    assert mask_tax_id("30-12345678-9") == "••••78-9"


# --- get_valid_transitions ---

def test_get_valid_transitions_from_pending():
    assert get_valid_transitions(ObligationStatus.pending) == [ObligationStatus.in_progress]


def test_get_valid_transitions_from_in_progress():
    result = get_valid_transitions(ObligationStatus.in_progress)
    assert set(result) == {ObligationStatus.submitted, ObligationStatus.pending}


def test_get_valid_transitions_from_done():
    assert get_valid_transitions(ObligationStatus.done) == [ObligationStatus.in_progress]
