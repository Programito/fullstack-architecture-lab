# Developer Logs Mixed Insights And Dense Table Design

## Goal

Improve `/developer/logs` with two complementary UX upgrades:

- a compact top insight band that combines summary context with actionable alerts
- a denser events table with inline quick actions for the most common drill-downs

The result should help a developer understand whether the selected period looks healthy in a few seconds and then pivot into the right filtered view with fewer clicks.

## Scope

This design only covers the Angular developer logs page and the smallest supporting frontend changes required to render the new experience.

In scope:

- new insight cards above the KPI section
- denser event-row presentation
- inline row actions that reuse existing filter behavior
- translation updates for visible copy
- focused frontend tests and existing frontend verification

Out of scope:

- replacing existing summary KPIs or charts
- changing dashboard routes or query param contract
- large backend changes
- new persistence, analytics, or alerting jobs

## Design Summary

The page will keep its current structure and add a new decision layer near the top:

1. `Insights band`
   Three compact cards derived from existing page data.
2. `Existing KPI and charts`
   Preserved as they are today.
3. `Denser events table`
   Same event source and selection behavior, but with clearer scanning and fast filters inline.

This keeps the dashboard familiar while making the first screen more informative and the table more useful in daily debugging.

## Insights Band

The new band will render three cards:

### 1. Overview

Purpose:
- give a very fast status snapshot for the current range

Content:
- total requests in the active range
- current error rate
- comparison hint versus previous period

Example reading:
- `1,248 requests`
- `3.1% error rate`
- `-18% vs previous`

Behavior:
- purely informative
- no click action required

### 2. Main Alert

Purpose:
- highlight the single most relevant degradation when the selected period worsens

Priority order:
1. error rate increased
2. p95 latency increased
3. error count increased
4. no alert if all tracked signals are flat or improved

Content:
- short label such as `Error rate rising`
- concise value like `+1.6 pp vs previous`
- optional supporting line like `4.8% now`

Behavior:
- clickable
- clicking applies the most relevant existing filter state

Filter rules:
- error-rate or error-count alert maps to `category: request` and `level: error`
- latency alert maps to `category: request`
- no-alert state has no click behavior

### 3. Current Focus

Purpose:
- surface the most actionable hotspot from current data

Selection rules:
1. if `topErrorEvents` exists, show the top error event with its route or origin
2. else if `topSlowPaths` exists, show the slowest relevant path
3. else if origin breakdown exists, show the busiest channel
4. else show a neutral fallback

Content examples:
- `Most repeated error: http.request.failed`
- `Slowest route: /api/v1/orders/:id/payments`
- `Busiest channel: web-pos`

Behavior:
- clickable when backed by a concrete route, event, or origin
- reuses existing filter helpers already present in the page

## Insight Derivation

The band should be computed entirely in the frontend from already-loaded dashboard data:

- `summary`
- `summary.comparison`
- `topErrorEvents`
- `topSlowPaths`
- `breakdown.origins`

No backend contract change is required for this slice unless implementation reveals a missing field that prevents a meaningful summary. If that happens, it should be treated as a separate follow-up instead of expanding this scope silently.

## Dense Events Table

The event table keeps the current event source, paging, and detail drawer behavior, but becomes more compact and more actionable.

### Visual Densification

Changes:

- reduce vertical padding per row
- use tighter text hierarchy for secondary fields
- render `level`, `category`, and `clientOrigin` as compact visual tokens instead of plain text
- keep the existing table readable on mobile and desktop

The table should remain clearly scannable and must not turn into a badge wall. Tokens should be short and consistent with current theme colors.

### Inline Quick Actions

Each row gains a small set of lightweight actions. Recommended actions:

- filter by route when `path` exists
- filter by origin when `clientOrigin` exists
- filter by actor when `userId` exists
- filter by result when `result` exists

Not every row needs every action. Actions should render only when the row actually has the required value.

Behavior:

- actions must stop row selection when clicked
- actions must reuse existing `applyFilterState(...)` patterns so URL sync and current page behavior remain consistent
- actions should reset pagination to page 1 through the same existing mechanism used elsewhere

## Table Component Strategy

Preferred approach:

- keep `app-table` generic
- enrich `rows` in `DeveloperLogsPage` with display-ready values and a small `actions` payload
- add the minimum extension to `app-table` needed to support a compact actions cell

This avoids custom one-off markup for the entire table while keeping the shared component reusable.

The extension should stay intentionally narrow:

- support a column that renders compact action buttons from row metadata
- keep existing default string rendering for all other columns

Do not turn the table into a full slot-based render system in this slice.

## Accessibility

Requirements:

- action buttons must have explicit accessible names
- clicking an action must not also trigger row selection
- focus states must remain visible
- dense styling must preserve readable contrast and hit targets
- informational insight cards that are not interactive should not pretend to be buttons

## Internationalization

Add new visible strings in:

- `frontend/public/i18n/es.json`
- `frontend/public/i18n/en.json`
- `frontend/public/i18n/ca.json`

New copy groups will cover:

- insight titles
- alert states
- fallback text
- row action labels

Copy should stay short, technical, and calm.

## Files Expected To Change

Primary page:

- `frontend/src/app/features/developer/pages/developer-logs-page/developer-logs-page.ts`
- `frontend/src/app/features/developer/pages/developer-logs-page/developer-logs-page.html`
- `frontend/src/app/features/developer/pages/developer-logs-page/developer-logs-page.css`
- `frontend/src/app/features/developer/pages/developer-logs-page/developer-logs-page.spec.ts`

Shared UI:

- `frontend/src/app/shared/ui/table/table.ts`
- `frontend/src/app/shared/ui/table/table.html`
- `frontend/src/app/shared/ui/table/table.css`
- `frontend/src/app/shared/ui/table/table.spec.ts`

Translations:

- `frontend/public/i18n/es.json`
- `frontend/public/i18n/en.json`
- `frontend/public/i18n/ca.json`

## Testing Strategy

Follow focused TDD:

1. add page tests for insight-band rendering and click behavior
2. add shared table tests for inline actions and click isolation
3. implement the minimum page and table changes
4. rerun focused specs
5. rerun frontend build

Minimum verification:

- `pnpm exec ng test --watch=false --include src/app/features/developer/pages/developer-logs-page/developer-logs-page.spec.ts`
- `pnpm exec ng test --watch=false --include src/app/shared/ui/table/table.spec.ts`
- `pnpm exec ng test --watch=false --include src/app/shared/ui/chart/chart.spec.ts`
- `pnpm build`

## Risks And Mitigations

### Risk: the insight band becomes noisy

Mitigation:
- only show three cards
- choose one main alert, not many
- keep labels short and values explicit

### Risk: the table extension becomes too generic

Mitigation:
- add only a narrow action-cell capability
- avoid introducing arbitrary template rendering in this slice

### Risk: row actions conflict with row selection

Mitigation:
- ensure actions stop propagation
- add a specific test that proves action clicks do not open the detail panel

### Risk: badge-heavy rows reduce readability

Mitigation:
- use compact tokens only for `level`, `category`, and `origin`
- keep event and message text plain

## Recommended Implementation Order

1. define page tests for insight cards and row actions
2. define shared table tests for action rendering and click isolation
3. implement minimal shared-table support
4. implement page insight computation and new row actions
5. refine compact styling
6. run focused verification and build

## Decision Record

Chosen direction: mixed.

Why:
- `alerts only` improves monitoring but leaves the table too slow for drill-down
- `table only` improves detail work but misses the fast first-read summary
- the mixed approach gives both top-level diagnosis and low-friction navigation while staying within the current dashboard architecture
