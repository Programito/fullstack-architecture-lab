# Developer Logs Dashboard Next Iteration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve the `/developer/logs` dashboard so filters feel faster and clearer, KPI areas are more readable, and dashboards surface more actionable observability insights without leaving empty visual space.

**Architecture:** Keep the current single-page Angular route and existing `/developer/logs/*` backend contract, then iterate in thin vertical slices. Phase 1 stays frontend-only and reorganizes layout/state around clearer filter groups and metric regions. Phase 2 extends summary/timeline/breakdown payloads only where the current API cannot express the new dashboards.

**Tech Stack:** Angular standalone components, signals, Transloco, Testing Library, Vitest, existing shared UI primitives (`app-button`, `app-card`, `app-chart`, `app-combobox`, `app-table`), NestJS observability endpoints if API expansion is needed.

## Global Constraints

- Work from `frontend/` for frontend commands and `backend/` for backend commands.
- Use `pnpm` for dependency and script commands.
- Follow TDD: write the failing test first, verify it fails, then implement the minimum code.
- Keep `/api/v1/developer/logs/*` protected behind the existing developer-only flow.
- Do not expose raw sensitive metadata; keep using the current observability metadata policy.
- Preserve the current query-param driven filter behavior so deep links and reloads still work.
- Keep visible copy aligned with Transloco; update `es`, `en`, and `ca` if new strings are introduced.
- Do not revert unrelated user changes.

---

## File Map

### Frontend files likely to change

- Modify: `frontend/src/app/features/developer/pages/developer-logs-page/developer-logs-page.ts`
  - Owns page state, computed series, filter state, KPI interactions, and URL sync.
- Modify: `frontend/src/app/features/developer/pages/developer-logs-page/developer-logs-page.html`
  - Owns visual grouping for filters, KPI regions, insights, charts, and detail panel.
- Modify: `frontend/src/app/features/developer/pages/developer-logs-page/developer-logs-page.css`
  - Owns responsive layout, spacing, card grouping, and empty-space reduction.
- Modify: `frontend/src/app/features/developer/pages/developer-logs-page/developer-logs-page.spec.ts`
  - Owns behavior coverage for filter interactions, KPI grouping, and new dashboards.
- Modify: `frontend/src/app/features/developer/api/developer-logs.models.ts`
  - Extend DTOs if new frontend charts require richer typed payloads.
- Modify: `frontend/src/app/features/developer/api/developer-logs-api.service.ts`
  - Only if endpoint/query wiring changes.
- Modify: `frontend/src/assets/i18n/es.json`
- Modify: `frontend/src/assets/i18n/en.json`
- Modify: `frontend/src/assets/i18n/ca.json`
  - Only if new visible labels/headings are introduced.

### Backend files only if Phase 2 needs extra data

- Modify: `backend/src/observability/application/observability.service.ts`
  - Extend summary/timeline/breakdown aggregations.
- Modify: `backend/src/observability/presentation/rest/developer-logs.controller.ts`
  - Only if new endpoint shapes are required.
- Modify: `backend/src/observability/application/observability.service.spec.ts`
- Modify: `backend/src/observability/application/observability.service.integration-spec.ts`
  - Required if raw SQL, JSON filters, or new aggregated responses change.
- Review: `backend/docs/observability.md`
  - Update if dashboard capabilities or filter semantics change.

## Recommended Delivery Order

1. Filter clarity and active-state feedback.
2. KPI regrouping to remove noise and visual holes.
3. Actionable dashboards that use existing data first.
4. Backend aggregation expansion only if the frontend cannot express the target views cheaply.

## Task 1: Define the target information architecture for the page

**Files:**
- Modify: `docs/superpowers/plans/2026-07-08-developer-logs-dashboard-next-iteration.md`
- Review: `frontend/src/app/features/developer/pages/developer-logs-page/developer-logs-page.html`
- Review: `frontend/src/app/features/developer/pages/developer-logs-page/developer-logs-page.ts`
- Review: `frontend/src/app/features/developer/pages/developer-logs-page/developer-logs-page.css`

**Interfaces:**
- Consumes: current page sections `filters`, `shortcuts`, `cards`, `insights`, `charts`, `table`.
- Produces: an approved section map for later tasks:
  - `primary-filters`
  - `advanced-audit-filters`
  - `kpi-summary`
  - `channel-snapshots`
  - `actionable-insights`
  - `trend-dashboards`

- [ ] **Step 1: Write the section map directly into this plan**

```md
Primary filters:
- view chips
- time chips
- client origin chips
- path
- search

Advanced audit filters:
- restaurantId
- actorUserId
- entityType
- entityId
- result

KPI summary:
- totalRequests
- errorCount
- errorRate
- auditEvents
- p95DurationMs

Channel snapshots:
- volume by origin
- auth succeeded/failed by origin

Actionable insights:
- topSlowPaths
- topErrorEvents

Trend dashboards:
- activity timeline
- level breakdown
- category breakdown
- origin breakdown
```

- [ ] **Step 2: Check that every current widget maps to one of those buckets**

Run mentally against the current template:
- `summary()?.*` cards -> `kpi-summary`
- `breakdown().origins` cards -> `channel-snapshots`
- `authByOrigin()` cards -> `channel-snapshots`
- `topSlowPaths()` and `topErrorEvents()` -> `actionable-insights`
- `app-chart` block -> `trend-dashboards`

Expected: no widget remains “orphaned” between sections.

- [ ] **Step 3: Commit the plan checkpoint**

```bash
git add docs/superpowers/plans/2026-07-08-developer-logs-dashboard-next-iteration.md
git commit -m "docs: define developer logs next-iteration plan"
```

## Task 2: Make filter interactions feel intentional and self-explanatory

**Files:**
- Modify: `frontend/src/app/features/developer/pages/developer-logs-page/developer-logs-page.spec.ts`
- Modify: `frontend/src/app/features/developer/pages/developer-logs-page/developer-logs-page.ts`
- Modify: `frontend/src/app/features/developer/pages/developer-logs-page/developer-logs-page.html`
- Modify: `frontend/src/app/features/developer/pages/developer-logs-page/developer-logs-page.css`
- Modify: `frontend/src/assets/i18n/es.json`
- Modify: `frontend/src/assets/i18n/en.json`
- Modify: `frontend/src/assets/i18n/ca.json`

**Interfaces:**
- Consumes:
  - `filters(): DeveloperLogFilters`
  - `applyFilters(): void`
  - `resetFilters(): void`
  - `setFilter<K extends keyof DeveloperLogFilters>(...)`
- Produces:
  - `activeFilterCount(): number`
  - `hasAdvancedAuditFilters(): boolean`
  - `clearClientOriginFilter(): void` or equivalent toggle behavior
  - visible “active filters” summary/chips near actions

- [ ] **Step 1: Write a failing test for active-filter feedback**

Add a test like:

```ts
it('shows a compact active-filter summary after selecting origin and path', async () => {
  // render page with standard mocks
  fireEvent.click(screen.getByRole('button', { name: 'developer.logs.filters.clientOrigin developer.logs.origins.web-pos' }));
  const pathSelect = screen.getByLabelText('developer.logs.filters.path') as HTMLSelectElement;
  pathSelect.value = '/payments';
  pathSelect.dispatchEvent(new Event('change', { bubbles: true }));
  screen.getByRole('button', { name: 'developer.logs.filters.apply' }).click();

  expect(screen.getByText('developer.logs.filters.activeTitle')).toBeTruthy();
  expect(screen.getByText('developer.logs.origins.web-pos')).toBeTruthy();
  expect(screen.getByText('/restaurants/:id/orders/:orderId/payments')).toBeTruthy();
});
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run:

```bash
pnpm exec ng test --watch=false --include src/app/features/developer/pages/developer-logs-page/developer-logs-page.spec.ts
```

Expected: FAIL because `activeTitle` summary and selected filter chips do not exist yet.

- [ ] **Step 3: Implement minimal state helpers in the page class**

Add helpers along these lines:

```ts
protected readonly activeFilterEntries = computed(() => {
  const filters = this.filters();
  const entries: Array<{ key: string; label: string; value: string }> = [];

  if (filters.clientOrigin) {
    entries.push({
      key: 'clientOrigin',
      label: this.transloco.translate('developer.logs.filters.clientOrigin'),
      value: this.clientOriginLabel(filters.clientOrigin),
    });
  }

  if (filters.path) {
    const match = this.pathGroupOptions.find((group) => group.value === filters.path);
    entries.push({
      key: 'path',
      label: this.transloco.translate('developer.logs.filters.path'),
      value: match?.label ?? filters.path,
    });
  }

  return entries;
});
```

- [ ] **Step 4: Render the active-filter summary directly under the filter actions**

Add a template block like:

```html
@if (activeFilterEntries().length) {
  <section class="developer-logs-page__active-filters" aria-label="Filtros activos">
    <p class="developer-logs-page__group-title">{{ 'developer.logs.filters.activeTitle' | transloco }}</p>
    <div class="developer-logs-page__origin-chips">
      @for (entry of activeFilterEntries(); track entry.key + entry.value) {
        <app-badge variant="neutral" fill="soft">{{ entry.value }}</app-badge>
      }
    </div>
  </section>
}
```

- [ ] **Step 5: Add the smallest CSS needed so the summary reads as a deliberate row**

```css
.developer-logs-page__active-filters {
  display: grid;
  gap: 0.5rem;
  padding-top: 0.25rem;
}
```

- [ ] **Step 6: Re-run the focused test**

Run:

```bash
pnpm exec ng test --watch=false --include src/app/features/developer/pages/developer-logs-page/developer-logs-page.spec.ts
```

Expected: PASS for the new filter-summary behavior, existing log page tests stay green.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/app/features/developer/pages/developer-logs-page/developer-logs-page.ts frontend/src/app/features/developer/pages/developer-logs-page/developer-logs-page.html frontend/src/app/features/developer/pages/developer-logs-page/developer-logs-page.css frontend/src/app/features/developer/pages/developer-logs-page/developer-logs-page.spec.ts frontend/src/assets/i18n/es.json frontend/src/assets/i18n/en.json frontend/src/assets/i18n/ca.json
git commit -m "feat: clarify developer logs filter states"
```

## Task 3: Separate KPI summary from channel snapshots to reduce visual noise

**Files:**
- Modify: `frontend/src/app/features/developer/pages/developer-logs-page/developer-logs-page.spec.ts`
- Modify: `frontend/src/app/features/developer/pages/developer-logs-page/developer-logs-page.html`
- Modify: `frontend/src/app/features/developer/pages/developer-logs-page/developer-logs-page.css`

**Interfaces:**
- Consumes:
  - `summary(): DeveloperLogSummaryDto | null`
  - `breakdown(): DeveloperLogBreakdownDto`
  - `authByOrigin()`
- Produces:
  - dedicated `developer-logs-page__summary-cards`
  - dedicated `developer-logs-page__channel-cards`

- [ ] **Step 1: Write a failing layout test for separate regions**

Add a test like:

```ts
it('renders summary kpis separately from per-origin channel cards', async () => {
  const { container } = await render(...);

  expect(container.querySelector('.developer-logs-page__summary-cards')).toBeTruthy();
  expect(container.querySelector('.developer-logs-page__channel-cards')).toBeTruthy();
  expect(container.querySelectorAll('.developer-logs-page__summary-cards app-card').length).toBe(5);
});
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run:

```bash
pnpm exec ng test --watch=false --include src/app/features/developer/pages/developer-logs-page/developer-logs-page.spec.ts
```

Expected: FAIL because there is still one shared cards grid.

- [ ] **Step 3: Split the template into two explicit sections**

Move the current KPIs into:

```html
<section class="developer-logs-page__summary-cards">...</section>
```

Move `breakdown().origins` and `authByOrigin()` cards into:

```html
<section class="developer-logs-page__channel-cards">...</section>
```

- [ ] **Step 4: Add responsive CSS that prevents empty columns**

```css
.developer-logs-page__summary-cards {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fit, minmax(11rem, 1fr));
}

.developer-logs-page__channel-cards {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fit, minmax(13rem, 1fr));
}
```

- [ ] **Step 5: Re-run the focused test**

Run:

```bash
pnpm exec ng test --watch=false --include src/app/features/developer/pages/developer-logs-page/developer-logs-page.spec.ts
```

Expected: PASS and no regression in existing metric click behavior.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/app/features/developer/pages/developer-logs-page/developer-logs-page.html frontend/src/app/features/developer/pages/developer-logs-page/developer-logs-page.css frontend/src/app/features/developer/pages/developer-logs-page/developer-logs-page.spec.ts
git commit -m "feat: separate developer logs kpi regions"
```

## Task 4: Add higher-signal dashboards using existing frontend data first

**Files:**
- Modify: `frontend/src/app/features/developer/pages/developer-logs-page/developer-logs-page.spec.ts`
- Modify: `frontend/src/app/features/developer/pages/developer-logs-page/developer-logs-page.ts`
- Modify: `frontend/src/app/features/developer/pages/developer-logs-page/developer-logs-page.html`
- Modify: `frontend/src/app/features/developer/pages/developer-logs-page/developer-logs-page.css`
- Modify: `frontend/src/assets/i18n/es.json`
- Modify: `frontend/src/assets/i18n/en.json`
- Modify: `frontend/src/assets/i18n/ca.json`

**Interfaces:**
- Consumes:
  - `summary()?.topSlowPaths`
  - `summary()?.topErrorEvents`
  - `summary()?.authByOrigin`
  - `timeline()`
- Produces:
  - `authSuccessSeries(): ChartSeries[]`
  - `slowPathCategories(): string[]`
  - `slowPathSeries(): ChartSeries[]`

- [ ] **Step 1: Write a failing test for new chart regions**

Add a test like:

```ts
it('renders auth-by-origin and slow-path trend dashboards when summary data exists', async () => {
  const { container } = await render(...summary with authByOrigin and topSlowPaths...);

  expect(container.textContent).toContain('developer.logs.sections.authByOrigin');
  expect(container.textContent).toContain('developer.logs.sections.slowPaths');
});
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run:

```bash
pnpm exec ng test --watch=false --include src/app/features/developer/pages/developer-logs-page/developer-logs-page.spec.ts
```

Expected: FAIL because those chart sections do not exist yet.

- [ ] **Step 3: Add minimal computed series in the page class**

```ts
protected readonly authOriginCategories = computed(() => this.authByOrigin().map((entry) => this.clientOriginLabel(entry.key)));
protected readonly authOriginSeries = computed<ChartSeries[]>(() => [
  { name: this.transloco.translate('developer.logs.metrics.loginSucceeded'), values: this.authByOrigin().map((entry) => entry.succeeded) },
  { name: this.transloco.translate('developer.logs.metrics.loginFailed'), values: this.authByOrigin().map((entry) => entry.failed) },
]);
protected readonly slowPathCategories = computed(() => this.topSlowPaths().map((entry) => entry.path));
protected readonly slowPathSeries = computed<ChartSeries[]>(() => [
  { name: this.transloco.translate('developer.logs.metrics.latency'), values: this.topSlowPaths().map((entry) => entry.p95DurationMs) },
]);
```

- [ ] **Step 4: Render two additional `app-chart` cards in the dashboard area**

Use headings and titles like:

```html
<app-chart
  type="bar"
  [title]="'developer.logs.sections.authByOrigin' | transloco"
  [categories]="authOriginCategories()"
  [data]="authOriginSeries()"
/>
```

and

```html
<app-chart
  type="bar"
  [title]="'developer.logs.sections.slowPaths' | transloco"
  [categories]="slowPathCategories()"
  [data]="slowPathSeries()"
/>
```

- [ ] **Step 5: Re-run the focused test**

Run:

```bash
pnpm exec ng test --watch=false --include src/app/features/developer/pages/developer-logs-page/developer-logs-page.spec.ts
```

Expected: PASS with chart sections present only when backing data exists.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/app/features/developer/pages/developer-logs-page/developer-logs-page.ts frontend/src/app/features/developer/pages/developer-logs-page/developer-logs-page.html frontend/src/app/features/developer/pages/developer-logs-page/developer-logs-page.css frontend/src/app/features/developer/pages/developer-logs-page/developer-logs-page.spec.ts frontend/src/assets/i18n/es.json frontend/src/assets/i18n/en.json frontend/src/assets/i18n/ca.json
git commit -m "feat: add actionable developer logs dashboards"
```

## Task 5: Decide whether backend aggregation expansion is actually needed

**Files:**
- Review: `backend/docs/observability.md`
- Review: `backend/src/observability/application/observability.service.ts`
- Review: `frontend/src/app/features/developer/api/developer-logs.models.ts`

**Interfaces:**
- Consumes: current summary/breakdown/timeline DTO shapes.
- Produces: a yes/no decision with one of these outcomes:
  - `frontend-only`: existing DTOs are sufficient
  - `needs-summary-expansion`
  - `needs-new-endpoint`

- [ ] **Step 1: Compare desired dashboards with current DTOs**

Check:
- Can `authByOrigin` power auth dashboards? yes.
- Can `topSlowPaths` power latency ranking charts? yes.
- Can `breakdown().origins` power traffic share? yes.
- Can we chart errors by endpoint trend over time from existing DTOs? no, not precisely.

Expected result: current data is enough for the first iteration, but endpoint-trend dashboards are Phase 2.

- [ ] **Step 2: Write the decision into the plan or follow-up note**

```md
Phase 1 remains frontend-only.
Phase 2 backend work is only required for:
- error trend by endpoint over time
- audit results by entityType over time
- top actors/entities leaderboards if they should be aggregated server-side
```

Decision captured on 2026-07-08:
- Phase 1 remains frontend-only.
- The current `summary`, `topSlowPaths`, `topErrorEvents`, `authByOrigin`, and `breakdown.origins` payloads are sufficient for the next UX/dashboard iteration.
- Backend expansion is deferred until the product explicitly asks for time-series by endpoint or richer audit aggregations.

- [ ] **Step 3: Commit if the decision created a tracked note**

```bash
git add docs/superpowers/plans/2026-07-08-developer-logs-dashboard-next-iteration.md
git commit -m "docs: capture developer logs phase 2 data decision"
```

## Task 6: Add Phase 2 backend dashboards only if product still wants them

**Files:**
- Modify: `backend/src/observability/application/observability.service.spec.ts`
- Modify: `backend/src/observability/application/observability.service.integration-spec.ts`
- Modify: `backend/src/observability/application/observability.service.ts`
- Modify: `backend/src/observability/presentation/rest/developer-logs.controller.ts`
- Modify: `frontend/src/app/features/developer/api/developer-logs.models.ts`
- Modify: `frontend/src/app/features/developer/api/developer-logs-api.service.ts`
- Modify: `frontend/src/app/features/developer/pages/developer-logs-page/developer-logs-page.ts`
- Modify: `frontend/src/app/features/developer/pages/developer-logs-page/developer-logs-page.html`

**Interfaces:**
- Consumes: existing developer filters and demo-account isolation rules.
- Produces one or more typed DTOs such as:
  - `errorTrendsByPath: Array<{ path: string; bucket: string; errors: number }>`
  - `auditResultsByEntityType: Array<{ entityType: string; succeeded: number; failed: number }>`

- [ ] **Step 1: Write a failing backend spec for the new aggregation**

Example for service unit/integration spec:

```ts
it('returns error trend buckets grouped by path within the selected date window', async () => {
  const result = await service.getErrorTrendsByPath(filters);
  expect(result).toEqual([
    expect.objectContaining({ path: '/api/v1/orders', errors: expect.any(Number) }),
  ]);
});
```

- [ ] **Step 2: Run the focused backend test to verify it fails**

Run:

```bash
pnpm test -- observability.service.spec.ts
```

Expected: FAIL because `getErrorTrendsByPath` does not exist yet.

- [ ] **Step 3: Implement the minimal aggregation and DTO wiring**

Add a service method with the existing filter pipeline:

```ts
async getErrorTrendsByPath(filters: ObservabilityFilters): Promise<ErrorTrendByPathDto[]> {
  // apply date window and restrictToUserIds first
  // aggregate server-side by bucket + path
}
```

- [ ] **Step 4: Run backend unit and integration verification**

Run:

```bash
pnpm test -- observability.service.spec.ts
pnpm test:integration -- observability.service.integration-spec.ts
```

Expected: PASS locally if Docker is available; if Docker is unavailable, record that integration verification is pending.

- [ ] **Step 5: Wire the frontend chart to the new DTO**

Add the new model types, API call, and `computed()` chart series using the same filter state as the rest of the page.

- [ ] **Step 6: Run frontend regression checks**

Run:

```bash
pnpm exec ng test --watch=false --include src/app/features/developer/pages/developer-logs-page/developer-logs-page.spec.ts
pnpm build
```

Expected: PASS, with only pre-existing bundle warnings allowed.

- [ ] **Step 7: Commit**

```bash
git add backend/src/observability/application/observability.service.spec.ts backend/src/observability/application/observability.service.integration-spec.ts backend/src/observability/application/observability.service.ts backend/src/observability/presentation/rest/developer-logs.controller.ts frontend/src/app/features/developer/api/developer-logs.models.ts frontend/src/app/features/developer/api/developer-logs-api.service.ts frontend/src/app/features/developer/pages/developer-logs-page/developer-logs-page.ts frontend/src/app/features/developer/pages/developer-logs-page/developer-logs-page.html
git commit -m "feat: add advanced developer logs aggregations"
```

## Final Verification

- [ ] Run the focused frontend spec:

```bash
pnpm exec ng test --watch=false --include src/app/features/developer/pages/developer-logs-page/developer-logs-page.spec.ts
```

- [ ] Run the production build:

```bash
pnpm build
```

- [ ] If backend Phase 2 shipped, run backend checks:

```bash
pnpm test -- observability.service.spec.ts
pnpm test:integration -- observability.service.integration-spec.ts
```

- [ ] Confirm no unrelated files were reverted and note any residual warnings:
  - Angular initial bundle warning if still above 500 kB.
  - Existing CommonJS warnings for `exceljs` and `jszip`.

## Self-Review

- Spec coverage:
  - Filter clarity: covered by Task 2.
  - KPI/channel separation: covered by Task 3.
  - New dashboards: covered by Tasks 4 and 6.
  - Backend-only escalation only when needed: covered by Task 5.
- Placeholder scan:
  - No `TODO`/`TBD` placeholders remain.
  - All tasks name exact files and exact commands.
- Type consistency:
  - Proposed helper names and DTO names are defined where introduced and only reused later after definition.
