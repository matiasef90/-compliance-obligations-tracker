import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from app.config import settings
from app.db.session import get_session
from app.main import app

engine = create_async_engine(settings.database_url, echo=False, poolclass=NullPool)
TestSessionLocal = async_sessionmaker(engine, expire_on_commit=False)

OBLIGATION_PAYLOAD = {
    "type": "annual_report",
    "title": "Reporte Anual Test",
    "due_date": "2027-06-30",
    "owner": "tester",
    "company_tax_id": "30-99999999-9",
}


@pytest.fixture
async def client():
    async def override_session():
        async with TestSessionLocal() as session:
            yield session

    app.dependency_overrides[get_session] = override_session
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c
    app.dependency_overrides.clear()


async def test_create_obligation_returns_201_with_masked_tax_id(client):
    response = await client.post("/obligations", json=OBLIGATION_PAYLOAD)

    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "Reporte Anual Test"
    assert data["status"] == "pending"
    assert data["company_tax_id"] == "••••99-9"
    assert data["overdue"] is False
    assert data["valid_transitions"] == ["in_progress"]
    assert data["audit_trail"] == []


async def test_transition_invalid_returns_422_with_error_code(client):
    create = await client.post("/obligations", json=OBLIGATION_PAYLOAD)
    obligation_id = create.json()["id"]

    response = await client.post(
        f"/obligations/{obligation_id}/transition",
        json={"to_status": "submitted", "version": 1},
    )

    assert response.status_code == 422
    assert response.json()["error"] == "INVALID_TRANSITION"


async def test_transition_stale_version_returns_409(client):
    create = await client.post("/obligations", json=OBLIGATION_PAYLOAD)
    obligation_id = create.json()["id"]

    await client.post(
        f"/obligations/{obligation_id}/transition",
        json={"to_status": "in_progress", "version": 1},
    )

    response = await client.post(
        f"/obligations/{obligation_id}/transition",
        json={"to_status": "submitted", "version": 1},
    )

    assert response.status_code == 409
    assert response.json()["error"] == "CONFLICT"
