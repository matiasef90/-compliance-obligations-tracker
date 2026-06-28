from fastapi import APIRouter, Depends, File, Query, Response, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.domain.obligation import ObligationStatus
from app.schemas.obligation import (
    ObligationCreate,
    ObligationListResponse,
    ObligationResponse,
    ObligationStatsResponse,
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


@router.get("/stats", response_model=ObligationStatsResponse)
async def get_stats(session: AsyncSession = Depends(get_session)) -> ObligationStatsResponse:
    service = ObligationService(session)
    dto = await service.get_stats()
    return ObligationStatsResponse(
        total=dto.total,
        overdue=dto.overdue,
        upcoming_7_days=dto.upcoming_7_days,
        by_status=dto.by_status,
    )


@router.get("", response_model=ObligationListResponse)
async def list_obligations(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=10, ge=1, le=100),
    status: ObligationStatus | None = Query(default=None),
    search: str | None = Query(default=None, min_length=1),
    session: AsyncSession = Depends(get_session),
) -> ObligationListResponse:
    service = ObligationService(session)
    result = await service.list_obligations(
        page=page,
        limit=limit,
        status=status.value if status else None,
        search=search,
    )
    return ObligationListResponse(
        items=[_dto_to_response(i) for i in result.items],
        total=result.total,
        page=result.page,
        limit=result.limit,
        pages=result.pages,
    )


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


@router.post("/{id}/upload-document", response_model=ObligationResponse)
async def upload_document(
    id: str,
    file: UploadFile = File(...),
    session: AsyncSession = Depends(get_session),
) -> ObligationResponse:
    service = ObligationService(session)
    dto = await service.upload_document(id)
    return _dto_to_response(dto)
