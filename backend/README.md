# Backend

Nest backend with Clean Architecture, versioned REST endpoints, Prisma/PostgreSQL prepared, Swagger, Vitest, Supertest and Testcontainers.

## Development

```bash
pnpm install
pnpm prisma:generate
pnpm dev
```

REST endpoints are versioned under `/api/v1`.

Swagger documentation is available at `/docs`.

The app is currently wired to in-memory adapters for local development, so it can start without `DATABASE_URL` or PostgreSQL.

Local in-memory identity data is seeded by default:

- `admin@example.com` / `admin1234` with role `admin`
- additional demo users generated through the fake-data adapter

Set `IDENTITY_MEMORY_SEED=false` to start with empty in-memory users and roles.
Use `IDENTITY_MEMORY_SEED_COUNT` to control generated users, `IDENTITY_MEMORY_SEED_RANDOM=true` for non-deterministic demo data, and `IDENTITY_MEMORY_SEED_VALUE` for a stable seed.

To switch back to Prisma/PostgreSQL later, re-enable `PrismaModule` in `src/app.module.ts` and wire `TasksModule` to `PrismaTaskRepository` + `OutboxEventBus`.

## Useful Commands

```bash
pnpm build
pnpm test
pnpm test:e2e
pnpm test:integration
pnpm prisma:migrate
pnpm prisma:studio
```

`pnpm test` runs fast unit tests with in-memory adapters. `pnpm test:e2e` verifies HTTP routes with Supertest and in-memory adapters. `pnpm test:integration` uses Testcontainers and requires Docker.

## Initial API

- `GET /api/v1/health`
- `POST /api/v1/tasks`
- `GET /api/v1/tasks`
- `PATCH /api/v1/tasks/:id/complete`
