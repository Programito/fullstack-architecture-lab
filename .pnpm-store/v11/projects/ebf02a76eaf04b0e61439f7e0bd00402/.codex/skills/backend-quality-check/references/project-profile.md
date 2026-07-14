# Backend Quality Check Reference

Use this reference to pick final verification for `C:\Users\Thor_\Documents\Proyecto\backend`.

## Commands

Run from `backend/`:

```txt
pnpm build
pnpm test
pnpm test:integration
pnpm test:e2e
pnpm prisma:generate
pnpm prisma:deploy
pnpm prisma:seed
```

## Heuristics

- Default to focused tests before full backend suites.
- Use `pnpm test` for in-memory application logic and fast feedback.
- Use `pnpm test:integration` when Prisma persistence behavior matters.
- Use `pnpm test:e2e` for route wiring, cookies, guards, and auth flows.
- Use `pnpm build` when module wiring, imports, DTO exports, or Nest compilation risk changed.
- Use Prisma commands when schema, migrations, generated client expectations, or seeds changed.

## Environment Notes

- Integration tests use Testcontainers and require Docker access.
- The backend can run with in-memory identity data for local work.
- Some persistence code exists even when active module wiring still points to in-memory adapters.
