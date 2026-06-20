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

The shared role catalog is used by both the in-memory adapter and Prisma:

- `admin`: full restaurant control
- `manager`: shifts, discounts and cash register
- `waiter`: tables and orders
- `kitchen`: order preparation
- `developer`: documentation, Storybook, architecture and technical demos

Set `IDENTITY_MEMORY_SEED=false` to start with empty in-memory users and roles.
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
- `POST /api/v1/tasks`
- `GET /api/v1/tasks`
- `PATCH /api/v1/tasks/:id/complete`
