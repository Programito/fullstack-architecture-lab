# Backend

[← Main README](../README.md)

[English](#english) · [Español](#español)

## English

Nest backend with Clean Architecture, versioned REST endpoints, Prisma/PostgreSQL prepared, Swagger, Vitest, Supertest and Testcontainers.

### Development

```bash
pnpm install
pnpm prisma:generate
pnpm dev
```

REST endpoints are versioned under `/api/v1`.

Swagger/API documentation, the static Storybook build, frontend architecture
documentation and developer resources are served under `/developer/*`. Every request requires a valid
`developer_access_token` cookie issued only to an active user with the
`developer` role.

The app is currently wired to in-memory adapters for local development, so it can start without `DATABASE_URL` or PostgreSQL.

Local in-memory identity data is seeded by default:

- `admin@example.com` / `admin1234` with role `admin`
- additional demo users generated through the fake-data adapter
- six portfolio accounts marked with `accountType=demo`

The shared role catalog is used by both the in-memory adapter and Prisma:

- `admin`: full restaurant control
- `manager`: shifts, discounts and cash register
- `waiter`: tables, orders and reservations
- `kitchen`: order preparation
- `customer`: table-side ordering and payment from the customer app
- `developer`: Swagger/API docs, Storybook, architecture, table relationships, audit logs and technical demos

The fixed demo accounts come from `src/identity/domain/demo-account-catalog.ts`.
That catalog currently includes the mobile customer account
`customer@mesaflow.demo`, so tests and docs should derive expectations from the
catalog instead of hardcoding the old five-account count.

Set `IDENTITY_MEMORY_SEED=false` to skip the fixed regular admin and generated users.
Portfolio demo accounts remain seeded so environments can toggle access without
deleting data. `DEMO_LOGIN_ENABLED=false` blocks their login, refresh and active
sessions immediately.
Use `IDENTITY_MEMORY_SEED_COUNT` to control generated users, `IDENTITY_MEMORY_SEED_RANDOM=true` for non-deterministic demo data, and `IDENTITY_MEMORY_SEED_VALUE` for a stable seed.

To switch back to Prisma/PostgreSQL later, re-enable `PrismaModule` in `src/app.module.ts` and wire `TasksModule` to `PrismaTaskRepository` + `OutboxEventBus`.

### Database migrations and seeds

Prisma migrations in `prisma/migrations/` are the versioned source of truth for
the database structure. Apply committed migrations and then seed the shared
catalog:

```bash
pnpm prisma:deploy
pnpm prisma:seed
```

Role seeding is idempotent: existing roles are updated by name and missing roles
are created. Seed implementations live in `prisma/seeds/`, while
`prisma/seed.ts` is the common entry point.

Product image uploads use signed Cloudinary uploads. Configure these backend
environment variables when you want the menu admin to sign product image
uploads:

- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

The backend signs uploads for the frontend through:

- `POST /api/v1/restaurants/:id/products/image-upload-signature`

The endpoint is protected with the same restaurant/menu permissions as product
creation and update. The signed payload is used for direct browser uploads to
Cloudinary, while the resulting `secure_url` is stored in
`RestaurantProduct.imageUrl`.

### Observability

The project includes a persisted observability module for technical logs,
frontend client events, and structured audit events.

Environment variables:

- `LOG_RETENTION_DAYS=30`
- `AUDIT_RETENTION_DAYS=365`
- `OBSERVABILITY_DB_COLD_START_ENABLED=false`
- `SENTRY_ENABLED=false`

Developer-only endpoints live under `/api/v1/developer/logs/*`, and the
developer dashboard is available in the frontend at `/developer/logs`.

The database cold-start observer is optional and disabled by default. Enable it
only in environments where a free or sleeping database tier causes slow first
queries or recoverable connection timeouts.

`SENTRY_ENABLED` turns Sentry error reporting on or off (`Sentry.init()` in
`src/main.ts`); it's a complement to `AppLog`, not a replacement, since Sentry
only receives 5xx exceptions, not the full audit trail. The DSN itself is not
an environment variable — it's write-only (it can only submit events, never
read project data) and lives in `src/shared/observability/sentry.config.ts`.
See [docs/observability.md](docs/observability.md) for details.

Operational details, filters, audit fields, and retention behavior are
documented in [docs/observability.md](docs/observability.md).

When changing database providers, update the provider in `prisma/schema.prisma`
and generate a new provider-specific migration history. Keep shared seed data in
TypeScript so it remains independent from SQL dialects.

### Docker and integration tests

`pnpm test:integration` requires Docker Desktop running. Each spec provisions and
tears down its own ephemeral `postgres:16-alpine` container via Testcontainers —
no manual database setup is needed, and the `docker-compose.yml` in this folder
is unrelated to these tests.

`docker-compose.yml` instead starts a persistent local Postgres for manual
development (`pnpm dev`, `prisma studio`, etc.), matching the defaults already in
`.env.example`:

```bash
docker compose up -d
pnpm prisma:deploy
```

### Useful Commands

```bash
pnpm build
pnpm test
pnpm test:e2e
pnpm test:integration
pnpm prisma:migrate
pnpm prisma:deploy
pnpm prisma:seed
pnpm prisma:studio
```

`pnpm test` runs fast unit tests with in-memory adapters. `pnpm test:e2e` verifies HTTP routes with Supertest and in-memory adapters. `pnpm test:integration` uses Testcontainers and requires Docker.

### Initial API

- `GET /api/v1/health`
- `GET /api/v1/restaurants`
- `GET /api/v1/restaurants/:id/menu`
- `GET /api/v1/restaurants/:id/floors`
- `POST /api/v1/restaurants/:id/floors/:floorId/elements`
- `PATCH /api/v1/restaurants/:id/floors/:floorId`
- `PUT /api/v1/restaurants/:id/floors/:floorId/elements/reorder`
- `GET /api/v1/restaurants/:id/reservations`
- `POST /api/v1/restaurants/:restaurantId/reservations`
- `PATCH /api/v1/restaurants/:restaurantId/reservations/:reservationId/confirm`
- `PATCH /api/v1/restaurants/:restaurantId/reservations/:reservationId/seat`
- `PATCH /api/v1/restaurants/:restaurantId/reservations/:reservationId/no-show`
- `PATCH /api/v1/restaurants/:restaurantId/reservations/:reservationId/cancel`
- `POST /api/v1/tasks`
- `GET /api/v1/tasks`
- `PATCH /api/v1/tasks/:id/complete`

MesaFlow endpoint documentation draft lives in `backend/docs/mesaflow-api.md`.

---

## Español

Backend Nest con arquitectura limpia, endpoints REST versionados, Prisma/PostgreSQL preparado, Swagger, Vitest, Supertest y Testcontainers.

### Desarrollo

```bash
pnpm install
pnpm prisma:generate
pnpm dev
```

Los endpoints REST están versionados bajo `/api/v1`.

La documentación Swagger/API, el build estático de Storybook, la documentación
de arquitectura del frontend y los recursos developer se sirven bajo
`/developer/*`. Toda petición requiere una cookie
`developer_access_token` válida, emitida solo a un usuario activo con el rol
`developer`.

Actualmente la app usa adaptadores en memoria para desarrollo local, así que puede arrancar sin `DATABASE_URL` ni PostgreSQL.

Los datos de identidad en memoria se siembran por defecto:

- `admin@example.com` / `admin1234` con rol `admin`
- usuarios demo adicionales generados con el adaptador de datos falsos
- seis cuentas de portfolio marcadas con `accountType=demo`

El catálogo de roles compartido lo usan tanto el adaptador en memoria como Prisma:

- `admin`: control total del restaurante
- `manager`: turnos, descuentos y caja
- `waiter`: mesas, pedidos y reservas
- `kitchen`: preparación de pedidos
- `customer`: pedido y pago desde la mesa en la app cliente
- `developer`: documentación Swagger/API, Storybook, arquitectura, relación de tablas, logs de auditoría y demos técnicas

La cuenta demo móvil `customer@mesaflow.demo` también forma parte del catálogo
fijo en `src/identity/domain/demo-account-catalog.ts`, así que tests y
documentación deberían derivar sus expectativas de ese catálogo en lugar de
fijar el recuento antiguo de cinco cuentas.

Fija `IDENTITY_MEMORY_SEED=false` para omitir el admin regular fijo y los usuarios generados.
Las cuentas demo de portfolio se siguen sembrando para poder alternar el acceso sin
borrar datos. `DEMO_LOGIN_ENABLED=false` bloquea su login, refresco y sesiones activas
de inmediato.
Usa `IDENTITY_MEMORY_SEED_COUNT` para controlar los usuarios generados, `IDENTITY_MEMORY_SEED_RANDOM=true` para datos demo no deterministas, e `IDENTITY_MEMORY_SEED_VALUE` para una semilla estable.

Para volver a Prisma/PostgreSQL más adelante, reactiva `PrismaModule` en `src/app.module.ts` y conecta `TasksModule` a `PrismaTaskRepository` + `OutboxEventBus`.

### Migraciones y seeds de base de datos

Las migraciones Prisma en `prisma/migrations/` son la fuente de verdad versionada
de la estructura de la base de datos. Aplica las migraciones comprometidas y
siembra el catálogo compartido:

```bash
pnpm prisma:deploy
pnpm prisma:seed
```

El seed de roles es idempotente: los roles existentes se actualizan por nombre y
los que faltan se crean. Las implementaciones de seed viven en `prisma/seeds/`,
y `prisma/seed.ts` es el punto de entrada común.

La subida de imágenes de producto usa subidas firmadas a Cloudinary. Configura
estas variables de entorno del backend cuando quieras que el admin de menú
firme subidas de imágenes de producto:

- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

El backend firma las subidas para el frontend a través de:

- `POST /api/v1/restaurants/:id/products/image-upload-signature`

El endpoint está protegido con los mismos permisos de restaurante/menú que la
creación y edición de productos. El payload firmado se usa para subidas directas
desde el navegador a Cloudinary, y el `secure_url` resultante se guarda en
`RestaurantProduct.imageUrl`.

### Observabilidad

El proyecto incluye un módulo de observabilidad persistido para logs técnicos,
eventos de cliente del frontend y eventos de auditoría estructurados.

Variables de entorno:

- `LOG_RETENTION_DAYS=30`
- `AUDIT_RETENTION_DAYS=365`
- `OBSERVABILITY_DB_COLD_START_ENABLED=false`
- `SENTRY_ENABLED=false`

Los endpoints solo para developer viven bajo `/api/v1/developer/logs/*`, y el
dashboard developer está disponible en el frontend en `/developer/logs`.

El observador de cold-start de base de datos es opcional y está desactivado por
defecto. Actívalo solo en entornos donde un tier de base de datos gratuito o
dormido cause primeras consultas lentas o timeouts de conexión recuperables.

`SENTRY_ENABLED` activa o desactiva el reporte de errores a Sentry (`Sentry.init()`
en `src/main.ts`); es un complemento de `AppLog`, no un sustituto, ya que Sentry
solo recibe excepciones 5xx, no el rastro de auditoría completo. El propio DSN no
es una variable de entorno — es de solo escritura (solo puede enviar eventos,
nunca leer datos del proyecto) y vive en `src/shared/observability/sentry.config.ts`.
Consulta [docs/observability.md](docs/observability.md) para más detalle.

Los detalles operativos, filtros, campos de auditoría y comportamiento de
retención están documentados en [docs/observability.md](docs/observability.md).

Al cambiar de proveedor de base de datos, actualiza el proveedor en
`prisma/schema.prisma` y genera un nuevo historial de migraciones específico del
proveedor. Mantén los datos de seed compartidos en TypeScript para que sigan
siendo independientes del dialecto SQL.

### Docker y tests de integración

`pnpm test:integration` requiere que Docker Desktop esté corriendo. Cada spec
provisiona y destruye su propio contenedor efímero `postgres:16-alpine` vía
Testcontainers — no hace falta configurar la base de datos a mano, y el
`docker-compose.yml` de esta carpeta no está relacionado con estos tests.

`docker-compose.yml` en cambio levanta un Postgres local persistente para
desarrollo manual (`pnpm dev`, `prisma studio`, etc.), coincidiendo con los
valores por defecto de `.env.example`:

```bash
docker compose up -d
pnpm prisma:deploy
```

### Comandos útiles

```bash
pnpm build
pnpm test
pnpm test:e2e
pnpm test:integration
pnpm prisma:migrate
pnpm prisma:deploy
pnpm prisma:seed
pnpm prisma:studio
```

`pnpm test` ejecuta tests unitarios rápidos con adaptadores en memoria. `pnpm test:e2e` verifica rutas HTTP con Supertest y adaptadores en memoria. `pnpm test:integration` usa Testcontainers y requiere Docker.

### API inicial

- `GET /api/v1/health`
- `GET /api/v1/restaurants`
- `GET /api/v1/restaurants/:id/menu`
- `GET /api/v1/restaurants/:id/floors`
- `POST /api/v1/restaurants/:id/floors/:floorId/elements`
- `PATCH /api/v1/restaurants/:id/floors/:floorId`
- `PUT /api/v1/restaurants/:id/floors/:floorId/elements/reorder`
- `GET /api/v1/restaurants/:id/reservations`
- `POST /api/v1/restaurants/:restaurantId/reservations`
- `PATCH /api/v1/restaurants/:restaurantId/reservations/:reservationId/confirm`
- `PATCH /api/v1/restaurants/:restaurantId/reservations/:reservationId/seat`
- `PATCH /api/v1/restaurants/:restaurantId/reservations/:reservationId/no-show`
- `PATCH /api/v1/restaurants/:restaurantId/reservations/:reservationId/cancel`
- `POST /api/v1/tasks`
- `GET /api/v1/tasks`
- `PATCH /api/v1/tasks/:id/complete`

El borrador de documentación de endpoints de MesaFlow vive en `backend/docs/mesaflow-api.md`.
