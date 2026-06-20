---
name: nestjs-backend-workflow
description: NestJS backend workflow for test-first changes, clean architecture modules, REST controllers, DTOs, guards, Prisma-aware repositories, and Vitest coverage. Use when Codex changes backend files in this repository, adds or updates modules, controllers, use cases, guards, repositories, or backend documentation.
---

# NestJS Backend Workflow

## Overview

Use this skill to make backend changes in the NestJS project with focused tests, small architectural
steps, and local conventions for modules, use cases, repositories, and REST endpoints.

## Project Context

Read `references/project-profile.md` when working inside this repository or when the user asks about
project-specific backend conventions.

Core assumptions:

- Work from `backend/` for backend commands.
- Follow the current feature split before introducing new layers or abstractions.
- Prefer in-memory adapters for fast tests and Prisma adapters when persistence behavior matters.

## Workflow

Use a focused red-green-refactor loop:

1. Add or update the smallest useful test first.
2. Run the focused test and confirm it fails for the expected reason.
3. Implement the smallest backend change that satisfies the behavior.
4. Re-run the focused test until it passes.
5. Refactor while keeping the test green.
6. Broaden verification when the change affects HTTP contracts, guards, persistence, migrations, or
   seeds.

If the first test already passes, tighten the assertion or choose a more representative test level.

## Architecture Rules

- Keep domain logic in `domain/` entities, value objects, enums, and domain events.
- Keep orchestration in `application/use-cases/` and depend on ports, not concrete adapters.
- Keep concrete integrations in `infrastructure/`.
- Keep HTTP concerns in `presentation/rest/` with controllers, guards, and DTOs.
- Keep shared cross-cutting pieces in `backend/src/shared/`.

Prefer extending an existing module such as `identity` or `tasks` before creating a new top-level
module. When creating a new module, mirror the existing structure so the next change is predictable.

## NestJS Guidelines

- Keep modules explicit about controllers and providers.
- Prefer constructor-free `inject()` only if the surrounding code already uses it; otherwise follow
  the current Nest class style.
- Keep DTO validation and transport mapping at the REST boundary.
- Keep guards small and focused on authentication or authorization checks.
- Use typed provider tokens for ports and choose adapters in the module layer.

## Testing Guidance

Prefer the smallest test that proves the behavior:

- Pure domain or result helper logic: narrow unit spec beside the source file.
- Use case logic: focused application spec with in-memory adapters.
- Prisma repository behavior: integration spec against Prisma and Testcontainers.
- REST contract, cookies, auth flow, or guard wiring: e2e spec with Supertest.

Avoid pushing controller behavior into unit tests when the behavior is really about HTTP wiring.
Prefer route-level coverage for cookies, status codes, guards, and serialized response shapes.

## HTTP and API Changes

- Keep endpoints under `/api/v1`.
- Update DTOs and response mappers together when the public contract changes.
- Preserve developer access rules for `/developer/*` routes and related cookies.
- Keep error mapping aligned with `backend/src/shared/http/application-error.mapper.ts`.

When adding authentication or authorization behavior, review the relevant guard, service, and
controller together so cookie/session flows stay coherent.

## Persistence Changes

Use `prisma-backend-data` when the change touches schema, migrations, seeds, or Prisma adapters.

For repository work:

- Update the repository port only when the use case really needs a new capability.
- Keep in-memory and Prisma adapters behaviorally aligned when both represent the same port.
- Add integration coverage when a Prisma query or relational mapping changes.

## Documentation

Use `backend/docs/` for backend technical documentation when the repository adds it later.
Keep code-adjacent behavior documentation concise and close to the module it explains.

Use `backend/README.md` for commands or project-wide backend notes that affect daily workflow.

## Closing Checks

Use `backend-quality-check` before closing backend work to choose the right tests, builds, and
Prisma verification for the actual files changed.
