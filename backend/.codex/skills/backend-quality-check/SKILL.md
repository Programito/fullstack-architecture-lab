---
name: backend-quality-check
description: Select and run the right final verification for NestJS backend changes in this repository. Use when Codex is finishing backend work, deciding which pnpm or Prisma commands to run, or preparing a concise backend quality summary.
---

# Backend Quality Check

## Overview

Use this skill before closing backend work. Choose the smallest verification set that covers the
risk of the change, then report what passed, what was skipped, and any residual risk.

## Command Rules

Run commands from `backend/`.

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

Use focused tests first, then broaden only when the changed files increase architectural or
contract risk.

## Verification Matrix

- Pure domain helper, value object, or result change: focused unit/application spec.
- Use case change with in-memory adapters: focused use-case spec, then `pnpm test` if shared.
- Controller, guard, cookie, or auth flow change: focused e2e spec and broader e2e coverage when
  the route is shared or security-sensitive.
- Prisma repository, relation, transaction, or mapping change: `pnpm test:integration`.
- Schema, migration, or seed change: relevant Prisma command plus focused tests and integration
  coverage when behavior depends on the database shape.
- App wiring or provider selection change: `pnpm build` plus the most relevant test level for the
  affected modules.

## Final Review Checklist

- No unrelated user changes were reverted.
- Module provider wiring still matches the intended adapter and port tokens.
- DTO, controller, and response mappings still match the public API contract.
- In-memory and Prisma adapters remain aligned where they implement the same port.
- Seeds and migrations reflect the same data assumptions.
- Final response names commands run and any skipped checks with the reason.

## Reporting

Keep the close-out concise. Mention passed checks, skipped checks with the reason, and the next
useful follow-up only when it directly helps the user.
