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

La IA (Claude Sonnet) se usó para generar la estructura inicial de todos los módulos — backend y frontend — y para iterar sobre el código en sesiones de code review. A continuación se detallan los casos donde el código generado fue aceptado sin cambios, y los casos donde fue rechazado o corregido, con la razón concreta.

---

### Lo que funcionó sin corrección

- Estructura de capas del backend (routes / services / repositories / domain) y separación de responsabilidades entre ellas.
- Implementación de la máquina de estados como tabla de transiciones + función pura `validate_transition`.
- Función `mask_tax_id` y su ubicación en el dominio.
- Cálculo de `overdue` como campo derivado en el servicio, sin persistirlo.
- Optimistic locking con campo `version` y respuesta 409 al detectar conflicto.
- Audit trail en la misma transacción que el UPDATE de estado.
- Server Actions para mutaciones (`createObligation`, `transitionObligation`) y revalidación automática de caché con `revalidatePath`.
- Separación de Client Components al mínimo necesario (`ObligationForm`, `TransitionButtons`, `StatusFilter`).

---

### Correcciones aplicadas

#### 1. Navegación por fila de tabla: `<Link>` sobre `<tr>` es HTML inválido

**Código generado:** `<Link>` de Next.js envolviendo un `<tr>` para hacer clickeable cada fila.

**Problema:** `<a>` como hijo de `<tr>` es HTML inválido. React lo detecta y lanza errores de hidratación en consola; algunos browsers lo corrigen silenciosamente, otros rompen el layout.

**Corrección:** se reemplazó por `onClick` + `router.push()` directamente sobre el `<tr>`, con cursor pointer vía Tailwind.

```tsx
// Antes (inválido)
<Link href={`/${locale}/obligations/${o.id}`}>
  <tr>...</tr>
</Link>

// Después (correcto)
<tr
  className="cursor-pointer hover:bg-gray-50"
  onClick={() => router.push(`/${locale}/obligations/${o.id}`)}
>
```

---

#### 2. Filtro de estado: pills de botón reemplazadas por `<select>`

**Código generado:** fila de botones tipo "pill" para filtrar por estado, con lógica de estado activo via className condicional.

**Decisión de diseño:** se reemplazó por un `<select>` nativo. Razones: ocupa menos espacio horizontal en mobile, es accesible por teclado sin CSS adicional, y evita la proliferación de botones cuando los estados crecen.

---

#### 3. Manejo de errores en `createObligation`: `data.detail` antes que `data.error`

**Código generado:** al leer el error del backend, se usaba `data.detail` directamente.

**Problema:** el contrato de la API define `{ error: "...", detail: "..." }`. Para errores de validación de FastAPI, `detail` es un array de objetos, lo que produce `[object Object]` en pantalla. El campo semántico correcto es `data.error`.

**Corrección:**

```ts
// Antes
return { error: data.detail ?? "Error al crear la obligación." };

// Después
return { error: data.error ?? data.detail ?? "Error al crear la obligación." };
```

Se lee `data.error` primero (convención de la API), `data.detail` como fallback para errores de validación de FastAPI, y finalmente un string literal.

---

#### 4. `TransitionButtons`: race condition en la versión tras transición exitosa

**Código generado:** al hacer una transición exitosa, el componente no llamaba `router.refresh()`. El Server Component padre se re-renderizaba eventualmente, pero mientras tanto `isPending` volvía a `false` con la versión vieja, lo que permitía disparar una segunda transición con el `version` obsoleto (causando un 409 innecesario).

**Corrección:** se añadió `router.refresh()` dentro del `startTransition` en el branch de éxito, para que `isPending` permanezca `true` hasta que el RSC termine de re-renderizar y entregue la nueva prop `version`.

```tsx
startTransition(async () => {
  const result = await transitionObligation(id, toStatus, version, locale);
  if (result.error) {
    setError(...);
  } else {
    router.refresh(); // ← mantiene isPending=true hasta que RSC re-renderiza
  }
});
```

---

#### 5. `StatusFilter` sin `Suspense` en la página de lista

**Código generado:** `StatusFilter` (que usa `useSearchParams`) se montaba directamente en el Server Component de la página.

**Problema:** Next.js App Router requiere que todo componente que llame a `useSearchParams` esté envuelto en `<Suspense>`, o el build falla con un error de SSR.

**Corrección:** se envolvió `<StatusFilter>` en `<Suspense fallback={null}>` en `obligations/page.tsx`.

---

#### 6. Labels de `TransitionButtons` hardcodeados en inglés

**Código generado:** los labels de los botones de transición (`"Mark as In Progress"`, `"Submit"`, etc.) estaban hardcodeados en inglés en el componente.

**Corrección:** se movieron al sistema de i18n (`messages/en.json` y `messages/es.json` bajo la clave `detail.transitions`), y el componente los lee con `useTranslations("detail.transitions")`.

---

#### 7. `useTranslations` (hook cliente) en un Server Component

**Código generado:** `new/page.tsx` usaba el hook `useTranslations` de next-intl, que es exclusivo de Client Components.

**Corrección:** se reemplazó por `await getTranslations({ locale })`, que es la API correcta para Server Components y consistente con el resto de las páginas.

---

#### 8. Discriminación 404 vs 5xx en la página de detalle

**Código generado:** cualquier excepción al cargar una obligación resultaba en renderizar el componente `NotFound`.

**Problema:** un error 500 del servidor no es un "not found" — debe propagarse al error boundary para que el usuario vea un mensaje apropiado, no una pantalla de "obligación no encontrada".

**Corrección:** se discrimina el status HTTP: solo `404` redirige a `notFound()`, cualquier otro error se re-lanza para que lo capture el error boundary.

---

#### 9. `getTranslations` secuencial en lugar de paralelo

**Código generado:** en `[id]/page.tsx`, las dos llamadas a `getTranslations` se ejecutaban de forma secuencial (una `await` tras otra).

**Corrección:** se ejecutan en paralelo con `Promise.all`, reduciendo la latencia de renderizado del Server Component.

```ts
// Antes
const t = await getTranslations({ locale, namespace: "detail" });
const tStatus = await getTranslations({ locale, namespace: "obligations" });

// Después
const [t, tStatus] = await Promise.all([
  getTranslations({ locale, namespace: "detail" }),
  getTranslations({ locale, namespace: "obligations" }),
]);
```

---

#### 10. Ícono de búsqueda: brújula reemplazada por lupa

**Código generado:** ícono SVG de brújula (compass) en el campo de búsqueda.

**Decisión de diseño:** se reemplazó por una lupa (`circle + line` diagonal), que es el ícono universalmente asociado a la acción de buscar. Una brújula no comunica búsqueda.

---

#### 11. Color del ícono de búsqueda sincronizado con el borde al hacer focus

**Código generado:** el ícono de búsqueda mantenía `text-gray-400` siempre, sin reaccionar al estado del input.

**Decisión de diseño:** al hacer focus el input muestra un ring violeta (`focus:ring-accent`). El ícono debe acompañar visualmente ese cambio. Se agregó estado `searchFocused` controlado por `onFocus`/`onBlur` del input, y se aplica `text-accent` al SVG cuando está activo.

```tsx
<svg className={`... transition-colors ${searchFocused ? "text-accent" : "text-gray-400"}`}>
```

---

#### 13. Locale switcher: `usePathname` de `next/navigation` no incluye el prefijo de locale en next-intl v4

**Código generado:** el switcher usaba `usePathname` y `useRouter` de `next/navigation`, y reemplazaba manualmente el segmento de locale en el path:

```ts
const segments = pathname.split("/");
segments[1] = next;
router.push(segments.join("/"));
```

**Problema:** en Next.js 15 + next-intl v4, el middleware reescribe la URL internamente y `usePathname` de `next/navigation` devuelve el path **sin** el prefijo de locale (e.g., `/obligations` en lugar de `/es/obligations`). La lógica de `segments[1] = next` operaba sobre `["", "obligations"]` y producía `/en` en lugar de `/en/obligations`, perdiendo la página actual al cambiar de idioma.

**Evidencia observada:** los logs del servidor mostraban `GET /en 307` seguido de `GET /en/obligations 200` — un redirect innecesario a través de la root page.

**Corrección:** se creó `i18n/navigation.ts` con `createNavigation(routing)` — la API oficial de next-intl v4 — y el `LocaleSwitcher` usa `usePathname` y `useRouter` de ese módulo. El `usePathname` de next-intl devuelve el path sin locale, y el `useRouter` acepta `{ locale }` como opción de navegación:

```ts
// Antes
import { useRouter, usePathname } from "next/navigation";
const segments = pathname.split("/");
segments[1] = next;
router.push(segments.join("/"));

// Después
import { useRouter, usePathname } from "@/i18n/navigation";
router.push(pathname, { locale: next });
```

---

#### 12. Filtro de estado: `<select>` nativo reemplazado por dropdown personalizado

**Código generado (iteración previa):** `<select>` nativo. Visualmente inconsistente con el resto de la UI porque el panel desplegable lo renderiza el sistema operativo con su propio estilo, ignorando cualquier CSS de Tailwind sobre los `<option>`.

**Decisión de diseño:** se reemplazó por un dropdown completamente custom: botón trigger con el mismo estilo de los inputs (`rounded-lg border border-gray-200 bg-white`), panel con `rounded-xl border border-gray-100 bg-white shadow-sm`, items con `hover:bg-gray-50`, y el ítem seleccionado con `bg-violet-50 text-accent`. La flecha del trigger rota 180° al abrirse. El cierre al hacer click fuera se maneja con `useEffect` + `mousedown` sobre `document`.

---

#### 14. `StatusCycleCard`: desborde de contenido bloqueaba los clicks en los dots de navegación

**Código generado:** el contenedor de cross-fade tenía altura fija `h-9` (36px). El contenido real — número `text-2xl` (~32px) + label `text-xs` (~18px) — ocupa ~50px y desbordaba hacia abajo, cubriendo los dots de navegación y bloqueando sus clicks. La card parecía funcionar (ciclo visual correcto) pero el pinning era imposible.

**Corrección:** altura aumentada a `h-12` (48px) para contener el contenido sin desborde. Se agregó `pointer-events-none` al contenedor para que el overflow no intercepte eventos aunque el contenido lo sobrepase. Ajustes visuales: `mt-0.5` → `mt-1.5`, dot del label `w-1.5` → `w-2`, gaps aumentados.

---

#### 15. `StatusCycleCard`: rotación se detenía por stale closure en el callback del intervalo

**Código generado:** el intervalo de rotación se manejaba con `useEffect` + `setInterval`. En React 18/19 Strict Mode, los efectos se invocan dos veces en desarrollo (mount → cleanup → mount), lo que podía dejar el closure del callback con un valor desactualizado de `pinned` o `statuses.length`.

**Corrección:** se reemplazó el enfoque por `useRef` para el timer y un `pinnedRef` sincrónico:

```tsx
const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
const pinnedRef = useRef(false);

useEffect(() => {
  pinnedRef.current = pinned;
  if (timerRef.current) clearInterval(timerRef.current);
  if (!pinned) {
    timerRef.current = setInterval(() => {
      if (pinnedRef.current) return;
      setIndex((i) => (i + 1) % statuses.length);
    }, 2500);
  }
  return () => { if (timerRef.current) clearInterval(timerRef.current); };
}, [pinned, statuses.length]);
```

`pinnedRef.current` se actualiza sincrónicamente en cada render, evitando que el callback del intervalo lea un valor stale de `pinned`.

---

#### 16. Lista de obligaciones ordenada por vencimiento ascendente

**Código generado:** la lista mostraba las obligaciones en el orden devuelto por el backend (orden de inserción).

**Decisión de diseño:** el caso de uso principal es detectar qué vence primero. Se ordenó ascendentemente por `due_date` en el cliente, después de aplicar los filtros de búsqueda y estado. La comparación usa `localeCompare` sobre el string ISO (`YYYY-MM-DD`), que es lexicográficamente correcto sin necesidad de parsear fechas.

```ts
.sort((a, b) => a.due_date.localeCompare(b.due_date))
```

---

#### 17. Filas vencidas resaltadas en rojo en la lista

**Código generado:** todas las filas tenían el mismo estilo neutro (`hover:bg-gray-50`, texto `text-gray-900`/`text-gray-500`).

**Decisión de diseño:** una obligación vencida requiere atención inmediata. Se resalta la fila completa con `bg-red-50 hover:bg-red-100` y el texto cambia a tonos rojos (`text-red-900`, `text-red-700`), incluyendo la fecha de vencimiento en `font-medium` para reforzar la urgencia. El campo `overdue` ya viene calculado por el backend, no se reimplementa la lógica en el frontend.

---

#### 18. Formato de fecha adaptado al locale en la lista

**Código generado:** la fecha de vencimiento se mostraba como el string ISO crudo devuelto por el backend (`2026-12-31`), sin adaptación al locale activo.

**Decisión de diseño:** el formato ISO es poco legible para el usuario final y no respeta la convención regional (día/mes en español, mes/día en inglés). Se reemplazó por `toLocaleDateString(locale)`:

```ts
new Date(`${o.due_date}T00:00:00`).toLocaleDateString(locale)
```

El sufijo `T00:00:00` (sin zona horaria) es intencional: `new Date("2026-12-31")` se parsea como UTC midnight, lo que en zonas horarias con offset negativo mostraría el día anterior. Con `T00:00:00` se parsea en hora local, evitando el off-by-one. El mismo patrón se usa en `AuditTrail` con `toLocaleString(locale)` para fechas con hora.
