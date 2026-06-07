# Project Profile

Use this reference for `C:\Users\Thor_\Documents\Proyecto`.

## Frontend Stack

- Angular
- pnpm
- Tailwind CSS
- Vitest
- Testing Library
- Playwright
- Storybook

## Commands

Run from `frontend/`:

```txt
pnpm test -- --watch=false
pnpm test:e2e
pnpm build
pnpm build-storybook
```

Do not run Angular or Storybook dev servers hidden in the background.

## Component Location

Reusable UI components live in:

```txt
frontend/src/app/shared/ui/<component>/
```

Each shared UI component should keep implementation, template, styles, Storybook stories, and tests
together.

## Documentation

- Frontend technical docs: `frontend/docs/`
- Storybook UI docs: `frontend/src/app/shared/ui/docs/`
- Future backend docs: `backend/docs/`

Use Mermaid diagrams for architecture, workflows, dependencies, and testing strategy when a diagram
clarifies the text.

## Internationalization and Theme

- The app uses Transloco with `LocaleService`; the default locale is `es` and supported locales are
  `es`, `en`, and `ca`.
- Use `provideI18nTesting()` in focused tests for translated UI and test an alternate locale when
  formatting or language switching matters.
- The app uses `ColorModeService`, `data-theme`, and semantic CSS tokens for `system`, `light`, and
  `dark` preferences.
- Shared UI should use theme-aware tokens/classes instead of hardcoded colors when it needs to work
  across light and dark mode.

## Testing Preference

Use a test diamond:

- Many integration/component tests with Testing Library.
- Fewer unit tests for pure logic.
- Few Playwright e2e tests for critical journeys.

Always prefer a failing test first, then implementation, then refactor.

## BDD Documentation

Use BDD/Gherkin for functional documentation, acceptance criteria, and important user flows. Keep it
close to the behavior it describes, then use TDD to implement the behavior with tests first.

## Content Tone

Use kind, formal, and direct Spanish for UI text and documentation. Messages should be useful,
respectful, and action-oriented.
