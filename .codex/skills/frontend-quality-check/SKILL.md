---
name: frontend-quality-check
description: Select and run the right final verification for Angular frontend changes. Use when Codex is finishing frontend work, deciding which pnpm commands to run, checking changed UI/docs/stories/tests, or preparing a concise quality summary after implementation.
---

# Frontend Quality Check

## Overview

Use this skill before closing Angular frontend work. Choose the smallest verification set that covers
the risk of the change, then report what passed and what could not be run.

## Command Rules

Run commands from `frontend/`.

```txt
pnpm test -- --watch=false
pnpm test:e2e
pnpm build
pnpm build-storybook
```

Do not run Angular or Storybook dev servers hidden in the background. Use focused tests first, then
broaden only when the change affects shared behavior or user-facing flows.

## Verification Matrix

- Pure logic or service change: focused unit/spec test, then broader tests if shared.
- Shared UI component change: focused component spec, relevant Storybook review/build when stories
  changed, and `pnpm build` for public API/template risk.
- Storybook story or MDX docs change: `pnpm build-storybook`.
- Mermaid diagram change: use `mermaid-docs-validator`.
- Route, app shell, or critical journey change: focused component/integration tests plus Playwright
  e2e when the flow depends on browser navigation or real pages.
- i18n change: test default locale and at least one alternate locale when behavior or formatting
  changes.
- Theme/color change: check light and dark behavior through tokens/classes and Storybook when
  relevant.

## Final Review Checklist

- No unrelated user changes were reverted.
- Public component APIs remain typed and consistent.
- Accessibility names, labels, focus, disabled, error, and keyboard behavior are covered where
  relevant.
- Storybook stories and UI docs match changed states, variants, sizes, fills, and conventions.
- Translations are complete for `es`, `en`, and `ca` when visible copy changed.
- Final response names commands run and any residual risk.

## Reporting

Keep the close-out concise. Mention passed checks, skipped checks with the reason, and any follow-up
that is directly useful for the user's request.
