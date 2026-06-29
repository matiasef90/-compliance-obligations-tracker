# DECISIONS.md — Compliance Obligations Tracker

Registro de decisiones de arquitectura: qué se eligió, qué se descartó y por qué.

---

## 1. Separación de capas

**Backend — 4 capas estrictas:**
```
routes/        ← HTTP: parsear request y devolver response
services/      ← orquestación: coordina dominio, repos y transacción
repositories/  ← acceso a datos, sin lógica de negocio
domain/        ← lógica pura: máquina de estados, invariantes, masks
```
Las capas superiores dependen de las inferiores, nunca al revés. El dominio no importa nada de arriba. Un handler no toca un repo directamente.

**Alternativas descartadas:** lógica en el handler (no testeable en aislamiento), Active Record (mezcla persistencia con dominio).

**Frontend — Server Components por defecto, Client Components solo donde hay estado local o event handlers del browser.** Mutaciones vía Server Actions (`revalidatePath` automático, funciona sin JS, no expone endpoints innecesarios).

---

## 2. Máquina de estados

Tabla de transiciones como constante inmutable + función pura `validate_transition` en `domain/obligation.py`. El frontend recibe `valid_transitions` en cada response y no reimplementa la tabla.

**Alternativas descartadas:** métodos en el enum (mezcla dominio con tipo), librerías de state machine (overkill para 4 estados).

---

## 3. Invariante documento-gated

Si `requires_document = True`, la transición a `submitted` falla sin `document_url`. La validación vive en el dominio (`validate_document_gate`), no en el handler ni en el frontend — un request directo a la API no puede bypassearla.

---

## 4. `overdue` — campo derivado

No se persiste. Se calcula en el servicio al construir el DTO: `date.today() > due_date AND status NOT IN (submitted, done)`. El filtro usa `WHERE due_date < NOW() AND status NOT IN (...)` directamente en SQL.

**Alternativas descartadas:** campo en DB con cron job (stale data, requiere scheduler), computed column PostgreSQL (acoplado al motor), calculado en frontend (duplica dominio).

---

## 5. Concurrencia — Optimistic Locking

Campo `version INTEGER` en la tabla. El UPDATE incluye `WHERE version = :expected`; si `rowcount == 0` → HTTP 409. El cliente reintenta con la versión nueva.

**Alternativas descartadas:** sin control (silent data corruption), `SELECT FOR UPDATE` (bloqueos, deadlock risk), event sourcing (complejidad alta).

---

## 6. `companyTaxId` — cifrado en reposo

AES-256-GCM con nonce aleatorio de 12 bytes por escritura. Módulo puro `app/crypto.py` (sin dependencias de framework). La clave vive en `ENCRYPTION_KEY` (env var, 32 bytes en base64).

El repositorio cifra al escribir y descifra al leer. El servicio solo ve plaintext y aplica la máscara `••••6789`. Las rutas y schemas no saben que el campo está cifrado.

**Por qué en el repositorio y no en TypeDecorator:** el TypeDecorator acopla la lógica cripto a SQLAlchemy. Con este enfoque, si se cambia el ORM, `crypto.py` no se toca.

**AAD diferido:** el ciphertext no está vinculado a la fila (sin AAD). Se implementará junto con la migración a KMS. El riesgo (ciphertext swapping) requiere acceso de escritura directo a la DB.

---

## 7. Audit trail

Tabla separada `obligation_audit_log`. El INSERT ocurre en la misma transacción que el UPDATE de estado: si el log falla, el cambio no se persiste; si el cambio falla, no queda registro huérfano.

**Alternativas descartadas:** transacción separada (riesgo de inconsistencia), event bus (overkill).

---

## 8. Contrato de la API

| Método | Ruta | Código |
|---|---|---|
| GET | `/obligations` | 200 |
| POST | `/obligations` | 201 |
| GET | `/obligations/{id}` | 200 |
| PATCH | `/obligations/{id}` | 200 |
| DELETE | `/obligations/{id}` | 204 |
| POST | `/obligations/{id}/transition` | 200 |
| GET | `/obligations/stats` | 200 |

Modelo de errores: `{ "error": "ERROR_CODE", "detail": "...", "status": N }`.

`valid_transitions` en cada response: el frontend no reimplementa la tabla de transiciones. Endpoint `/transition` separado de PATCH para que cambiar estado sea una operación explícita con sus propias reglas.

`/stats` separado de la lista paginada: los KPIs son globales e independientes del filtro activo.

---

## 9. Stack

| Decisión | Elegido | Por qué |
|---|---|---|
| Backend | FastAPI + Pydantic v2 + SQLAlchemy async | Primera opción del enunciado; OpenAPI automático |
| Base de datos | PostgreSQL 15 | Recomendado en el enunciado; más representativo que SQLite |
| Frontend | Next.js 15 App Router | Server Components + Server Actions nativos |
| i18n | next-intl | Integración nativa con App Router; soporta Server Components |
| Deploy | Vercel (frontend) + Render (backend) | Zero config para Next.js; Render soporta FastAPI vía Dockerfile |

---

## 10. Uso de IA

La IA generó la estructura inicial y se usó en iteraciones de code review. Las correcciones más relevantes aplicadas sobre el código generado:

| # | Componente | Problema | Fix |
|---|---|---|---|
| 1 | `ObligationsList` | `<Link>` envolviendo `<tr>` es HTML inválido | `onClick` + `router.push()` sobre el `<tr>` |
| 2 | `LocaleSwitcher` | `usePathname` de `next/navigation` no incluye el prefijo de locale en next-intl v4 | Migrar a `usePathname`/`useRouter` de `@/i18n/navigation` (API oficial de next-intl) |
| 3 | `TransitionButtons` | `isPending` volvía a `false` con `version` obsoleto antes del re-render del RSC | Agregar `router.refresh()` en el branch de éxito del `startTransition` |
| 4 | `StatusFilter` | `useSearchParams` sin `<Suspense>` rompe el build SSR de Next.js | Envolver en `<Suspense fallback={null}>` |
| 5 | `StatusCycleCard` | Stale closure en `setInterval` con `pinned` en React Strict Mode | `useRef` para el timer + `pinnedRef` sincrónico |
| 6 | `ObligationsFilters` | Debounce reiniciaba al paginar porque `searchParams` era dependencia del efecto | Patrón `searchParamsRef` como proxy sincrónico |
| 7 | `createObligation` | `data.detail` de FastAPI es array en errores de validación → `[object Object]` | Leer `data.error ?? data.detail ?? fallback` |
| 8 | `[id]/page.tsx` | 404 y 5xx ambos mostraban `NotFound` | Discriminar: solo 404 → `notFound()`, resto re-lanza al error boundary |
| 9 | `new/page.tsx` | `useTranslations` (hook cliente) usado en Server Component | Reemplazar por `await getTranslations({ locale })` |
| 10 | `[id]/page.tsx` | Dos `getTranslations` secuenciales | `Promise.all` para ejecutarlos en paralelo |

---

## 11. Decisiones y cambios solicitados durante el proyecto

### Decisiones elegidas entre alternativas

| Decisión | Alternativa considerada | Elegida | Razón |
|---|---|---|---|
| Clave de cifrado | Archivo de secrets, KMS | Variable de entorno | Adecuado para el scope; KMS documentado como mejora productiva |
| Cifrado en repositorio vs TypeDecorator | TypeDecorator de SQLAlchemy | Módulo puro en repo | Portabilidad: si cambia el ORM, `crypto.py` no se toca |
| AAD en cifrado | Implementar ahora | Diferir con decisión documentada | Requiere acceso de escritura a DB (compromiso ya severo); se implementa con KMS |

### Cambios solicitados

| Cambio | Descripción |
|---|---|
| Cifrado de `companyTaxId` | AES-256-GCM en capa de repositorio, módulo puro `crypto.py` |
| Docker full-stack | `docker-compose` con PostgreSQL + backend + frontend; migraciones automáticas al arrancar |
| Script de datos de prueba | `scripts/populate_db.py`: 100 obligaciones con estados aleatorios e historial coherente |
| README | Overview del proyecto + instrucciones Docker + redacción clara y consistente en español |
| Manejo de errores granular | `CryptoError`, `PersistenceError`, handlers HTTP para ambos siguiendo contrato `{error, detail, status}` |
