# AGENTS.md

## Project

This repository contains:

- a modern Angular frontend
- a NestJS backend

The frontend uses:

- Angular
- pnpm
- Tailwind
- Vitest
- Testing Library
- Playwright
- Storybook

The backend uses:

- NestJS
- pnpm
- Prisma
- PostgreSQL
- Vitest
- Supertest
- Testcontainers

## Commands

Run commands from `frontend/` or `backend/` depending on the area you change.

- Install dependencies: `pnpm install`
- Run app: `pnpm start`
- Run tests: `pnpm test -- --watch=false`
- Run e2e tests: `pnpm test:e2e`
- Run Storybook: `pnpm storybook`
- Build app: `pnpm build`
- Build Storybook: `pnpm build-storybook`

Backend commands:

- Install dependencies: `pnpm install`
- Run app: `pnpm dev`
- Build app: `pnpm build`
- Run tests: `pnpm test`
- Run integration tests: `pnpm test:integration`
- Run e2e tests: `pnpm test:e2e`
- Generate Prisma client: `pnpm prisma:generate`
- Create local migration: `pnpm prisma:migrate`
- Apply committed migrations: `pnpm prisma:deploy`
- Run seeds: `pnpm prisma:seed`

Do not run Angular or Storybook hidden in the background. Keep dev servers visible so errors are easy to see.

## Codex Skills

Project Codex skills are versioned in:

```txt
.codex/skills/
```

These are the shared project copies. The active personal installation still lives in `~/.codex/skills/`; keep both in sync when changing project workflow skills.

Backend workflow skills should live alongside frontend workflow skills in `.codex/skills/`.

## UI Components

Reusable UI components live in:

```txt
frontend/src/app/shared/ui/<component>/
```

Each component should keep its implementation, Storybook stories and tests together:

```txt
<component>.ts
<component>.html
<component>.css
<component>.stories.ts
<component>.spec.ts
```

Storybook documentation for the UI lives in:

```txt
frontend/src/app/shared/ui/docs/
```

## Component Guidelines

- Prefer small standalone components with typed inputs and outputs.
- Keep visual APIs consistent across components.
- Use shared variant names where possible: `primary`, `secondary`, `neutral`, `danger`, `violet`.
- Use common sizes where possible: `sm`, `md`, `lg`.
- Add stories for default, disabled, error, sizes, variants and special states when applicable.
- Add focused tests for rendering, events, accessibility attributes and important state classes.

## UI Change Checklist

When changing a UI component, its API or its Storybook stories:

- Update or add stories for the changed states.
- Review `frontend/src/app/shared/ui/docs/*.mdx` and update docs when variants, sizes, fills, accessibility patterns or component conventions change.
- Keep accessibility behavior aligned with the component docs.
- Run focused tests for the touched component.
- Run `pnpm build-storybook` when Storybook stories or MDX docs change.

## Accessibility

- Prefer native controls: `button`, `input`, `select`, `textarea`.
- Use real labels connected with `for` and `id`.
- Use `aria-describedby` for hint, description and error text.
- Use `aria-invalid="true"` for invalid fields.
- Provide visible focus states.
- Avoid nested interactive elements.
- Add `aria-label` when a control has no visible text.

## Backend Notes

- Keep backend changes scoped to the requested module or feature.
- Prefer the existing clean-architecture split: `domain`, `application`, `infrastructure`, `presentation`.
- Keep REST endpoints versioned under `/api/v1`.
- Treat `backend/prisma/schema.prisma` plus committed migrations as the persistence source of truth.
- Keep Prisma seeds in `backend/prisma/seeds/` and use `backend/prisma/seed.ts` as the entry point.
- Prefer focused Vitest specs first, then broaden to integration or e2e when persistence or HTTP wiring changes.
- Integration tests use Testcontainers and require Docker.

## Editing Notes

- Use `pnpm` for dependency and script commands.
- Keep edits scoped to the requested component or feature.
- Do not delete or revert unrelated user changes.
- Prefer readable CSS and existing project conventions over adding new abstractions too early.
