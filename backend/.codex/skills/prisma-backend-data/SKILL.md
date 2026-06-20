---
name: prisma-backend-data
description: Prisma backend workflow for schema changes, migrations, seeds, repository mapping, and persistence verification in this NestJS project. Use when Codex changes `backend/prisma/*`, updates Prisma repositories, or needs to coordinate schema and seed changes with backend tests.
---

# Prisma Backend Data

## Overview

Use this skill for database-facing backend work: schema updates, migration discipline, seed changes,
Prisma repositories, and verification that persistence behavior still matches the application ports.

## Project Context

Read `references/project-profile.md` when working in this repository so migration, seed, and test
choices match the local backend setup.

## Source of Truth

- Treat `backend/prisma/schema.prisma` as the Prisma model source of truth.
- Treat committed files in `backend/prisma/migrations/` as the database history source of truth.
- Keep shared catalog and bootstrap data in TypeScript seeds under `backend/prisma/seeds/`.

Do not make ad hoc SQL changes without reflecting them in the schema and migration history.

## Schema Workflow

When changing data shape:

1. Update `schema.prisma`.
2. Update affected Prisma repositories and any DTO or domain mapping code.
3. Update seeds when required by the new structure or defaults.
4. Update focused integration or application tests that depend on the old shape.
5. Run the smallest verification that proves the mapping and migration still work.

If the change only affects application behavior and not the stored shape, avoid unnecessary schema
or migration churn.

## Migration Rules

- Prefer committed Prisma migrations over `db push` for durable project changes.
- Keep migration names descriptive and focused on one conceptual change.
- Review generated SQL for unsafe defaults, unintended nullability, or accidental destructive steps.
- Keep provider-specific assumptions out of TypeScript seed logic when possible.

Use `prisma:push` only for temporary local iteration when the user clearly wants that path; do not
leave durable project changes dependent on it.

## Seed Rules

- Keep seeds idempotent whenever practical.
- Share reusable seed data through dedicated files in `prisma/seeds/`.
- Update `prisma/seed.ts` only when orchestration changes.
- Add or update tests for non-trivial seed logic, especially catalog synchronization behavior.

When changing roles, permissions, or demo data, review whether in-memory seed behavior should stay
aligned with Prisma seed behavior.

## Repository Mapping

- Map Prisma records to domain entities close to the repository.
- Keep port contracts stable unless the application layer truly needs a new capability.
- Prefer explicit selects/includes when relations matter to behavior.
- Add an integration spec when a Prisma query, transaction, relation, or persistence edge case
  changes.

If there is both an in-memory and Prisma implementation for the same port, keep observable behavior
aligned as closely as practical.

## Verification Guidance

Prefer the smallest useful check:

- Repository mapping or query change: `pnpm test:integration`
- Seed logic change with existing seed specs: run the focused seed spec first
- Broad schema or migration change: run integration tests plus the relevant Prisma command
- DTO or use case behavior indirectly affected by persistence defaults: run the focused application
  spec too

Use `backend-quality-check` before closing to decide whether broader backend verification is needed.
