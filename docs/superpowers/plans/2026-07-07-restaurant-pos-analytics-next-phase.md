# Restaurant POS Analytics Next Phase Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add high-value dashboard improvements to Restaurant POS analytics: clickable filter chips, stable chart loading skeletons, and Excel export from the already loaded analytics report.

**Architecture:** Keep the current analytics API contract unchanged and build everything in the Angular frontend on top of `RestaurantAnalyticsReportDto`. Extend the dashboard page with small internal view models and one focused export helper so filters, loading placeholders, and file export stay deterministic and testable.

**Tech Stack:** Angular 21 standalone components, signals/computed state, Transloco, Testing Library + Vitest, existing shared UI components, and one new frontend Excel library dependency.

## Global Constraints

- Do not change `GET /restaurants/:id/analytics/report` or backend DTOs in this phase.
- Keep all new visible copy translated for `es`, `en`, and `ca`.
- Reuse existing shared UI components and dashboard patterns before inventing new abstractions.
- Preserve current `loading`, `empty`, `error`, `table/chart`, and URL-sync behavior.
- Keep the dashboard currency assumption as frontend `EUR` until the API exposes currency.

---

## File Structure

- Modify: `frontend/src/app/features/restaurant-pos/pages/restaurant-pos-dashboard-page/restaurant-pos-dashboard-page.ts`
  - Add removable chip actions, export action wiring, and chart-loading view models.
- Modify: `frontend/src/app/features/restaurant-pos/pages/restaurant-pos-dashboard-page/restaurant-pos-dashboard-page.html`
  - Render clickable chips, export button/menu entry point, and chart skeleton states.
- Modify: `frontend/src/app/features/restaurant-pos/pages/restaurant-pos-dashboard-page/restaurant-pos-dashboard-page.css`
  - Add compact chip button styling, skeleton layout sizing, and export action spacing.
- Modify: `frontend/src/app/features/restaurant-pos/pages/restaurant-pos-dashboard-page/restaurant-pos-dashboard-page.spec.ts`
  - Cover chip removal, chart loading placeholders, and export initiation behavior.
- Modify: `frontend/package.json`
  - Add one Excel writer dependency.
- Create: `frontend/src/app/features/restaurant-pos/pages/restaurant-pos-dashboard-page/restaurant-pos-dashboard-export.ts`
  - Build workbook data from `RestaurantAnalyticsReportDto` and trigger `.xlsx` download.
- Create: `frontend/src/app/features/restaurant-pos/pages/restaurant-pos-dashboard-page/restaurant-pos-dashboard-export.spec.ts`
  - Verify workbook sheet structure and metadata rows without touching DOM.
- Modify: `frontend/src/app/shared/i18n/i18n-testing.ts`
  - Add translation keys used by export and chip actions in tests.
- Modify: `frontend/public/i18n/es.json`
- Modify: `frontend/public/i18n/en.json`
- Modify: `frontend/public/i18n/ca.json`
  - Add export labels and filter chip accessibility strings.

## Task 1: Make Active Filter Chips Interactive

**Files:**
- Modify: `frontend/src/app/features/restaurant-pos/pages/restaurant-pos-dashboard-page/restaurant-pos-dashboard-page.ts`
- Modify: `frontend/src/app/features/restaurant-pos/pages/restaurant-pos-dashboard-page/restaurant-pos-dashboard-page.html`
- Modify: `frontend/src/app/features/restaurant-pos/pages/restaurant-pos-dashboard-page/restaurant-pos-dashboard-page.css`
- Test: `frontend/src/app/features/restaurant-pos/pages/restaurant-pos-dashboard-page/restaurant-pos-dashboard-page.spec.ts`

**Interfaces:**
- Consumes: `quickRange`, `dateInputs`, `setQuickRange(range: string): void`, `resetFilters(): void`
- Produces:
  - `activeFilterChips: Signal<Array<{ key: 'range' | 'from' | 'to'; label: string; removable: boolean }>>`
  - `removeFilterChip(key: 'range' | 'from' | 'to'): void`

- [x] **Step 1: Write the failing tests**

Add tests that prove:
- clicking the `Desde` chip clears only `from` and keeps the remaining state valid
- clicking the `Hasta` chip clears only `to` and keeps the remaining state valid
- clicking the quick-range chip returns to the default `7d` preset
- chips remain keyboard-accessible buttons with localized `aria-label`

- [x] **Step 2: Run the focused dashboard spec and verify it fails**

Run:

```bash
pnpm exec ng test --watch=false --include src/app/features/restaurant-pos/pages/restaurant-pos-dashboard-page/restaurant-pos-dashboard-page.spec.ts
```

Expected: FAIL because chips render as passive spans and there is no chip removal handler.

- [x] **Step 3: Implement the minimal chip interaction**

Implementation outline:

```ts
type ActiveFilterChip = {
  key: 'range' | 'from' | 'to';
  label: string;
  removable: boolean;
};

protected removeFilterChip(key: ActiveFilterChip['key']): void {
  if (key === 'range') {
    this.resetFilters();
    return;
  }

  const next: DateInputs = { ...this.dateInputs(), [key]: '' };
  if (!next.from || !next.to) {
    this.quickRange.set('custom');
    this.dateInputs.set(next);
    this.updateUrl({ range: 'custom', from: next.from || null, to: next.to || null });
    return;
  }

  this.dateInputs.set(next);
  this.updateUrl({ range: 'custom', from: next.from, to: next.to });
}
```

Render chips as buttons:

```html
<button
  type="button"
  class="restaurant-pos-dashboard-page__filter-chip"
  [attr.aria-label]="chip.label"
  (click)="removeFilterChip(chip.key)"
>
  {{ chip.label }}
  <app-icon name="close" />
</button>
```

- [x] **Step 4: Run the focused dashboard spec and verify it passes**

Run the same `pnpm exec ng test ...restaurant-pos-dashboard-page.spec.ts` command.

Expected: PASS for the new chip-removal tests and no regressions in filter URL sync.

- [x] **Step 5: Commit**

```bash
git add frontend/src/app/features/restaurant-pos/pages/restaurant-pos-dashboard-page/restaurant-pos-dashboard-page.ts frontend/src/app/features/restaurant-pos/pages/restaurant-pos-dashboard-page/restaurant-pos-dashboard-page.html frontend/src/app/features/restaurant-pos/pages/restaurant-pos-dashboard-page/restaurant-pos-dashboard-page.css frontend/src/app/features/restaurant-pos/pages/restaurant-pos-dashboard-page/restaurant-pos-dashboard-page.spec.ts
git commit -m "feat: make analytics filter chips interactive"
```

## Task 2: Add Stable Chart Skeletons

**Files:**
- Modify: `frontend/src/app/features/restaurant-pos/pages/restaurant-pos-dashboard-page/restaurant-pos-dashboard-page.html`
- Modify: `frontend/src/app/features/restaurant-pos/pages/restaurant-pos-dashboard-page/restaurant-pos-dashboard-page.css`
- Modify: `frontend/src/app/features/restaurant-pos/pages/restaurant-pos-dashboard-page/restaurant-pos-dashboard-page.spec.ts`

**Interfaces:**
- Consumes: `loading()`, `showDataTables()`, current panel titles and empty states
- Produces:
  - stable chart placeholder blocks for `salesByDay`, `averageTicketByDay`, `paymentBreakdown`, `paymentShare`, `topProducts`, `peakHours`

- [x] **Step 1: Write the failing tests**

Add tests that prove:
- each chart panel keeps a reserved skeleton height while `loading() === true`
- no chart empty-state copy is shown during the loading phase
- table mode still uses table loading, not chart skeletons

- [x] **Step 2: Run the focused dashboard spec and verify it fails**

Run:

```bash
pnpm exec ng test --watch=false --include src/app/features/restaurant-pos/pages/restaurant-pos-dashboard-page/restaurant-pos-dashboard-page.spec.ts
```

Expected: FAIL because chart panels currently flip directly between chart and empty state without dedicated skeleton placeholders.

- [x] **Step 3: Implement the minimal skeleton UI**

Implementation outline:

```html
@if (!showDataTables() && loading()) {
  <div class="restaurant-pos-dashboard-page__chart-skeleton" aria-hidden="true">
    <div class="restaurant-pos-dashboard-page__chart-skeleton-header"></div>
    <div class="restaurant-pos-dashboard-page__chart-skeleton-body"></div>
  </div>
} @else {
  <!-- existing chart/table content -->
}
```

```css
.restaurant-pos-dashboard-page__chart-skeleton {
  display: grid;
  gap: 0.75rem;
  min-height: 18rem;
}

.restaurant-pos-dashboard-page__chart-skeleton-body {
  border-radius: 0.75rem;
  background: linear-gradient(90deg, var(--ui-surface), var(--ui-bg-elevated), var(--ui-surface));
}
```

- [x] **Step 4: Run the focused dashboard spec and verify it passes**

Run the same dashboard spec command.

Expected: PASS and visible loading placeholders remain layout-stable.

- [x] **Step 5: Commit**

```bash
git add frontend/src/app/features/restaurant-pos/pages/restaurant-pos-dashboard-page/restaurant-pos-dashboard-page.html frontend/src/app/features/restaurant-pos/pages/restaurant-pos-dashboard-page/restaurant-pos-dashboard-page.css frontend/src/app/features/restaurant-pos/pages/restaurant-pos-dashboard-page/restaurant-pos-dashboard-page.spec.ts
git commit -m "feat: add stable analytics chart skeletons"
```

## Task 3: Add Excel Export from the Loaded Report

**Files:**
- Modify: `frontend/package.json`
- Create: `frontend/src/app/features/restaurant-pos/pages/restaurant-pos-dashboard-page/restaurant-pos-dashboard-export.ts`
- Create: `frontend/src/app/features/restaurant-pos/pages/restaurant-pos-dashboard-page/restaurant-pos-dashboard-export.spec.ts`
- Modify: `frontend/src/app/features/restaurant-pos/pages/restaurant-pos-dashboard-page/restaurant-pos-dashboard-page.ts`
- Modify: `frontend/src/app/features/restaurant-pos/pages/restaurant-pos-dashboard-page/restaurant-pos-dashboard-page.html`
- Modify: `frontend/src/app/shared/i18n/i18n-testing.ts`
- Modify: `frontend/public/i18n/es.json`
- Modify: `frontend/public/i18n/en.json`
- Modify: `frontend/public/i18n/ca.json`

**Interfaces:**
- Consumes:
  - `RestaurantAnalyticsReportDto`
  - `dateInputs(): { from: string; to: string }`
  - restaurant context: `{ name: string; timezone: string }`
  - current locale from Transloco
- Produces:
  - `exportRestaurantAnalyticsWorkbook(input: ExportRestaurantAnalyticsWorkbookInput): Promise<Blob>`
  - `triggerRestaurantAnalyticsWorkbookDownload(filename: string, blob: Blob): void`
  - `exportExcel(): Promise<void>`

- [x] **Step 1: Write the failing export helper tests**

Add tests that prove:
- workbook contains sheets `Resumen`, `Ventas por día`, `Pagos`, `Ticket medio diario`, `Top productos`, `Horas punta`
- summary sheet includes restaurant name, period, generated-at metadata
- payment rows label `cash` as `Efectivo`
- daily average ticket rows use formatted monetary values derived from cents

- [x] **Step 2: Run the focused export helper spec and verify it fails**

Run:

```bash
pnpm exec ng test --watch=false --include src/app/features/restaurant-pos/pages/restaurant-pos-dashboard-page/restaurant-pos-dashboard-export.spec.ts
```

Expected: FAIL because the export helper file and workbook builder do not exist yet.

- [x] **Step 3: Install the minimal Excel dependency**

Use a single library suited to browser-side workbook generation, for example `exceljs`.

Run:

```bash
pnpm install exceljs
```

Expected: dependency added to `frontend/package.json` and lockfile updated.

- [x] **Step 4: Implement the workbook builder**

Create a focused helper:

```ts
export type ExportRestaurantAnalyticsWorkbookInput = {
  locale: string;
  restaurantName: string;
  period: { from: string; to: string };
  report: RestaurantAnalyticsReportDto;
};

export async function exportRestaurantAnalyticsWorkbook(
  input: ExportRestaurantAnalyticsWorkbookInput,
): Promise<Blob> {
  const workbook = new ExcelJS.Workbook();
  // add summary + table sheets
  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}
```

- [x] **Step 5: Wire the dashboard action**

Render an export action near the existing view toggle:

```html
<app-button
  variant="neutral"
  fill="outline"
  size="sm"
  [ariaLabel]="'restaurantPos.dashboard.actions.exportExcel' | transloco"
  (pressed)="exportExcel()"
>
  <app-icon name="download" />
</app-button>
```

Implementation outline:

```ts
protected async exportExcel(): Promise<void> {
  const restaurant = this.restaurantContext.activeRestaurant();
  const report = this.report();
  const { from, to } = this.dateInputs();
  if (!restaurant || !report || !from || !to) return;

  const blob = await exportRestaurantAnalyticsWorkbook({
    locale: this.activeLang(),
    restaurantName: restaurant.displayName || restaurant.name,
    period: { from, to },
    report,
  });

  triggerRestaurantAnalyticsWorkbookDownload(
    `analytics-${restaurant.id}-${from}-${to}.xlsx`,
    blob,
  );
}
```

- [x] **Step 6: Add the dashboard interaction test**

Add a page spec that spies on `exportRestaurantAnalyticsWorkbook` and proves the export button is shown only when there is data and calls the helper with current report + period.

- [x] **Step 7: Run focused tests and verify they pass**

Run:

```bash
pnpm exec ng test --watch=false --include src/app/features/restaurant-pos/pages/restaurant-pos-dashboard-page/restaurant-pos-dashboard-export.spec.ts
pnpm exec ng test --watch=false --include src/app/features/restaurant-pos/pages/restaurant-pos-dashboard-page/restaurant-pos-dashboard-page.spec.ts
```

Expected: PASS for workbook structure and dashboard export trigger behavior.

- [x] **Step 8: Commit**

```bash
git add frontend/package.json frontend/src/app/features/restaurant-pos/pages/restaurant-pos-dashboard-page/restaurant-pos-dashboard-export.ts frontend/src/app/features/restaurant-pos/pages/restaurant-pos-dashboard-page/restaurant-pos-dashboard-export.spec.ts frontend/src/app/features/restaurant-pos/pages/restaurant-pos-dashboard-page/restaurant-pos-dashboard-page.ts frontend/src/app/features/restaurant-pos/pages/restaurant-pos-dashboard-page/restaurant-pos-dashboard-page.html frontend/src/app/features/restaurant-pos/pages/restaurant-pos-dashboard-page/restaurant-pos-dashboard-page.spec.ts frontend/src/app/shared/i18n/i18n-testing.ts frontend/public/i18n/es.json frontend/public/i18n/en.json frontend/public/i18n/ca.json
git commit -m "feat: export restaurant analytics to excel"
```

## Task 4: Final Integration Verification

**Files:**
- Modify: `frontend/src/app/features/restaurant-pos/pages/restaurant-pos-dashboard-page/restaurant-pos-dashboard-page.spec.ts` (only if any final assertion gaps remain)
- Verify: `frontend/src/app/features/restaurant-pos/pages/restaurant-pos-dashboard-page/*`

**Interfaces:**
- Consumes: all previous tasks
- Produces: final verified dashboard feature set ready for review

- [ ] **Step 1: Run the full focused frontend verification**

Run:

```bash
pnpm exec ng test --watch=false --include src/app/features/restaurant-pos/pages/restaurant-pos-dashboard-page/restaurant-pos-dashboard-page.spec.ts
pnpm exec ng test --watch=false --include src/app/features/restaurant-pos/pages/restaurant-pos-dashboard-page/restaurant-pos-dashboard-export.spec.ts
pnpm build
```

Expected:
- dashboard spec PASS
- export helper spec PASS
- build PASS, with only the known existing initial-bundle budget warning unless a new regression appears

- [ ] **Step 2: Manual QA checklist**

Verify in the running app:
- clicking a filter chip removes only that chip’s filter
- loading state keeps chart cards from collapsing
- export button downloads one `.xlsx` file with all six sheets
- period summary, chips, segmented control, and date picker still share the same accent family

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/features/restaurant-pos/pages/restaurant-pos-dashboard-page frontend/src/app/shared/i18n/i18n-testing.ts frontend/public/i18n/es.json frontend/public/i18n/en.json frontend/public/i18n/ca.json frontend/package.json
git commit -m "chore: finish analytics dashboard next phase"
```

## Self-Review

- Spec coverage:
  - clickable chips: covered by Task 1
  - stable chart loading: covered by Task 2
  - Excel export: covered by Task 3
  - integration verification: covered by Task 4
- Placeholder scan:
  - no `TODO`/`TBD` placeholders left
  - commands, files, and produced interfaces are explicit
- Type consistency:
  - export helper names are defined before dashboard wiring
  - chip removal and chart skeleton tasks rely only on dashboard-local state already present

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-07-restaurant-pos-analytics-next-phase.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
