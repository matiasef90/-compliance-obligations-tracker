from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.schemas.obligation import (
    ObligationCreate,
    ObligationListResponse,
    ObligationResponse,
    ObligationUpdate,
    TransitionRequest,
)
from app.services.obligation_service import ObligationDTO, ObligationService

router = APIRouter(prefix="/obligations", tags=["obligations"])


def _dto_to_response(dto: ObligationDTO) -> ObligationResponse:
    return ObligationResponse(
        id=dto.id,
        type=dto.type,
        title=dto.title,
        description=dto.description,
        status=dto.status,
        due_date=dto.due_date,
        owner=dto.owner,
        requires_document=dto.requires_document,
        document_url=dto.document_url,
        company_tax_id=dto.company_tax_id,
        version=dto.version,
        overdue=dto.overdue,
        valid_transitions=dto.valid_transitions,
        audit_trail=[
            {"from_status": a.from_status, "to_status": a.to_status, "changed_at": a.changed_at}
            for a in dto.audit_trail
        ],
        created_at=dto.created_at,
        updated_at=dto.updated_at,
    )


@router.get("", response_model=ObligationListResponse)
async def list_obligations(session: AsyncSession = Depends(get_session)) -> ObligationListResponse:
    service = ObligationService(session)
    items = await service.list_obligations()
    return ObligationListResponse(items=[_dto_to_response(i) for i in items], total=len(items))


@router.post("", response_model=ObligationResponse, status_code=status.HTTP_201_CREATED)
async def create_obligation(
    body: ObligationCreate, session: AsyncSession = Depends(get_session)
) -> ObligationResponse:
    service = ObligationService(session)
    dto = await service.create_obligation(body.model_dump())
    return _dto_to_response(dto)


@router.get("/{id}", response_model=ObligationResponse)
async def get_obligation(id: str, session: AsyncSession = Depends(get_session)) -> ObligationResponse:
    service = ObligationService(session)
    dto = await service.get_obligation(id)
    return _dto_to_response(dto)


@router.patch("/{id}", response_model=ObligationResponse)
async def update_obligation(
    id: str, body: ObligationUpdate, session: AsyncSession = Depends(get_session)
) -> ObligationResponse:
    service = ObligationService(session)
    data = {k: v for k, v in body.model_dump().items() if v is not None and k != "version"}
    dto = await service.update_obligation(id, data, body.version)
    return _dto_to_response(dto)


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_obligation(id: str, session: AsyncSession = Depends(get_session)) -> Response:
    service = ObligationService(session)
    await service.delete_obligation(id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{id}/transition", response_model=ObligationResponse)
async def transition_obligation(
    id: str, body: TransitionRequest, session: AsyncSession = Depends(get_session)
) -> ObligationResponse:
    service = ObligationService(session)
    dto = await service.transition_status(id, body.to_status, body.version)
    return _dto_to_response(dto)
