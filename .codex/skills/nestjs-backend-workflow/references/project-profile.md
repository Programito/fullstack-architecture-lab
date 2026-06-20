# Backend Project Profile

Use this reference for `C:\Users\Thor_\Documents\Proyecto\backend`.

## Stack

- NestJS
- pnpm
- Prisma
- PostgreSQL
- Vitest
- Supertest
- Testcontainers

## Commands

Run from `backend/`:

```txt
pnpm build
pnpm test
pnpm test:integration
pnpm test:e2e
pnpm prisma:generate
pnpm prisma:migrate
pnpm prisma:deploy
pnpm prisma:seed
```

`pnpm test` runs fast unit and application tests with in-memory adapters.
`pnpm test:integration` uses Testcontainers and requires Docker.
`pnpm test:e2e` verifies HTTP routes with Supertest.

## Architecture

- `src/<feature>/domain/`: entities, value objects, enums, domain events
- `src/<feature>/application/`: use cases and ports
- `src/<feature>/infrastructure/`: persistence, security, seed adapters
- `src/<feature>/presentation/rest/`: controllers, guards, DTOs
- `src/shared/`: cross-cutting concerns such as Prisma, events, fake-data, result and errors

Top-level modules currently include:

- `health`
- `identity`
- `tasks`

## Persistence Mode

- `IdentityModule` chooses in-memory or Prisma adapters through `IDENTITY_PERSISTENCE`.
- `TasksModule` is currently wired to in-memory persistence.
- Prisma remains enabled globally through `PrismaModule` in `src/app.module.ts`.

When a use case depends on a repository port that has both in-memory and Prisma implementations,
keep behavior aligned across adapters.

## API and Auth Notes

- REST endpoints are versioned under `/api/v1`.
- `/developer/*` endpoints require a valid `developer_access_token` cookie.
- Auth, sessions, users, roles and permissions live under `src/identity/`.

## Data Notes

- Prisma schema lives in `prisma/schema.prisma`.
- Migrations under `prisma/migrations/` are the versioned source of truth.
- Shared seeds live in `prisma/seeds/` and are orchestrated by `prisma/seed.ts`.

## Testing Preference

Prefer a backend test pyramid with focused unit/application tests first, fewer Prisma integration
tests, and targeted e2e coverage for route wiring and auth flows.
