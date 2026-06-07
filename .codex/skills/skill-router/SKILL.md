---
name: skill-router
description: Choose and combine Codex skills for a task. Use when the user asks what skill to use, wants to improve the skill setup, requests a skill recommendation, or gives a multi-area task where multiple skills may apply.
---

# Skill Router

## Overview

Use this skill to choose the smallest useful set of skills for the current task. Prefer one primary
skill, then add secondary skills only when they provide distinct procedural value.

## Routing Matrix

- Angular frontend, shared UI, Vitest, Testing Library, Playwright, Storybook, or frontend docs:
  use `angular-tdd-frontend`.
- New Angular shared UI component scaffolding: use `ui-component-scaffold`.
- Final verification for Angular frontend work: use `frontend-quality-check`.
- Creating or updating Codex skills: use `skill-creator`.
- Installing curated or repository skills: use `skill-installer`.
- Creating or scaffolding Codex plugins: use `plugin-creator`.
- OpenAI API, ChatGPT, Codex surfaces, model choice, or official OpenAI docs: use `openai-docs`.
- Mermaid diagrams in Markdown or MDX documentation: use `mermaid-docs-validator`.
- Bitmap image generation or editing: use `imagegen`.

## Combining Skills

- Use `angular-tdd-frontend` plus `mermaid-docs-validator` for frontend documentation with Mermaid
  diagrams.
- Use `ui-component-scaffold` plus `angular-tdd-frontend` when creating a new shared UI component.
- Use `frontend-quality-check` after `angular-tdd-frontend` or `ui-component-scaffold` work to close
  with the right tests and builds.
- Use `skill-creator` plus the target domain skill when improving an existing skill for that domain.
- Use `openai-docs` plus `plugin-creator` only when a plugin depends on current OpenAI product
  behavior.
- Avoid loading a secondary skill when the primary skill already fully covers the request.

## Priority Rules

- For frontend implementation, use `angular-tdd-frontend` as the primary skill.
- For a new shared UI component, use `ui-component-scaffold` as primary and `angular-tdd-frontend`
  for project-wide Angular workflow.
- For final verification of frontend work, use `frontend-quality-check`.
- For Markdown or MDX docs with Mermaid diagrams, use `mermaid-docs-validator`.
- For creating or editing skills themselves, use `skill-creator` even when the skill being edited is
  domain-specific.

## Decision Rules

- Prefer the skill named by the user when it exists and matches the request.
- If no skill clearly applies, proceed with general Codex behavior instead of forcing a skill.
- If two skills conflict, follow the more task-specific skill for domain workflow and the broader
  skill only for general process guidance.
- Keep routing lightweight; do not replace accurate skill descriptions with router-only knowledge.

## Future Candidates

- Consider an `i18n-audit` skill only after repeated work on translations shows real friction, such
  as hardcoded visible strings, missing `es`/`en`/`ca` keys, inconsistent locale formatting, or tests
  that frequently miss `provideI18nTesting()`.
