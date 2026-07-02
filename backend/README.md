# Backend

Nest backend with Clean Architecture, versioned REST endpoints, Prisma/PostgreSQL prepared, Swagger, Vitest, Supertest and Testcontainers.

## Development

```bash
pnpm install
pnpm prisma:generate
pnpm dev
```

REST endpoints are versioned under `/api/v1`.

Swagger, the static Storybook build and frontend architecture documentation are
served under `/developer/*`. Every request requires a valid
`developer_access_token` cookie issued only to an active user with the
`developer` role.

The app is currently wired to in-memory adapters for local development, so it can start without `DATABASE_URL` or PostgreSQL.

Local in-memory identity data is seeded by default:

- `admin@example.com` / `admin1234` with role `admin`
- additional demo users generated through the fake-data adapter
- five portfolio accounts marked with `accountType=demo`

The shared role catalog is used by both the in-memory adapter and Prisma:

- `admin`: full restaurant control
- `manager`: shifts, discounts and cash register
- `waiter`: tables, orders and reservations
- `kitchen`: order preparation
- `developer`: documentation, Storybook, architecture and technical demos

Set `IDENTITY_MEMORY_SEED=false` to skip the fixed regular admin and generated users.
Portfolio demo accounts remain seeded so environments can toggle access without
deleting data. `DEMO_LOGIN_ENABLED=false` blocks their login, refresh and active
sessions immediately.
Use `IDENTITY_MEMORY_SEED_COUNT` to control generated users, `IDENTITY_MEMORY_SEED_RANDOM=true` for non-deterministic demo data, and `IDENTITY_MEMORY_SEED_VALUE` for a stable seed.

To switch back to Prisma/PostgreSQL later, re-enable `PrismaModule` in `src/app.module.ts` and wire `TasksModule` to `PrismaTaskRepository` + `OutboxEventBus`.

## Database migrations and seeds

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

## Observability

The project includes a persisted observability module for technical logs,
frontend client events, and structured audit events.

Environment variables:

- `LOG_RETENTION_DAYS=30`
- `AUDIT_RETENTION_DAYS=365`
- `OBSERVABILITY_DB_COLD_START_ENABLED=false`

Developer-only endpoints live under `/api/v1/developer/logs/*`, and the
developer dashboard is available in the frontend at `/developer/logs`.

The database cold-start observer is optional and disabled by default. Enable it
only in environments where a free or sleeping database tier causes slow first
queries or recoverable connection timeouts.

Operational details, filters, audit fields, and retention behavior are
documented in [docs/observability.md](/C:/Users/Thor_/Documents/Proyecto/backend/docs/observability.md).

When changing database providers, update the provider in `prisma/schema.prisma`
and generate a new provider-specific migration history. Keep shared seed data in
TypeScript so it remains independent from SQL dialects.

## Useful Commands

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

## Initial API

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
