# Observabilidad y auditoria

## Resumen

El sistema de observabilidad centraliza logs tecnicos, errores, eventos ligeros del frontend y auditoria de acciones sensibles.

La persistencia vive en PostgreSQL mediante Prisma sobre la tabla `app_logs`, y la consulta operativa se expone para cuentas con rol `developer` en:

- `GET /api/v1/developer/logs/summary`
- `GET /api/v1/developer/logs/timeline`
- `GET /api/v1/developer/logs/breakdown`
- `GET /api/v1/developer/logs/events`
- `GET /api/v1/developer/logs/entity-options` — opciones para el picker de `entityId` (`entityType` requerido, `restaurantId` opcional), derivadas de lo que ya hay auditado
- `GET /api/v1/developer/logs/actor-options` — opciones para el picker de `actorUserId`, derivadas de eventos `auth.*` auditados
- `POST /api/v1/observability/client-events`

## Modelo de log

Campos principales:

- `source`: `backend` | `frontend`
- `category`: `request` | `error` | `audit` | `client`
- `level`: `info` | `warn` | `error`
- `event`: nombre tecnico del evento
- `message`: descripcion corta
- `path`, `method`, `statusCode`, `durationMs`
- `organizationId`, `restaurantId`, `userId`, `requestId`
- `metadata`: JSON saneado

## Auditoria estructurada

La auditoria usa `AuditService` y anade contexto de negocio dentro de `metadata`:

- `actorRoles: string[]`
- `result: attempted | succeeded | failed`
- `entityType: auth | product | menu | menu-section | reservation | order`
- `entityId: string | null`
- `entityLabel: string | null`
- `changedFields: string[]`

Actualmente se registra auditoria estructurada en:

- login y logout
- crear, editar y borrar productos
- crear, editar y borrar secciones y cambios de items de menu
- crear reservas y cambios de estado de reserva
- apertura de pedido, lineas, pagos y acciones operativas de pedido

## Captura automatica

### Backend

- `request-logging.interceptor.ts` registra request/response
- `exception-logging.filter.ts` registra excepciones no controladas y las reenvia a Sentry cuando el status es >= 500
- `observability-retention.runner.ts` aplica limpieza por retencion

### Frontend

`frontend/src/app/core/observability/client-logs.service.ts` envia eventos ligeros de cliente:

- errores globales (tambien reenviados a Sentry desde `ClientLogErrorHandler`)
- errores HTTP de API
- navegacion principal
- cambios online/offline

## Sentry

Sentry complementa el sistema de `AppLog`, no lo sustituye: `AppLog` sigue siendo la fuente de auditoria de negocio (quien hizo que, filtrable por restaurante/entidad/actor), mientras que Sentry aporta agrupacion automatica de errores repetidos, stack traces y alertas en tiempo real.

- **Backend**: `@sentry/node`. DSN en `backend/src/shared/observability/sentry.config.ts`, se activa con la variable de entorno `SENTRY_ENABLED` (`false` por defecto, mismo patron que `REALTIME_ENABLED`): `main.ts` solo llama a `Sentry.init()` si `SENTRY_ENABLED=true`. `exception-logging.filter.ts` llama a `Sentry.captureException` con `requestId` y `path` como contexto extra para cualquier excepcion con status >= 500; los logs de `AppLog` (todos los status) no cambian.
- **Frontend**: `@sentry/angular`. DSN en `frontend/src/app/core/observability/sentry.config.ts`, Angular no tiene `.env` en runtime, asi que el equivalente es el `InjectionToken` `SENTRY_ENABLED` (mismo patron que `REALTIME_ENABLED` en `frontend/src/app/core/realtime/realtime.config.ts`), con factory por defecto `!isDevMode()`. `app.config.ts` inyecta el token en un `provideEnvironmentInitializer` y solo llama a `Sentry.init()` si esta activo. `ClientLogErrorHandler.handleError` llama a `Sentry.captureException` ademas de registrar el error via `ClientLogsService`.
- El DSN es de solo escritura (no permite leer datos del proyecto), por eso se mantiene en el codigo fuente en vez de en variables de entorno, igual en frontend y backend.
- No hay integracion con el dashboard `/developer/logs`: son dos sistemas independientes, cada uno con su propia consulta (Sentry via su propio panel, `AppLog` via este dashboard).

## Dashboard developer

La pantalla esta en `/developer/logs` y prioriza salud operativa e investigacion rapida.

Incluye:

- KPIs de peticiones, errores, tasa de error, auditoria y latencia p95
- serie temporal de actividad
- breakdown por nivel y categoria
- tabla paginada de eventos
- detalle del evento seleccionado

Filtros disponibles:

- rango fecha/hora (`from`, `to`)
- presets `1h`, `6h`, `24h`, `3d`, `7d`
- `level`
- `category`
- `path` — `<select>` con grupos de rutas conocidos (curados a mano en `KNOWN_LOG_PATH_GROUPS`, `frontend/src/app/features/developer/api/developer-logs.models.ts`); el backend sigue matcheando por `contains`, así que hay que mantener este listado sincronizado si se añaden controladores nuevos
- `restaurantId` — picker (`app-combobox`) contra `GET /restaurants`
- `actorUserId` — picker contra `/developer/logs/actor-options`
- `entityType`
- `entityId` — picker contra `/developer/logs/entity-options`, se recarga al cambiar `entityType` o `restaurantId`
- `result`
- `search`

### Aislamiento de cuentas demo

Las cuentas demo (`/auth/demo-login`) son de acceso público sin credenciales. Un `developer` demo
**nunca** ve actividad de usuarios reales en el dashboard, sea cual sea el filtro que intente:

- `AuthGuard` propaga `accountType` (`regular` | `demo` | `system` | `test`) a `request.auth`.
- `DeveloperLogsController` resuelve, para cuentas demo, la lista de IDs de usuarios demo (`UserRepository.findAll()` filtrado por `accountType === 'demo'`) y la pasa como `restrictToUserIds` a todos los métodos de `ObservabilityService` (`getSummary`, `getTimeline`, `getBreakdown`, `listEvents`, `listEntityOptions`, `listActorOptions`).
- `restrictToUserIds` se aplica como una condición `AND` independiente (`userId IS NULL OR userId IN (...)`) que se combina con cualquier otro filtro — un intento explícito de `actorUserId=<id-real>` simplemente no devuelve resultados, no hay forma de saltárselo desde la UI ni desde la query string.
- Las peticiones anónimas (`userId: null`, sin PII) siguen visibles.

## Readiness para bases dormidas

Cuando la base de datos corre en un tier gratuito que puede quedarse dormido, el backend expone un probe ligero en:

- `GET /api/v1/health/readiness`

Respuesta:

- `status`: `ready` | `warming_up` | `down`
- `database`: mismo estado de la base
- `durationMs`: duracion del probe `SELECT 1`

Reglas actuales:

- `ready`: la base responde rapido
- `warming_up`: la primera conexion tarda demasiado o huele a cold start
- `down`: el probe falla por un error que no parece de despertar

En frontend, este endpoint lo consume `PlatformReadinessService`, que hoy se reutiliza en:

- la pantalla de login, con polling corto hasta llegar a `ready`
- la pantalla developer, con observacion continua y acceso directo al dashboard de logs

Si la base se esta despertando, login muestra un banner informativo antes del acceso y developer mantiene una senal compacta de estado de plataforma.

La pieza tambien esta pensada para ser facil de quitar:

- el endpoint vive aislado en `src/health/database-readiness.service.ts`
- el consumo frontend vive aislado en `src/app/features/identity/api/platform-readiness.service.ts`
- los avisos visuales solo afectan a `src/app/features/identity/pages/login-page/` y `src/app/features/identity/pages/developer-page/`
- no cambia el contrato de login ni la auditoria general

## Retencion

Variables de entorno:

- `LOG_RETENTION_DAYS`
- `AUDIT_RETENTION_DAYS`
- `OBSERVABILITY_DB_COLD_START_ENABLED`

Ambas deben ser enteros positivos. Valores por defecto si no se fijan (`observability-retention.service.ts`):

```env
LOG_RETENTION_DAYS=30
AUDIT_RETENTION_DAYS=365
OBSERVABILITY_DB_COLD_START_ENABLED=false
```

`AUDIT_RETENTION_DAYS` es mas largo que `LOG_RETENTION_DAYS` a propósito: los logs operativos no
necesitan retención larga, pero un rastro de auditoría con solo 30 días es corto para fines de
compliance/investigación.

La limpieza separa logs generales y auditoria para permitir politicas distintas.

Si `OBSERVABILITY_DB_COLD_START_ENABLED=true`, Prisma activa una capa aislada de observacion para registrar:

- `db.connection.cold_start`
- `db.query.slow`
- `db.connection.timeout`
- `db.connection.recovered`

Esta capa esta encapsulada para que se pueda desactivar por entorno o retirar sin afectar al resto del sistema de logs y auditoria.

### Activacion y retirada

Activar:

```env
OBSERVABILITY_DB_COLD_START_ENABLED=true
```

Desactivar:

```env
OBSERVABILITY_DB_COLD_START_ENABLED=false
```

La pieza esta pensada para ser facil de retirar:

- la flag la apaga sin tocar el resto del sistema
- el codigo vive aislado en `src/observability/infrastructure/db/db-cold-start-observer.ts`
- no requiere columnas nuevas ni cambios en la auditoria general

### Que registra exactamente

La observacion de base de datos no intenta explicar toda la salud de Prisma. Solo captura senales utiles para tiers gratuitos o instancias dormidas:

- primera consulta lenta de la vida del proceso: `db.connection.cold_start`
- consulta lenta relevante: `db.query.slow`
- timeout o fallo con pinta de conexion dormida: `db.connection.timeout`
- consulta correcta poco despues de un timeout: `db.connection.recovered`

Metadata emitida:

- `provider`: identificador del proveedor observado
- `operation`: operacion Prisma, por ejemplo `Order.findFirst`
- `durationMs`
- `coldStart`
- `recovered`
- `retryCount`
- `errorName` cuando aplica

### Como verlo en el dashboard

En `/developer/logs` se puede encontrar rapido con:

- `search=db.connection`
- `search=db.query`
- `level=warn` para cold starts y consultas lentas
- `level=error` para timeouts

Tambien se puede cruzar por `requestId` cuando un request de negocio haya coincidido con un despertar lento de la base de datos.

## Regla de saneado

`observability-metadata.policy.ts` elimina claves sensibles antes de persistir metadata. Entre ellas:

- `authorization`
- `cookie`
- `password`
- `token`
- `refreshToken`
- `accessToken`

Ademas limita profundidad, numero de claves y longitud de cadenas para evitar payloads excesivos.

## Uso operativo rapido

Casos comunes:

- Ver fallos recientes de API: `category=request`, `level=error`
- Investigar una accion auditada: `category=audit` + `entityType` + `entityId`
- Revisar actividad de un usuario: `actorUserId=<id>`
- Acotar por endpoint: `path=/api/v1/...`
- Ver si una accion negocio acabo bien: `category=audit` + `result=succeeded|failed`

## Notas de implementacion

- El dashboard es solo para rol `developer`
- No hay streaming en tiempo real en esta fase
- Sentry es la unica plataforma externa integrada (ver §Sentry); no sustituye a `AppLog`
- La metadata debe evitar secretos y payloads completos sensibles

## Pendiente de verificar

- `src/observability/application/observability.service.integration-spec.ts` (Testcontainers) cubre `getTimeline` (SQL crudo con `date_trunc`), `getBreakdown` (`groupBy`), `listEvents` (filtros JSON de Postgres), `listEntityOptions`/`listActorOptions` (incluyendo `restrictToUserIds`) y `purgeExpired` (las dos ventanas de retencion), pero no se ha podido ejecutar en el entorno donde se escribio por falta de Docker. Correr `pnpm test:integration -- observability.service.integration-spec.ts` con Docker disponible antes de darlo por validado en CI.
- Mejora responsive del dashboard (`developer-logs-page.css`, breakpoints 960px/720px) verificada solo por build; no se ha comprobado visualmente en navegador.

