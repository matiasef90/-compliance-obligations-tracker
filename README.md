# Compliance Obligations Tracker

Tracker de obligaciones de compliance para empresas: vencimientos, presentaciones y documentación.

## Stack

- **Backend:** FastAPI + Pydantic v2 + PostgreSQL 15 + SQLAlchemy async + Alembic
- **Frontend:** Next.js 15 (App Router) + TypeScript strict + Tailwind CSS + next-intl (i18n)
- **Infra local:** docker-compose (PostgreSQL + backend + frontend)
- **Deploy:** Vercel (frontend) + Render (backend + Postgres)

## Levantar en local

### Opción A — Docker (recomendada)

Levanta PostgreSQL, backend y frontend en un solo comando. Las migraciones corren automáticamente al arrancar.

```bash
# Primera vez: configurar la clave de cifrado
cd backend
cp .env.example .env
# Editar .env y completar ENCRYPTION_KEY con el valor generado por:
python -c "import os,base64; print(base64.b64encode(os.urandom(32)).decode())"

# Levantar todo
cd ..
docker-compose up --build
```

| Servicio  | URL                          |
|-----------|------------------------------|
| Frontend  | http://localhost:3000        |
| Backend   | http://localhost:8000        |
| API Docs  | http://localhost:8000/docs   |

Los archivos fuente están montados como volúmenes — los cambios en `backend/app/` y `frontend/` se reflejan sin rebuild.

---

### Opción B — Manual (sin Docker)

#### 1. Base de datos

```bash
docker-compose up -d postgres
```

#### 2. Backend

```bash
cd backend
cp .env.example .env
# Completar ENCRYPTION_KEY en .env con el valor generado por:
python -c "import os,base64; print(base64.b64encode(os.urandom(32)).decode())"

uv sync
uv run alembic upgrade head
uv run uvicorn app.main:app --reload
```

API disponible en `http://localhost:8000`. Docs en `http://localhost:8000/docs`.

#### 3. Frontend

```bash
cd frontend
cp .env.local.example .env.local
pnpm install
pnpm dev
```

Frontend disponible en `http://localhost:3000`.

---

### Datos de prueba

```bash
# Con Docker (una vez levantado):
docker-compose exec backend python scripts/populate_db.py --clear

# Manual (con venv activo):
cd backend && python scripts/populate_db.py --clear
```

## Decisiones de arquitectura

Ver [DECISIONS.md](./DECISIONS.md).

## Qué quedó afuera

- Auth / sesiones
- Subida real de documentos (mock de URL)
- CI (GitHub Actions)

## Con más tiempo

- Key rotation para `companyTaxId` (actualmente AES-256-GCM con clave en env var; migrar a KMS)
- Auth con JWT o sesiones
- Subida real de documentos a S3/R2
- CI con lint + tests en ambas capas
