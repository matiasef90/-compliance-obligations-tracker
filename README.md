# Compliance Obligations Tracker

**Demo en vivo:** [compliance-obligations-tracker.vercel.app](https://compliance-obligations-tracker.vercel.app/en/obligations)

Sistema de gestión de obligaciones de compliance para empresas. Permite registrar, hacer seguimiento y auditar presentaciones regulatorias, vencimientos y documentación asociada.

### ¿Qué resuelve?

Las áreas de compliance manejan decenas de obligaciones recurrentes (informes anuales, declaraciones impositivas, renovaciones de licencias) con fechas de vencimiento distintas, documentos requeridos y múltiples responsables. Sin una herramienta centralizada, es fácil perder plazos o no tener trazabilidad de quién hizo qué y cuándo.

Este sistema permite:
- Crear y gestionar obligaciones con estado, responsable y fecha de vencimiento
- Seguir un flujo de estados definido: `pendiente → en curso → presentado → completado`
- Adjuntar documentos requeridos antes de poder presentar una obligación
- Ver en tiempo real qué obligaciones están vencidas o próximas a vencer
- Consultar el historial de cambios de estado de cada obligación
- Proteger datos sensibles (CUIT/RUT) con cifrado AES-256-GCM en reposo

---

## Stack tecnológico

- **Backend:** FastAPI + Pydantic v2 + SQLAlchemy async + Alembic + PostgreSQL 15
- **Frontend:** Next.js 15 (App Router) + TypeScript + Tailwind CSS + next-intl (i18n)
- **Infra local:** Docker Compose (PostgreSQL + backend + frontend en un solo comando)
- **Deploy:** Vercel (frontend) + Render (backend + Postgres)

---

## Cómo ejecutar el proyecto

### Opción A — Docker (recomendada)

Levanta PostgreSQL, backend y frontend en un solo comando. Las migraciones se ejecutan automáticamente al iniciar.

```bash
# Configurar la clave de cifrado (solo la primera vez)
cd backend
cp .env.example .env
# Generar la clave y copiar el valor en ENCRYPTION_KEY dentro de .env:
python -c "import os,base64; print(base64.b64encode(os.urandom(32)).decode())"

# Levantar todos los servicios
cd ..
docker-compose up --build
```

| Servicio  | URL                        |
|-----------|----------------------------|
| Frontend  | http://localhost:3000      |
| Backend   | http://localhost:8000      |
| API Docs  | http://localhost:8000/docs |

Los archivos fuente están montados como volúmenes: los cambios en `backend/app/` y `frontend/` se reflejan sin necesidad de reconstruir la imagen.

---

### Opción B — Ejecución manual (sin Docker)

#### 1. Base de datos

```bash
docker-compose up -d postgres
```

#### 2. Backend

```bash
cd backend
cp .env.example .env
# Generar la clave y copiar el valor en ENCRYPTION_KEY dentro de .env:
python -c "import os,base64; print(base64.b64encode(os.urandom(32)).decode())"

uv sync
uv run alembic upgrade head
uv run uvicorn app.main:app --reload
```

API disponible en `http://localhost:8000` — documentación interactiva en `http://localhost:8000/docs`.

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

Para poblar la base de datos con 100 obligaciones de ejemplo con estados y auditoría coherentes:

```bash
# Con Docker (una vez que los servicios estén corriendo):
docker-compose exec backend python scripts/populate_db.py --clear

# Sin Docker (con el entorno virtual activo):
cd backend && uv run python scripts/populate_db.py --clear
```

---

## Decisiones de arquitectura

Ver [DECISIONS.md](./DECISIONS.md) para el detalle de cada decisión de diseño: separación de capas, máquina de estados, cifrado, optimistic locking, y más.

---

## Qué quedó fuera del alcance

- Autenticación y gestión de sesiones
- Subida real de documentos (actualmente se simula con una URL de mock)
- CI/CD automatizado (GitHub Actions)

## Mejoras para una versión productiva

- Rotación de claves para `companyTaxId` (migrar de env var a KMS)
- Autenticación con JWT o sesiones
- Subida de documentos a S3/R2
- Pipeline de CI con lint + tests en backend y frontend
