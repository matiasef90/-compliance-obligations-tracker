# Compliance Obligations Tracker

Tracker de obligaciones de compliance para empresas: vencimientos, presentaciones y documentación.

## Stack

- **Backend:** FastAPI + Pydantic v2 + PostgreSQL 15 + SQLAlchemy async
- **Frontend:** Next.js 14 (App Router) + TypeScript strict + Tailwind CSS
- **Infra local:** docker-compose (solo PostgreSQL)
- **Deploy:** Vercel (frontend) + Render (backend + Postgres)

## Levantar en local

### 1. Base de datos

```bash
docker-compose up -d
```

### 2. Backend

```bash
cd backend
cp .env.example .env
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
alembic upgrade head
uvicorn app.main:app --reload
```

API disponible en `http://localhost:8000`. Docs en `http://localhost:8000/docs`.

### 3. Frontend

```bash
cd frontend
cp .env.local.example .env.local
npm install
npm run dev
```

Frontend disponible en `http://localhost:3000`.

## Decisiones de arquitectura

Ver [DECISIONS.md](./DECISIONS.md).

## Qué quedó afuera

- Auth / sesiones
- Subida real de documentos (mock de URL)
- Paginación / búsqueda full-text
- CI (GitHub Actions)
- Cifrado en reposo del `companyTaxId`

## Con más tiempo

- Cifrado a nivel aplicación para `companyTaxId` (AES-256 con clave en KMS)
- Auth con JWT o sesiones
- Subida real de documentos a S3/R2
- CI con lint + tests en ambas capas
- Paginación y búsqueda
