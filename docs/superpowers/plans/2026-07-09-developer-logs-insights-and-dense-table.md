# Developer Logs Insights And Dense Table Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a mixed insight band and a denser, more actionable events table to `/developer/logs`.

**Architecture:** Compute three top insight cards in `DeveloperLogsPage` from the existing summary, comparison, and hotspot data already loaded for the dashboard. Extend the shared `app-table` with a narrow action-cell capability, then use that capability in the developer logs page to expose inline drill-down actions without replacing current row selection or event detail behavior.

**Tech Stack:** Angular standalone components, signals, Transloco, Testing Library, Vitest, existing shared UI table/chart components.

## Global Constraints

- Work from `frontend/` for frontend commands.
- Use `pnpm` for dependency and script commands.
- Follow TDD: write the failing test first, verify it fails, then implement the minimum code.
- Keep existing `/developer/logs` query param behavior intact.
- Reuse existing filter helpers such as `applyFilterState(...)` instead of inventing a second navigation path.
- Keep user-visible copy in Transloco and update `es`, `en`, and `ca`.
- Do not replace the current KPI, chart, or event-detail flows.
- Keep `app-table` generic and add only the minimum extension needed for compact inline actions.
- Do not revert unrelated user changes.

---

### Task 1: Define mixed insights on the developer logs page

**Files:**
- Modify: `frontend/src/app/features/developer/pages/developer-logs-page/developer-logs-page.spec.ts`
- Modify: `frontend/src/app/features/developer/pages/developer-logs-page/developer-logs-page.ts`
- Modify: `frontend/src/app/features/developer/pages/developer-logs-page/developer-logs-page.html`
- Modify: `frontend/src/app/features/developer/pages/developer-logs-page/developer-logs-page.css`
- Modify: `frontend/public/i18n/es.json`
- Modify: `frontend/public/i18n/en.json`
- Modify: `frontend/public/i18n/ca.json`

**Interfaces:**
- Consumes: `summary(): DeveloperLogSummaryDto | null`, `breakdown(): DeveloperLogBreakdownDto`, `topSlowPaths()`, `topErrorEvents()`
- Produces:
  - `insightCards(): DeveloperLogInsightCardVm[]`
  - `focusInsight(card: DeveloperLogInsightCardVm): void`

- [ ] **Step 1: Write the failing page tests for insight rendering and click behavior**
- [ ] **Step 2: Run `pnpm exec ng test --watch=false --include src/app/features/developer/pages/developer-logs-page/developer-logs-page.spec.ts` and confirm the new tests fail**
- [ ] **Step 3: Add a typed view-model and computed insight-card builder in `developer-logs-page.ts`**
- [ ] **Step 4: Render the insight band above the KPI cards in `developer-logs-page.html`**
- [ ] **Step 5: Add compact, tone-aware styles in `developer-logs-page.css` and short copy in all three locale files**
- [ ] **Step 6: Re-run the page spec and confirm the new insight tests pass**

### Task 2: Extend the shared table with compact inline actions

**Files:**
- Modify: `frontend/src/app/shared/ui/table/table.spec.ts`
- Modify: `frontend/src/app/shared/ui/table/table.ts`
- Modify: `frontend/src/app/shared/ui/table/table.html`
- Modify: `frontend/src/app/shared/ui/table/table.css`

**Interfaces:**
- Consumes: `TableRow`
- Produces:
  - `TableAction = { label: string; ariaLabel?: string; value: string }`
  - `TableColumn.actions?: true`
  - `rowAction = output<{ action: string; row: TableRow }>()`

- [ ] **Step 1: Write the failing shared-table tests for rendering compact row actions and stopping row selection when they are clicked**
- [ ] **Step 2: Run `pnpm exec ng test --watch=false --include src/app/shared/ui/table/table.spec.ts` and confirm the new tests fail**
- [ ] **Step 3: Add the minimal action-column support to `table.ts` and emit `rowAction` with the clicked action id plus row**
- [ ] **Step 4: Render compact action buttons in `table.html`, keeping existing default cell rendering for non-action columns**
- [ ] **Step 5: Add dense action-cell styling in `table.css` without changing the generic table API beyond this narrow feature**
- [ ] **Step 6: Re-run the shared-table spec and confirm it passes**

### Task 3: Use the new table actions in developer logs and densify the rows

**Files:**
- Modify: `frontend/src/app/features/developer/pages/developer-logs-page/developer-logs-page.spec.ts`
- Modify: `frontend/src/app/features/developer/pages/developer-logs-page/developer-logs-page.ts`
- Modify: `frontend/src/app/features/developer/pages/developer-logs-page/developer-logs-page.html`
- Modify: `frontend/src/app/features/developer/pages/developer-logs-page/developer-logs-page.css`
- Modify: `frontend/public/i18n/es.json`
- Modify: `frontend/public/i18n/en.json`
- Modify: `frontend/public/i18n/ca.json`

**Interfaces:**
- Consumes:
  - `rowAction` output from `app-table`
  - `applyFilterState(patch: Partial<DeveloperLogFilters>, view: DeveloperLogsView): void`
- Produces:
  - `eventTableColumns(): TableColumn[]`
  - `handleRowAction(event: { action: string; row: TableRow }): void`

- [ ] **Step 1: Write the failing page tests for inline row actions and row-click isolation**
- [ ] **Step 2: Run `pnpm exec ng test --watch=false --include src/app/features/developer/pages/developer-logs-page/developer-logs-page.spec.ts` and confirm the new tests fail**
- [ ] **Step 3: Enrich event rows with compact display values plus per-row action metadata in `developer-logs-page.ts`**
- [ ] **Step 4: Wire `app-table` action handling from `developer-logs-page.html` into existing filter behavior**
- [ ] **Step 5: Tighten the developer-logs table styling so rows read denser without losing clarity**
- [ ] **Step 6: Re-run the page spec and confirm the inline action tests pass**

### Task 4: Verify the full slice

**Files:**
- Review: `frontend/src/app/features/developer/pages/developer-logs-page/developer-logs-page.spec.ts`
- Review: `frontend/src/app/shared/ui/table/table.spec.ts`

**Interfaces:**
- Consumes: all changes from Tasks 1-3
- Produces: fresh verification evidence before final commit

- [ ] **Step 1: Run `pnpm exec ng test --watch=false --include src/app/features/developer/pages/developer-logs-page/developer-logs-page.spec.ts`**
- [ ] **Step 2: Run `pnpm exec ng test --watch=false --include src/app/shared/ui/table/table.spec.ts`**
- [ ] **Step 3: Run `pnpm exec ng test --watch=false --include src/app/shared/ui/chart/chart.spec.ts`**
- [ ] **Step 4: Run `pnpm build`**
- [ ] **Step 5: Commit only the implementation files for this slice**

## Self-Review

- Spec coverage:
  - mixed insight band: covered by Task 1.
  - compact shared action-cell support: covered by Task 2.
  - dense developer logs rows and inline drill-downs: covered by Task 3.
  - verification: covered by Task 4.
- Placeholder scan:
  - no `TODO` or `TBD` placeholders remain.
  - all tasks name exact files and commands.
- Type consistency:
  - the plan keeps the shared table extension narrow by using one `rowAction` output and action metadata on rows, then consumes that output in the logs page.
