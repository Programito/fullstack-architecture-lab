---
name: mermaid-docs-validator
description: Validate Mermaid diagrams embedded in Markdown and MDX documentation. Use when Codex creates, edits, reviews, or troubleshoots Mermaid code fences in technical docs, Storybook docs, frontend/docs, architecture diagrams, testing diagrams, or documentation that must render reliably.
---

# Mermaid Docs Validator

## Overview

Use this skill when documentation contains Mermaid diagrams. Validate syntax before closing work
that creates or edits Mermaid blocks.

## Workflow

1. Find changed or relevant `.md` and `.mdx` files.
2. Keep diagrams small and close to the text they explain.
3. Prefer `flowchart`, `sequenceDiagram`, or `stateDiagram-v2` unless another Mermaid diagram type
   is clearly better.
4. Use readable labels and stable node ids. Quote labels that contain punctuation, HTML, accents, or
   spaces that could confuse Mermaid.
5. Run the validator:

```bash
python C:\Users\Thor_\.codex\skills\mermaid-docs-validator\scripts\validate_mermaid_docs.py frontend\docs frontend\src\app\shared\ui\docs
```

Use `--list` for a quick inspection pass that reports Mermaid blocks without rendering them.

## Validator Behavior

The script extracts fenced code blocks marked as `mermaid` from `.md` and `.mdx` files. It validates
each block separately and reports the source file, block number, line number, and Mermaid CLI error.

Example success output:

```txt
OK frontend\docs\testing.md:26 block 1
Validated 1 Mermaid block(s).
```

Example failure output:

```txt
FAIL frontend\docs\testing.md:26 block 1
Error: Parse error on line 3
```

The script uses:

- `mmdc` when it is already installed and available on `PATH`.
- `pnpm dlx @mermaid-js/mermaid-cli` as a fallback when `mmdc` is not available.
- Playwright's Chromium automatically when it can be discovered from the current repo or a
  `frontend/` child directory.

If the fallback needs network access, request approval before running it. Do not add
`@mermaid-js/mermaid-cli` to a project `package.json` unless the user explicitly asks for a project
dependency.

If Mermaid CLI fails because Chrome or Puppeteer cannot find a browser, rerun the validator from the
repository root when the repo has a `frontend/` directory. The script can discover Playwright's
Chromium from that location and pass it to Mermaid CLI automatically.

## Style Notes

- Avoid very large diagrams; split them when they stop fitting in one glance.
- Prefer simple direction choices like `flowchart TB` and `flowchart LR`.
- Keep node names stable and labels human-readable.
- Avoid decorative diagrams. Use Mermaid for architecture, flows, dependencies, and test strategy.
