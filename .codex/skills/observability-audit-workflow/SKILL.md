---
name: observability-audit-workflow
description: Backend observability, structured audit logging, and retention workflow for the NestJS `observability` module (app_logs table, request/exception interceptors, AuditService, developer dashboard). Use when Codex changes logging capture, structured audit metadata, log/audit query endpoints, retention/purge behavior, or the `/developer/logs` dashboard.
---

# Observability & Audit Workflow

## Overview

Use this skill for backend work on the `observability` module: automatic request/error capture,
structured business audit trail, aggregation queries for the developer dashboard, and retention
policy. This is domain-specific enough to have real traps beyond generic NestJS/Prisma work — read
`backend/docs/observability.md` for the full contract before making non-trivial changes.

## Project Context

Core assumptions:

- Persistence is a single `app_logs` table via Prisma; `source` splits `backend`/`frontend`,
  `category` splits `request`/`error`/`audit`/`client`.
- Query endpoints live under `/developer/logs/*` and require the `developer` role
  (`developer_access_token` cookie) — never expose them without that guard.
- `AuditService` is the only place that should write structured business audit entries
  (`actorRoles`, `result`, `entityType`, `entityId`, `entityLabel`, `changedFields` in `metadata`).

## Capture Rules

- Automatic capture (`request-logging.interceptor.ts`, `exception-logging.filter.ts`) must not
  silence internal failures of the logging system itself — a broken log write should not look like
  a swallowed error.
- Normalize `category`/`level` without overwriting a level already computed at runtime for a failed
  request (e.g. don't downgrade a request that failed to `info`).
- Add structured audit calls at the use case or controller boundary for new sensitive actions
  (auth, CRUD on menu/products/reservations/orders), following the existing entries listed in
  `backend/docs/observability.md`.
- Run all metadata through `observability-metadata.policy.ts` before persisting. Never bypass it to
  persist raw request bodies or headers — it strips `authorization`, `cookie`, `password`, `token`,
  `refreshToken`, `accessToken` and caps depth/key count/string length.

## Aggregation Queries

- Prefer SQL-side aggregation (`groupBy`, `$queryRaw`) over loading all rows into memory for
  summary/timeline/breakdown endpoints — this dashboard is meant to stay cheap at scale.
- When a query spreads a generic filter object into a raw SQL builder, double-check the date range
  clause isn't clobbered by the spread (a real regression happened here — the fix keeps the
  resolved `from`/`to` window applied after the generic filter spread, not before).
- Add a Testcontainers integration spec (`observability.service.integration-spec.ts` pattern) when
  changing `getTimeline` (`date_trunc` raw SQL), `getBreakdown` (`groupBy`), `listEvents` (Postgres
  JSON filters), or `listEntityOptions`/`listActorOptions`.

## Demo Account Isolation

A `developer` session with `accountType: 'demo'` must never see real users' activity, regardless of
filters:

- Resolve the demo user id list server-side and pass it as `restrictToUserIds` to every
  `ObservabilityService` read method.
- Apply `restrictToUserIds` as an independent `AND` condition
  (`userId IS NULL OR userId IN (...)`) combined with whatever other filter is active — an explicit
  `actorUserId=<real-id>` query param must silently return nothing, not bypass the restriction.
- Anonymous requests (`userId: null`) stay visible; only real non-demo user ids are hidden.
- See [[feedback-demo-account-write-guard]]-style reasoning: this is the read-side twin of blocking
  demo mutations — any "soft" account-type restriction needs a server-side check, not just a
  frontend filter.

## Retention

- `LOG_RETENTION_DAYS` (default 30) and `AUDIT_RETENTION_DAYS` (default 365) are intentionally
  different — audit is a compliance/investigation trail and needs to outlive operational logs.
- Purge only runs via the scheduled `observability-retention.runner.ts`; do not add a second trigger
  path (e.g. an admin endpoint) without checking whether double-purge is safe.
- Keep the log/audit purge windows separate so retention policy can change independently per
  category.

## Cold-Start Observation (optional layer)

- Gated by `OBSERVABILITY_DB_COLD_START_ENABLED`; code lives isolated in
  `src/observability/infrastructure/db/db-cold-start-observer.ts`.
- Keep this layer removable by flag alone — do not let core logging/audit behavior depend on it
  being enabled.

## Dashboard Filters

- The `path` filter is a curated `<select>` (`KNOWN_LOG_PATH_GROUPS` in
  `frontend/src/app/features/developer/api/developer-logs.models.ts`) matched by `contains` on the
  backend. Keep this list in sync when adding new controllers, or new routes silently fall out of
  the filter UI.
- `entityId`/`actorUserId` pickers are searchable comboboxes backed by
  `/developer/logs/entity-options` / `/developer/logs/actor-options`, derived from the audit trail
  itself rather than `GET /users` (which is admin-only).

## Verification

- Focused spec for pure aggregation/mapping logic in `observability.service.spec.ts`.
- `pnpm test:integration -- observability.service.integration-spec.ts` (requires Docker/
  Testcontainers) whenever a raw SQL or JSON-filter query changes — do not consider it validated
  from the unit spec alone.
- e2e coverage for `/developer/logs/*` guard wiring and demo isolation when touching
  `DeveloperLogsController`.

Use `backend-quality-check` for the closing verification pass once the observability-specific checks
above are done.
