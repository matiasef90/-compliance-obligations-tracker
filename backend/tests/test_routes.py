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


async def test_list_obligations_returns_paginated_response(client):
    # Crear 3 obligaciones para tener datos
    for i in range(3):
        await client.post("/obligations", json={**OBLIGATION_PAYLOAD, "title": f"Oblig {i}", "due_date": f"2027-0{i+1}-01"})

    response = await client.get("/obligations?page=1&limit=2")

    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data
    assert "page" in data
    assert "limit" in data
    assert "pages" in data
    assert data["page"] == 1
    assert data["limit"] == 2
    assert len(data["items"]) <= 2


async def test_list_obligations_filter_by_status(client):
    await client.post("/obligations", json=OBLIGATION_PAYLOAD)

    response = await client.get("/obligations?status=pending")

    assert response.status_code == 200
    data = response.json()
    assert all(item["status"] == "pending" for item in data["items"])


async def test_list_obligations_filter_by_search(client):
    await client.post("/obligations", json={**OBLIGATION_PAYLOAD, "title": "Informe fiscal único"})

    response = await client.get("/obligations?search=fiscal")

    assert response.status_code == 200
    data = response.json()
    assert any("fiscal" in item["title"].lower() for item in data["items"])


async def test_get_stats_returns_counts(client):
    await client.post("/obligations", json=OBLIGATION_PAYLOAD)

    response = await client.get("/obligations/stats")

    assert response.status_code == 200
    data = response.json()
    assert "total" in data
    assert "overdue" in data
    assert "upcoming_7_days" in data
    assert "by_status" in data
    assert data["total"] >= 1
    assert data["by_status"]["pending"] >= 1
