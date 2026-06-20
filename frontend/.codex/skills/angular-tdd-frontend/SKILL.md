---
name: angular-tdd-frontend
description: Angular frontend workflow for test-driven development, modern signal-first Angular code, accessible UI components, Storybook updates, and Mermaid documentation. Use when Codex changes Angular frontend files, creates or updates shared UI components, writes Vitest or Testing Library tests, adds Playwright coverage, documents frontend architecture, or needs to follow this project's TDD and test-diamond conventions.
---

# Angular TDD Frontend

## Overview

Use this skill to make frontend changes in the Angular project with tests first, modern Angular APIs,
accessible UI, and documentation that stays close to the code.

## Project Context

Read `references/project-profile.md` when working inside this repository or when the user asks about
project-specific conventions.

Core assumptions:

- Work from `frontend/` for frontend commands.
- Prefer official framework docs when external information is needed.
- Follow existing local component, Storybook, and test patterns before introducing new ones.

## TDD Workflow

Use red-green-refactor:

1. Write or update the focused test first.
2. Run the focused test and confirm it fails for the expected reason.
3. Implement the smallest useful change.
4. Run the focused test until it passes.
5. Refactor while tests stay green.
6. Broaden verification when the change touches shared UI, routes, state, stories, or docs.

If the first test passes before implementation, revise the test. It must prove the missing behavior.

## BDD Documentation

Use BDD for functional documentation, acceptance criteria, and important user flows. Prefer concise
Gherkin when it clarifies behavior from the user's point of view:

```gherkin
Feature: Complete a task

Scenario: Complete a pending task
  Given the user has a pending task
  When the user marks the task as completed
  Then the task appears as completed
  And the success message is shown
```

Use Mermaid for architecture and technical flows. Use BDD for expected behavior. Use TDD to turn
that behavior into failing tests, implementation, and refactor.

## Test Diamond

Prefer:

- Many Testing Library integration/component tests.
- Fewer narrow unit tests for pure logic.
- Few Playwright e2e tests for critical journeys.

Write tests around user-visible behavior: roles, labels, text, validation, disabled states, events,
state transitions, and accessibility attributes.

When translated UI is involved, use `provideI18nTesting()` or the local test helper already used in
the project. When locale-sensitive formatting is involved, test at least one alternate locale.
When shared theme styles change, include focused assertions that prove the component uses the
theme-aware classes or semantic CSS tokens expected by the project.

## Angular Guidelines

- Prefer standalone components.
- Prefer `input()`, `output()`, `model()`, `signal()`, and `computed()`.
- Use `effect()` sparingly and only for necessary side effects.
- Keep component APIs typed.
- Keep templates readable and accessible.
- Prefer `inject()` when it matches project style.
- Avoid legacy Angular patterns unless the existing code or library interop requires them.

## Internationalization

- Use Transloco for user-visible text in features and shared UI components.
- Avoid hardcoded visible strings except for technical literals, very local test labels, or
  non-visible internal identifiers.
- Keep translations complete for the supported locales: `es`, `en`, and `ca`.
- Use `LocaleService` for locale-dependent behavior such as dates, regional formatting, and active
  language state.
- Verify language changes when a component renders translated text or locale-formatted values.

## Theme and Color Mode

- Use semantic CSS tokens such as `--ui-*` and existing theme classes for UI that must work in
  light and dark mode.
- Do not add public inputs such as `darkMode`; color mode comes from `data-theme` and
  `ColorModeService`.
- Validate relevant states in `light`, `dark`, and `system` when the change affects global theme or
  Storybook theme behavior.
- Preserve contrast, visible focus, and disabled/error states in every supported color mode.

## UI and Storybook

For shared UI components, keep these files together:

```txt
<component>.ts
<component>.html
<component>.css
<component>.stories.ts
<component>.spec.ts
```

When changing UI component behavior or API, update stories and relevant MDX docs.

New or changed stories must work with the Storybook `Theme` toolbar. Stories for components with
translated text, dates, times, numbers, or regional formatting must also work with the `Locale`
toolbar. If a change adds a visual variant, token, size, fill, accessibility pattern, or component
convention, review `frontend/src/app/shared/ui/docs/foundations.mdx` and update it when needed.

When creating a new shared UI component, use `ui-component-scaffold` for the component creation
checklist and expected files.

## Content Tone

Use kind, formal, and direct text in UI and documentation.

- Prefer "Revisa el correo introducido." over "Correo invalido."
- Prefer "No hay tareas todavia." over "Sin datos."
- Prefer "La tarea se ha completado correctamente." over "Hecho."

Messages should describe the state or next action without blaming the user.

## Documentation

Use `frontend/docs/` for frontend technical documentation and Mermaid diagrams.
Use `frontend/src/app/shared/ui/docs/` for Storybook UI documentation.

When documenting architecture, flows, dependencies, or testing strategy, include concise Mermaid
diagrams near the explanation they support.
When creating or editing Mermaid diagrams, use `mermaid-docs-validator` to validate the code fences
before closing the documentation change.

## Closing Checks

Use `frontend-quality-check` before closing frontend work to choose focused tests, builds,
Storybook checks, e2e checks, and Mermaid validation based on the actual files changed.
