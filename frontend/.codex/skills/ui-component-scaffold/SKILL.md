---
name: ui-component-scaffold
description: Scaffold and implement Angular shared UI components with colocated TypeScript, template, CSS, Storybook stories, and Testing Library specs. Use when Codex creates a new reusable component under frontend/src/app/shared/ui, adds a major shared UI component state/API, or needs a repeatable component creation checklist.
---

# UI Component Scaffold

## Overview

Use this skill to create shared Angular UI components that match the project's structure, tests,
Storybook coverage, accessibility, i18n, and theme conventions.

## Component Structure

Create shared UI components in:

```txt
frontend/src/app/shared/ui/<component>/
```

Use kebab-case folder names and keep these files together:

```txt
<component>.ts
<component>.html
<component>.css
<component>.stories.ts
<component>.spec.ts
```

Prefer standalone components, typed `input()`, `output()`, `model()`, `signal()`, and `computed()`.
Use `inject()` when it matches existing local style.

## Work Order

1. Inspect nearby shared UI components with similar behavior, API shape, or visual states.
2. Write the focused spec first for the missing user-visible behavior.
3. Create the component files in the standard shared UI folder structure.
4. Implement the smallest component API and template that satisfy the test.
5. Add stories for the relevant states and controls.
6. Update shared UI docs when the component adds or changes a convention.
7. Close with `frontend-quality-check` to choose the right tests, build, Storybook, and docs checks.

## Public API Defaults

- Use shared variants when relevant: `primary`, `secondary`, `neutral`, `danger`, `violet`.
- Use shared sizes when relevant: `sm`, `md`, `lg`.
- Use shared appearances when relevant: `default`, `minimal`.
- Use `model()` for controlled values that need two-way binding.
- Keep domain copy and validation decisions in the consumer unless the component is explicitly about
  that behavior.

## Accessibility, i18n, and Theme

- Prefer native controls: `button`, `input`, `select`, `textarea`.
- Connect labels, hints, and errors with `for`, `id`, `aria-describedby`, and `aria-invalid`.
- Add `aria-label` only when no visible name exists.
- Use Transloco for visible shared UI text; use `provideI18nTesting()` in specs when needed.
- Use `LocaleService` for locale-sensitive dates, times, numbers, or active-language behavior.
- Use semantic CSS tokens and existing theme classes instead of hardcoded colors for light/dark UI.
- Keep focus, disabled, error, selected, checked, and loading states visible in every color mode.

## Stories

Add focused stories that expose the real component, not a landing page. Include the states that
apply:

- `Default`
- `Disabled`
- `Error`
- `Sizes`
- `Variants`
- Special states such as loading, selected, empty, range, or readonly

Stories with text or regional formatting must work with the Storybook `Locale` toolbar. All stories
must work with the `Theme` toolbar.

## Tests

Write or update the focused spec first. Test user-visible behavior:

- Roles, labels, text, accessible names, and ARIA attributes.
- Events and model updates.
- Disabled, error, selected, checked, loading, and keyboard behavior.
- Important theme-aware classes or tokens when styles are part of the contract.
- Alternate locale when formatting changes with language.

Run the focused component test during development. Broaden verification with the frontend quality
check skill when the component touches docs, stories, shared APIs, or cross-component behavior.

## Documentation

Update `frontend/src/app/shared/ui/docs/*.mdx` when adding or changing variants, sizes, fills,
accessibility patterns, component conventions, or catalog entries.
