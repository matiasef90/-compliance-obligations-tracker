# DECISIONS.md — Compliance Obligations Tracker

Registro de decisiones de arquitectura: qué se eligió, qué se descartó y por qué. Este documento se defiende en la entrega técnica.

---

## 1. Arquitectura general — separación de capas

### Backend: 4 capas estrictas

```
routes/          ← HTTP only: parsear request, llamar servicio, devolver response
services/        ← orquestación: coordina dominio + repos + transacción
repositories/    ← acceso a datos: SQL, ORM, sin lógica de negocio
domain/          ← lógica pura: máquina de estados, invariantes, overdue, máscaras
```

**Regla de dependencia:** las capas superiores dependen de las inferiores, nunca al revés. El dominio no importa nada de las capas de arriba. Un handler no toca un repo directamente.

**Por qué:** El enunciado lo exige explícitamente ("la regla no va en el handler"), pero más allá de eso: el dominio puro es testeable sin levantar HTTP ni base de datos. Si la máquina de estados vive en el handler, un test de transición inválida requiere levantar toda la app.

**Alternativa descartada — lógica en el handler:** Común en proyectos pequeños con FastAPI. Rápido de implementar pero no escalable y no testeable de forma aislada. Descartado.

**Alternativa descartada — lógica en el modelo ORM (Active Record):** Rails-style. Mezcla persistencia con dominio. Pydantic + SQLAlchemy no están diseñados para esto; crea acoplamiento fuerte entre el schema de DB y las reglas de negocio. Descartado.

---

### Frontend: Server Components por defecto, Client Components por excepción

**Regla:** Todo componente es Server Component a menos que necesite estado local o event handlers del browser.

Client Components usados solo en:
- `ObligationForm.tsx` — validación en tiempo real, estado de campos
- `TransitionButtons.tsx` — interactividad inmediata post-acción
- Filtro de status en dashboard — `useSearchParams`

**Mutaciones via Server Actions** (no fetch desde el cliente):
- Permite revalidación automática del cache de Next.js (`revalidatePath`)
- El formulario funciona sin JS en el cliente (progressive enhancement)
- No expone endpoints de mutación innecesariamente al browser

**Por qué no un API client en el cliente:** El enunciado pide Server Components por defecto. Hacer fetch desde el cliente requiere manejar loading/error manualmente con `useEffect` o librerías como SWR/React Query. Con Server Components el fetch ocurre en el servidor, el HTML llega listo, y solo se hidrata lo interactivo.

---

## 2. Máquina de estados

### Implementación

Tabla de transiciones válidas como constante inmutable en `domain/obligation.py`:

```python
VALID_TRANSITIONS: dict[ObligationStatus, set[ObligationStatus]] = {
    ObligationStatus.PENDING:      {ObligationStatus.IN_PROGRESS},
    ObligationStatus.IN_PROGRESS:  {ObligationStatus.SUBMITTED, ObligationStatus.PENDING},
    ObligationStatus.SUBMITTED:    {ObligationStatus.DONE, ObligationStatus.IN_PROGRESS},
    ObligationStatus.DONE:         {ObligationStatus.IN_PROGRESS},
}
```

Función pura que valida y lanza excepción de dominio si la transición es inválida:

```python
def validate_transition(current: ObligationStatus, to: ObligationStatus) -> None:
    if to not in VALID_TRANSITIONS.get(current, set()):
        raise InvalidTransitionError(current, to)
```

**Fuente de verdad: el backend.** El frontend recibe `valid_transitions: list[str]` en cada response y solo muestra los botones que corresponden. No reimplementa la tabla de transiciones.

**Por qué función pura y no método en el modelo:** Testeable sin instanciar nada. Sin side effects. La misma función sirve para validar y para derivar `valid_transitions` en el response.

**Alternativa descartada — enum con métodos (`can_transition_to`):** Mezcla dominio con el tipo. Más difícil de testear en aislamiento. Descartado.

**Alternativa descartada — librería de state machine (transitions, pytransitions):** Overhead innecesario para 4 estados y 6 transiciones. La tabla es más legible y explícita. Descartado.

---

## 3. Invariante documento-gated

### Regla

Si `requires_document = True`, la transición a `submitted` falla si no hay `document_url`.

### Dónde vive

En `domain/obligation.py`, función pura `validate_document_gate`, llamada desde el servicio en el mismo paso que `validate_transition`:

```python
def validate_document_gate(
    requires_document: bool,
    document_url: str | None,
    to: ObligationStatus,
) -> None:
    if requires_document and to == ObligationStatus.SUBMITTED and not document_url:
        raise DocumentRequiredError()
```

**Esta regla NO está en:**
- El handler HTTP (solo parsea y delega)
- El formulario del frontend (el botón puede estar disabled como UX, pero el backend rechaza independientemente)
- El modelo ORM

**Por qué:** Si la validación solo vive en el form del frontend, un request directo a la API la bypasea. La invariante debe ser inviolable a nivel de backend.

---

## 4. `overdue` — campo derivado, no estado

### Decisión

`overdue` **no se persiste**. Se calcula en runtime en la capa de servicio al construir el DTO de respuesta:

```python
def is_overdue(due_date: date, status: ObligationStatus) -> bool:
    return (
        date.today() > due_date
        and status not in {ObligationStatus.SUBMITTED, ObligationStatus.DONE}
    )
```

### Alternativas consideradas

| Alternativa | Pros | Contras | Decisión |
|---|---|---|---|
| Campo `overdue` en DB, actualizado por cron job | Filtrable directamente por SQL | Stale data entre ejecuciones; estado derivado convertido en estado persistido; requiere scheduler | Descartada |
| Computed column en PostgreSQL | Consistente; sin código extra | Acoplamiento al motor de DB; no portable; la lógica de negocio vive en SQL | Descartada |
| **Calculado en servicio al leer** | Siempre fresco; sin infraestructura extra; fuente de verdad clara | El filtro por `overdue` requiere WHERE sobre `due_date + status` | **Elegida** |
| Calculado en frontend | Simple | Duplica dominio; violación explícita del enunciado | Rechazada |

**Para filtrar por `overdue` en el dashboard:** la query usa `WHERE due_date < NOW() AND status NOT IN ('submitted', 'done')` directamente, sin necesitar el campo persistido.

---

## 5. Concurrencia — Optimistic Locking

### Escenario

Dos requests llegan simultáneamente para cambiar el estado de la misma obligación. Sin control de concurrencia, el segundo sobrescribe al primero silenciosamente (lost update).

### Decisión

Optimistic locking con campo `version INTEGER` en la tabla `obligations`.

**Flujo:**
1. El cliente lee la obligación y recibe `version: 3`
2. Al enviar una transición, incluye `version: 3` en el body
3. El backend ejecuta: `UPDATE obligations SET status=:new, version=4 WHERE id=:id AND version=3`
4. Si `rowcount == 0` → alguien más actualizó primero → HTTP 409 Conflict
5. El cliente recarga y reintenta con la versión nueva

### Alternativas consideradas

| Alternativa | Pros | Contras | Decisión |
|---|---|---|---|
| Sin control | Implementación mínima | Silent data corruption | Rechazada: dominio de alto cuidado |
| **Optimistic locking (`version`)** | Sin bloqueos; fácil de implementar; error explícito al cliente | El cliente debe manejar 409 y reintentar | **Elegida** |
| Pessimistic locking (`SELECT FOR UPDATE`) | Garantía fuerte; sin reintentos | Bloquea filas; peor throughput; riesgo de deadlock | Viable pero overkill |
| Event sourcing | Trazabilidad máxima; sin lost updates por diseño | Complejidad muy alta | Rechazada |

---

## 6. `companyTaxId` — dato sensible

### Reglas implementadas

1. **Almacenamiento:** plaintext en PostgreSQL (cifrado en tránsito vía TLS)
2. **Lectura:** enmascarado en TODOS los Pydantic response schemas → `••••6789`
3. **Logs:** excluido del middleware de logging; nunca aparece en trazas

### Implementación de máscara

Función pura en el dominio:
```python
def mask_tax_id(tax_id: str) -> str:
    if len(tax_id) <= 4:
        return "••••"
    return "••••" + tax_id[-4:]
```

Llamada exclusivamente en `ObligationService._to_dto()`. El response schema de Pydantic tiene `company_tax_id: str` pero el valor ya llega enmascarado del servicio. El campo raw jamás sale del servicio.

### Alternativas consideradas para almacenamiento

| Alternativa | Pros | Contras | Decisión |
|---|---|---|---|
| **Plaintext + máscara en lectura** | Simple; sin overhead | Si la DB se compromete, dato expuesto en claro | **Elegida para este scope** |
| Cifrado a nivel aplicación (AES-256) | Protección en reposo | Gestión de claves, rotación, overhead de descifrado | Mejora documentada para producción real |
| Cifrado a nivel columna (pgcrypto) | Transparente para la app | Depende del motor; complejidad de setup | Rechazada |

**Con más tiempo:** implementaría cifrado a nivel aplicación con clave en variable de entorno (o KMS en producción), y test que verifica que el valor en DB es opaco.

---

## 7. Audit Trail

### Decisión

Tabla separada `obligation_audit_log (id, obligation_id, from_status, to_status, changed_at)`. El insert ocurre **en la misma transacción** que el UPDATE de la obligación.

**Por qué misma transacción:** Si el log falla, el cambio de estado no se persiste. Si el cambio de estado falla, no queda registro huérfano. Consistencia garantizada sin lógica de compensación.

**Alternativa descartada — tabla de audit en transacción separada:** Riesgo de inconsistencia. Si la app cae entre el UPDATE y el INSERT del log, el historial queda incompleto. Descartado.

**Alternativa descartada — event bus / message queue:** Correcto para sistemas distribuidos. Overkill para este scope. Descartado.

---

## 8. Contrato de la API

### Endpoints

| Método | Ruta | Descripción | Código éxito |
|---|---|---|---|
| GET | `/obligations` | Listar todas (con filtros opcionales: `status`, `overdue`) | 200 |
| POST | `/obligations` | Crear obligación | 201 |
| GET | `/obligations/{id}` | Detalle de una obligación | 200 |
| PATCH | `/obligations/{id}` | Actualizar campos (sin cambiar estado) | 200 |
| DELETE | `/obligations/{id}` | Eliminar | 204 |
| POST | `/obligations/{id}/transition` | Cambiar estado | 200 |

### Response schema (todos los endpoints que devuelven una obligación)

```json
{
  "id": "uuid",
  "type": "annual_report",
  "title": "string",
  "description": "string | null",
  "status": "pending",
  "due_date": "2026-12-31",
  "owner": "string",
  "requires_document": true,
  "document_url": "string | null",
  "company_tax_id": "••••6789",
  "overdue": false,
  "version": 3,
  "valid_transitions": ["in_progress"],
  "audit_trail": [
    { "from_status": "pending", "to_status": "in_progress", "changed_at": "2026-06-26T10:00:00Z" }
  ],
  "created_at": "2026-06-26T10:00:00Z",
  "updated_at": "2026-06-26T10:00:00Z"
}
```

### Modelo de errores consistente

```json
{ "error": "INVALID_TRANSITION",  "detail": "Cannot transition from submitted to pending", "status": 422 }
{ "error": "DOCUMENT_REQUIRED",   "detail": "Document required before submitting",         "status": 422 }
{ "error": "CONFLICT",            "detail": "Obligation was modified concurrently",         "status": 409 }
{ "error": "NOT_FOUND",           "detail": "Obligation not found",                        "status": 404 }
{ "error": "VALIDATION_ERROR",    "detail": "...",                                         "status": 422 }
```

**Por qué `valid_transitions` en el response:** El frontend no reimplementa la tabla de transiciones. Recibe qué botones mostrar directamente del backend. Si la máquina de estados cambia, el frontend se actualiza automáticamente.

**Por qué endpoint de transición separado (`/transition`) en lugar de PATCH:** PATCH semántico podría aceptar cualquier valor de `status`, invitando a bypasear la máquina de estados. Un endpoint dedicado deja explícito que cambiar estado es una operación con reglas propias, no una edición de campo.

---

## 9. Stack — decisiones y alternativas

### Backend: FastAPI vs Node/TS

**Elegido: FastAPI.** Indicado como primera opción en el enunciado.

| | FastAPI | Node/TS |
|---|---|---|
| Validación | Pydantic v2 nativo | Zod (equivalente, pero desacoplado del ORM) |
| ORM | SQLAlchemy async (maduro) | Prisma / Drizzle (más ergonómicos, menos control) |
| Tipado | Python typing + Pydantic | TypeScript end-to-end (más consistente con frontend) |
| OpenAPI | Generado automáticamente | Manual o con librerías |

### Persistencia: PostgreSQL vs SQLite

**Elegido: PostgreSQL.** Recomendado en el enunciado. El optimistic locking con `rowcount` funciona igual en ambos, pero PostgreSQL es más representativo del entorno de producción real.

**SQLite hubiera sido aceptable** para simplificar el setup (sin docker-compose), documentado en README. No se eligió porque el enunciado recomienda PostgreSQL y el overhead de docker-compose es mínimo.

### Deployment: Vercel (frontend) + Render (backend + Postgres)

**Frontend → Vercel:** Zero config para Next.js App Router + Server Actions. Deploy automático desde GitHub.

**Backend → Render:** Soporta FastAPI vía Dockerfile, Postgres gestionado como add-on. Free tier suficiente para una prueba técnica.

**Variables de entorno necesarias:**
- En Render (backend): `DATABASE_URL` (provista automáticamente por el add-on de Postgres), `ALLOWED_ORIGINS` (URL de Vercel)
- En Vercel (frontend): `NEXT_PUBLIC_API_URL` (URL del servicio Render), `API_URL` (igual, para Server Components/Actions — sin exponer al browser)

**CORS:** El backend configura `ALLOWED_ORIGINS` desde variable de entorno. En desarrollo local acepta `http://localhost:3000`.

**Desarrollo local:** docker-compose levanta solo PostgreSQL. El backend corre con `uvicorn --reload` y el frontend con `next dev`. Ver sección de desarrollo local más abajo.

### Frontend: next-intl para i18n

**Elegido: next-intl.** Integración nativa con App Router de Next.js. Soporta Server Components (los mensajes se cargan en el servidor). Alternativa `react-i18next` requiere más setup para SSR y no tiene integración oficial con App Router.

---

## 10. Qué quedó afuera a propósito

| Feature | Razón |
|---|---|
| Auth / sesiones | Fuera del scope pedido; mencionado en README |
| Subida real de documentos (S3) | El enunciado permite mock de URL; la infra real requiere proveedor de storage |
| Paginación / búsqueda full-text | Stretch goal; la lógica de negocio está completa sin esto |
| CI (GitHub Actions) | Stretch goal |
| Logs estructurados (JSON) | La regla de no loguear taxId sí se implementa; el formato estructurado es stretch |
| Cifrado en reposo del taxId | Documentado como mejora; plaintext + máscara en lectura es suficiente para este scope |
| Notificaciones / recordatorios | Stretch goal |

---

## 11. Uso de IA

*Esta sección se completa durante la implementación.*

**Formato esperado:**
- Dónde ayudó sin corrección necesaria
- Dónde generó código que fue rechazado o corregido, con el ejemplo concreto y la razón
