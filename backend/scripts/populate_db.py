"""
Populate the DB with 100 sample obligations.

States are random; audit trail is consistent with the state history.

Usage (from backend/ with venv active):
    python scripts/populate_db.py
    python scripts/populate_db.py --count 50
    python scripts/populate_db.py --clear   # truncate first, then populate
"""
import argparse
import asyncio
import random
import sys
from datetime import date, timedelta

from sqlalchemy import text
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.config import settings
from app.db.models import ObligationAuditLog
from app.repositories.obligation_repo import ObligationRepo

# ---------------------------------------------------------------------------
# Sample data pools
# ---------------------------------------------------------------------------

TYPES = ["annual_report", "tax_filing", "audit", "regulatory_disclosure", "other"]
OWNERS = [
    "María García", "Carlos López", "Ana Martínez", "Juan Rodríguez",
    "Laura Sánchez", "Pedro González", "Sofía Fernández", "Diego Torres",
    "Valentina Díaz", "Martín Ruiz",
]
TITLES = [
    "Presentación DDJJ Ganancias",
    "Informe anual de cumplimiento",
    "Auditoría externa Q{q}",
    "Declaración IVA {month}",
    "Reporte regulatorio semestral",
    "Balance de cierre ejercicio {year}",
    "Presentación ante AFIP",
    "Informe de solvencia",
    "Declaración de bienes {year}",
    "Auditoría interna {q}T",
    "Reporte de facturación mensual",
    "Cumplimiento normativa {reg}",
    "Presentación CNV trimestral",
    "Informe ESG anual",
    "Declaración jurada de ingresos",
]
REGULATIONS = ["SOX", "BCRA-A6938", "CNV-NT839", "UIF-RG229", "IGJ-2024"]
COMPANY_TAX_IDS = [
    "20-12345678-9", "23-87654321-4", "30-99999999-9", "27-11111111-3",
    "20-22222222-5", "30-33333333-7", "23-44444444-1", "27-55555555-2",
    "20-66666666-8", "30-77777777-6", "23-88888888-0", "27-99999900-4",
    "20-10101010-1", "30-20202020-5", "23-30303030-9",
]

# Transition path to reach each final status
TRANSITION_PATHS: dict[str, list[tuple[str, str]]] = {
    "pending":     [],
    "in_progress": [("pending", "in_progress")],
    "submitted":   [("pending", "in_progress"), ("in_progress", "submitted")],
    "done":        [("pending", "in_progress"), ("in_progress", "submitted"), ("submitted", "done")],
}

# Weighted distribution: (status, weight)
STATUS_WEIGHTS = [
    ("pending", 20),
    ("in_progress", 30),
    ("submitted", 25),
    ("done", 25),
]
STATUSES = [s for s, w in STATUS_WEIGHTS for _ in range(w)]


def random_title() -> str:
    tpl = random.choice(TITLES)
    return tpl.format(
        q=random.randint(1, 4),
        month=random.choice(["enero", "marzo", "junio", "septiembre", "diciembre"]),
        year=random.choice([2024, 2025, 2026]),
        reg=random.choice(REGULATIONS),
    )


def random_due_date() -> date:
    today = date.today()
    delta = random.randint(-180, 365)
    return today + timedelta(days=delta)


def build_obligation(i: int) -> dict:
    status = random.choice(STATUSES)
    requires_doc = random.random() < 0.4
    # For submitted/done, if requires_doc, we need a document_url
    needs_url = requires_doc and status in ("submitted", "done")
    return {
        "type": random.choice(TYPES),
        "title": f"{random_title()} #{i:03d}",
        "description": None if random.random() < 0.5 else f"Descripción de la obligación {i}",
        "status": status,
        "due_date": random_due_date(),
        "owner": random.choice(OWNERS),
        "requires_document": requires_doc,
        "document_url": f"http://localhost:8000/static/mock-docs/doc{random.randint(1,4)}.png" if needs_url else None,
        "company_tax_id": random.choice(COMPANY_TAX_IDS),
        "version": len(TRANSITION_PATHS[status]) + 1,
    }


async def populate(count: int, clear: bool) -> None:
    engine = create_async_engine(settings.database_url, echo=False)
    SessionLocal = async_sessionmaker(engine, expire_on_commit=False)

    async with SessionLocal() as session:
        if clear:
            await session.execute(text(
                "TRUNCATE TABLE obligation_audit_log, obligations RESTART IDENTITY CASCADE"
            ))
            await session.commit()
            print("DB truncated.")

        repo = ObligationRepo(session)
        created = 0
        for i in range(1, count + 1):
            data = build_obligation(i)
            status = data["status"]
            transitions = TRANSITION_PATHS[status]

            # Use repo.create() so encryption is handled automatically
            obl = await repo.create({
                "type": data["type"],
                "title": data["title"],
                "description": data["description"],
                "status": data["status"],
                "due_date": data["due_date"],
                "owner": data["owner"],
                "requires_document": data["requires_document"],
                "document_url": data["document_url"],
                "company_tax_id": data["company_tax_id"],
                "version": data["version"],
            })

            for from_s, to_s in transitions:
                log = ObligationAuditLog(
                    obligation_id=obl.id,
                    from_status=from_s,
                    to_status=to_s,
                )
                session.add(log)

            created += 1
            if created % 10 == 0:
                print(f"  {created}/{count} obligaciones creadas...")

        await session.commit()

    await engine.dispose()
    print(f"\nListo: {count} obligaciones insertadas.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Populate DB with sample obligations")
    parser.add_argument("--count", type=int, default=100, help="Number of obligations to create")
    parser.add_argument("--clear", action="store_true", help="Truncate tables before populating")
    args = parser.parse_args()

    asyncio.run(populate(args.count, args.clear))
