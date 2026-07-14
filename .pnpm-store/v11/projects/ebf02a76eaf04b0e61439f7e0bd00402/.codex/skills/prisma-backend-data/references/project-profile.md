# Prisma Backend Reference

Use this reference for persistence work in `C:\Users\Thor_\Documents\Proyecto\backend`.

## Relevant Files

- Prisma schema: `backend/prisma/schema.prisma`
- Migrations: `backend/prisma/migrations/`
- Seed entry point: `backend/prisma/seed.ts`
- Seed modules: `backend/prisma/seeds/`
- Prisma service: `backend/src/shared/prisma/prisma.service.ts`
- Prisma repositories:
  - `backend/src/tasks/infrastructure/persistence/prisma-task.repository.ts`
  - `backend/src/identity/infrastructure/persistence/prisma-user.repository.ts`
  - `backend/src/identity/infrastructure/persistence/prisma-role.repository.ts`
  - `backend/src/identity/infrastructure/persistence/prisma-permission.repository.ts`
  - `backend/src/identity/infrastructure/persistence/prisma-auth-session.repository.ts`

## Commands

Run from `backend/`:

```txt
pnpm prisma:generate
pnpm prisma:migrate
pnpm prisma:deploy
pnpm prisma:push
pnpm prisma:seed
pnpm test:integration
```

`pnpm prisma:migrate` is for local development migration generation.
`pnpm prisma:deploy` applies committed migrations.
`pnpm test:integration` uses Testcontainers and needs Docker.

## Current Project Notes

- The repository keeps Prisma migrations committed in source control.
- Shared catalog data such as roles and permissions is seeded from TypeScript.
- Identity persistence can switch between in-memory and Prisma adapters.
- Task persistence has a Prisma repository available, even though the active module wiring is still
  in-memory-focused.

## Review Checklist

- Schema and migration reflect the same conceptual change.
- Seed logic still matches required defaults and catalogs.
- Repositories still map records to domain types correctly.
- Integration tests cover changed relations, filters, defaults, or transactions.
