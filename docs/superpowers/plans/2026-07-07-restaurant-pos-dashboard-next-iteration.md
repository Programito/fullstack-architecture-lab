# Restaurant POS Dashboard Next Iteration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve `/restaurant-pos/dashboard` UX by making filters collapsible, clarifying dashboard hierarchy, exposing active filter context, and persisting the user's presentation state without changing the analytics API contract.

**Architecture:** Keep `RestaurantPosDashboardPage` as the single composition point for analytics UI state, derived chart/table datasets, and query-param synchronization. Reuse the current `RestaurantAnalyticsReportDto` payload, existing chart/table components, and the audit-page interaction pattern instead of introducing new services or backend endpoints.

**Tech Stack:** Angular standalone components, Signals, Transloco, Testing Library, Vitest, pnpm

## Global Constraints

- Keep `RestaurantAnalyticsReportDto` and backend/frontend API contracts unchanged.
- Reuse `summary`, `salesByDay`, `topProducts`, `paymentBreakdown`, and `peakHours`; do not add backend metrics in this iteration.
- Do not re-implement the already shipped payment currency formatting, payment share chart, or daily average ticket chart; evolve layout and UI state around them.
- Preserve current `loading`, `empty`, `error`, quick range, and table/chart accessibility behavior.
- Follow the existing app pattern for collapsible filter panels, matching the interaction already used in `/developer/logs`.

---

## File Structure

### Frontend files to modify
- `frontend/src/app/features/restaurant-pos/pages/restaurant-pos-dashboard-page/restaurant-pos-dashboard-page.ts`
  - Add collapsible-filter state, URL-backed presentation state, active-filter chip derivation, and any KPI/layout helpers needed by the next iteration.
- `frontend/src/app/features/restaurant-pos/pages/restaurant-pos-dashboard-page/restaurant-pos-dashboard-page.html`
  - Replace the always-open top filter strip with a collapsible card, add an active-filter summary row, and reorganize dashboard sections into clearer visual hierarchy.
- `frontend/src/app/features/restaurant-pos/pages/restaurant-pos-dashboard-page/restaurant-pos-dashboard-page.css`
  - Add layout rules for the filter card, chip row, denser KPI band, and section hierarchy without turning the page into nested cards.
- `frontend/src/app/features/restaurant-pos/pages/restaurant-pos-dashboard-page/restaurant-pos-dashboard-page.spec.ts`
  - Cover collapse/expand behavior, URL hydration for view state, active-filter summary rendering, and the reordered dashboard/table behavior.
- `frontend/public/i18n/es.json`
- `frontend/public/i18n/en.json`
- `frontend/public/i18n/ca.json`
  - Add labels for the filter toggle, active-filter summary, reset action, and any new KPI/section titles that are actually introduced.

### Frontend files to review only
- `frontend/src/app/features/developer/pages/developer-logs-page/developer-logs-page.html`
  - Use as the reference interaction for collapsible filters.

---

### Task 1: Add URL-Backed Dashboard Presentation State

**Files:**
- Modify: `frontend/src/app/features/restaurant-pos/pages/restaurant-pos-dashboard-page/restaurant-pos-dashboard-page.ts`
- Test: `frontend/src/app/features/restaurant-pos/pages/restaurant-pos-dashboard-page/restaurant-pos-dashboard-page.spec.ts`

**Interfaces:**
- Consumes: existing `QuickRange`, `DateInputs`, `parseInitialState(...)`, `updateUrl(...)`
- Produces:
  - `type DashboardViewMode = 'chart' | 'table'`
  - `type DashboardUiState = { quickRange: QuickRange; dateInputs: DateInputs; viewMode: DashboardViewMode; filtersExpanded: boolean }`
  - `protected readonly filtersExpanded = signal(true)`
  - `protected readonly viewMode = signal<DashboardViewMode>('chart')`

- [ ] **Step 1: Write the failing test**

```ts
it('hydrates table view and collapsed filters from the URL query params on first load', async () => {
  const i18n = provideI18nTesting();
  const restaurantContext = createRestaurantContextMock();
  const routeHarness = createRouteHarness({
    range: 'custom',
    from: '2026-06-01',
    to: '2026-06-07',
    view: 'table',
    filters: 'closed',
  });
  const api = { getReport: vi.fn(() => of(createReport())) };

  TestBed.overrideComponent(RestaurantPosDashboardPage, {
    remove: { imports: [Chart] },
    add: { imports: [ChartStub] },
  });

  await render(RestaurantPosDashboardPage, {
    imports: [...i18n.imports],
    providers: [
      ...i18n.providers,
      ...routeHarness.providers,
      { provide: RestaurantContextStore, useValue: restaurantContext },
      { provide: RestaurantAnalyticsApiService, useValue: api },
    ],
  });

  expect(screen.getByRole('button', { name: 'Mostrar filtros' })).toBeTruthy();
  expect(screen.getAllByRole('table').length).toBeGreaterThan(0);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test --watch=false --include src/app/features/restaurant-pos/pages/restaurant-pos-dashboard-page/restaurant-pos-dashboard-page.spec.ts`

Expected: FAIL because `view`/`filters` query params are not parsed and the page always initializes with expanded filters plus chart mode.

- [ ] **Step 3: Write minimal implementation**

```ts
type DashboardViewMode = 'chart' | 'table';
type DashboardUiState = {
  quickRange: QuickRange;
  dateInputs: DateInputs;
  viewMode: DashboardViewMode;
  filtersExpanded: boolean;
};
```

```ts
protected readonly filtersExpanded: ReturnType<typeof signal<boolean>>;
protected readonly viewMode: ReturnType<typeof signal<DashboardViewMode>>;

constructor() {
  this.restaurantContext.load();

  const initial = parseInitialState(this.route.snapshot.queryParamMap);
  this.quickRange = signal<QuickRange>(initial.quickRange);
  this.dateInputs = signal<DateInputs>(initial.dateInputs);
  this.viewMode = signal<DashboardViewMode>(initial.viewMode);
  this.filtersExpanded = signal<boolean>(initial.filtersExpanded);
}

protected toggleFilters(): void {
  const next = !this.filtersExpanded();
  this.filtersExpanded.set(next);
  this.updateUrl({ filters: next ? 'open' : 'closed' });
}

protected toggleDataView(): void {
  const next = this.viewMode() === 'chart' ? 'table' : 'chart';
  this.viewMode.set(next);
  this.updateUrl({ view: next });
}
```

```ts
function parseInitialState(params: { get(name: string): string | null }): DashboardUiState {
  const rawView = params.get('view');
  const rawFilters = params.get('filters');
  const viewMode: DashboardViewMode = rawView === 'table' ? 'table' : 'chart';
  const filtersExpanded = rawFilters !== 'closed';

  // Keep the existing quick range + custom date parsing logic here.
  return {
    quickRange,
    dateInputs,
    viewMode,
    filtersExpanded,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test --watch=false --include src/app/features/restaurant-pos/pages/restaurant-pos-dashboard-page/restaurant-pos-dashboard-page.spec.ts`

Expected: PASS for the new hydration test, with existing range and URL tests still green.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/features/restaurant-pos/pages/restaurant-pos-dashboard-page/restaurant-pos-dashboard-page.ts frontend/src/app/features/restaurant-pos/pages/restaurant-pos-dashboard-page/restaurant-pos-dashboard-page.spec.ts
git commit -m "feat: persist dashboard presentation state"
```

### Task 2: Convert the Filter Strip into a Collapsible Summary Card

**Files:**
- Modify: `frontend/src/app/features/restaurant-pos/pages/restaurant-pos-dashboard-page/restaurant-pos-dashboard-page.ts`
- Modify: `frontend/src/app/features/restaurant-pos/pages/restaurant-pos-dashboard-page/restaurant-pos-dashboard-page.html`
- Modify: `frontend/src/app/features/restaurant-pos/pages/restaurant-pos-dashboard-page/restaurant-pos-dashboard-page.css`
- Modify: `frontend/public/i18n/es.json`
- Modify: `frontend/public/i18n/en.json`
- Modify: `frontend/public/i18n/ca.json`
- Test: `frontend/src/app/features/restaurant-pos/pages/restaurant-pos-dashboard-page/restaurant-pos-dashboard-page.spec.ts`

**Interfaces:**
- Consumes: `filtersExpanded`, `quickRange`, `dateInputs`, `setQuickRange(...)`, `setFilter(...)`
- Produces:
  - `type ActiveFilterChip = { key: 'range' | 'from' | 'to'; label: string }`
  - `protected readonly activeFilterChips = computed<ActiveFilterChip[]>(...)`
  - `protected resetFilters(): void`

- [ ] **Step 1: Write the failing test**

```ts
it('shows a compact active-filter summary when the filter card is collapsed', async () => {
  const i18n = provideI18nTesting();
  const restaurantContext = createRestaurantContextMock();
  const routeHarness = createRouteHarness({
    range: 'custom',
    from: '2026-06-01',
    to: '2026-06-07',
    filters: 'closed',
  });
  const api = { getReport: vi.fn(() => of(createReport())) };

  await render(RestaurantPosDashboardPage, {
    imports: [...i18n.imports],
    providers: [
      ...i18n.providers,
      ...routeHarness.providers,
      { provide: RestaurantContextStore, useValue: restaurantContext },
      { provide: RestaurantAnalyticsApiService, useValue: api },
    ],
  });

  expect(screen.getByText('Filtros activos')).toBeTruthy();
  expect(screen.getByText('2026-06-01 -> 2026-06-07')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Limpiar filtros' })).toBeTruthy();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test --watch=false --include src/app/features/restaurant-pos/pages/restaurant-pos-dashboard-page/restaurant-pos-dashboard-page.spec.ts`

Expected: FAIL because the page does not render a collapsed summary row or reset action yet.

- [ ] **Step 3: Write minimal implementation**

```ts
type ActiveFilterChip = { key: 'range' | 'from' | 'to'; label: string };

protected readonly activeFilterChips = computed<ActiveFilterChip[]>(() => {
  const range = this.quickRange();
  const { from, to } = this.dateInputs();

  if (range !== 'custom') {
    return [{ key: 'range', label: this.transloco.translate(`restaurantPos.dashboard.ranges.${range}`) }];
  }

  if (from && to) {
    return [{ key: 'range', label: `${from} -> ${to}` }];
  }

  return [];
});

protected resetFilters(): void {
  this.rangeClamped.set(false);
  this.quickRange.set('7d');
  const restaurant = this.restaurantContext.activeRestaurant();
  this.dateInputs.set(restaurant ? quickRangeDates('7d', restaurant.timezone) : { from: '', to: '' });
  this.updateUrl({
    range: '7d',
    from: null,
    to: null,
    view: this.viewMode(),
    filters: this.filtersExpanded() ? 'open' : 'closed',
  });
}
```

```html
<section class="theme-panel restaurant-pos-dashboard-page__filters-card rounded-2xl border shadow-sm">
  <div class="restaurant-pos-dashboard-page__filters-header">
    <div>
      <p class="theme-title text-sm font-semibold">{{ 'restaurantPos.dashboard.filters.title' | transloco }}</p>
      @if (activeFilterChips().length) {
        <div class="restaurant-pos-dashboard-page__filter-chips" aria-label="{{ 'restaurantPos.dashboard.filters.active' | transloco }}">
          @for (chip of activeFilterChips(); track chip.key + chip.label) {
            <span class="restaurant-pos-dashboard-page__filter-chip">{{ chip.label }}</span>
          }
        </div>
      }
    </div>
    <div class="restaurant-pos-dashboard-page__filters-actions">
      <app-button variant="neutral" fill="outline" size="sm" (pressed)="resetFilters()">
        {{ 'restaurantPos.dashboard.filters.reset' | transloco }}
      </app-button>
      <app-button
        variant="neutral"
        fill="clear"
        size="sm"
        [ariaLabel]="(filtersExpanded() ? 'restaurantPos.dashboard.filters.hide' : 'restaurantPos.dashboard.filters.show') | transloco"
        (pressed)="toggleFilters()"
      >
        {{ (filtersExpanded() ? 'restaurantPos.dashboard.filters.hide' : 'restaurantPos.dashboard.filters.show') | transloco }}
      </app-button>
    </div>
  </div>

  @if (filtersExpanded()) {
    <div class="restaurant-pos-dashboard-page__filters-grid">
      <!-- keep the existing quick range + from + to controls here -->
    </div>
  }
</section>
```

- [ ] **Step 4: Run focused verification**

Run:
- `pnpm test --watch=false --include src/app/features/restaurant-pos/pages/restaurant-pos-dashboard-page/restaurant-pos-dashboard-page.spec.ts`
- `pnpm build`

Expected: PASS, with the dashboard still compiling and the collapsed filter card rendering without changing API calls.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/features/restaurant-pos/pages/restaurant-pos-dashboard-page/restaurant-pos-dashboard-page.ts frontend/src/app/features/restaurant-pos/pages/restaurant-pos-dashboard-page/restaurant-pos-dashboard-page.html frontend/src/app/features/restaurant-pos/pages/restaurant-pos-dashboard-page/restaurant-pos-dashboard-page.css frontend/src/app/features/restaurant-pos/pages/restaurant-pos-dashboard-page/restaurant-pos-dashboard-page.spec.ts frontend/public/i18n/es.json frontend/public/i18n/en.json frontend/public/i18n/ca.json
git commit -m "feat: add collapsible analytics filters"
```

### Task 3: Recompose Dashboard Hierarchy Around Primary Decisions

**Files:**
- Modify: `frontend/src/app/features/restaurant-pos/pages/restaurant-pos-dashboard-page/restaurant-pos-dashboard-page.ts`
- Modify: `frontend/src/app/features/restaurant-pos/pages/restaurant-pos-dashboard-page/restaurant-pos-dashboard-page.html`
- Modify: `frontend/src/app/features/restaurant-pos/pages/restaurant-pos-dashboard-page/restaurant-pos-dashboard-page.css`
- Test: `frontend/src/app/features/restaurant-pos/pages/restaurant-pos-dashboard-page/restaurant-pos-dashboard-page.spec.ts`

**Interfaces:**
- Consumes: existing `report()`, `dominantPaymentMethod`, `salesByDaySeries`, `averageTicketByDaySeries`, `paymentBreakdownSeries`, `paymentShareSeries`, `topProductsSeries`, `peakHoursSeries`
- Produces:
  - `protected readonly bestRevenueDay = computed(...)`
  - `protected readonly kpiCards = computed(...)` or equivalent helper getters
  - semantic sections in markup for `summary`, `trends`, `payments`, `secondary`

- [ ] **Step 1: Write the failing test**

```ts
it('renders dashboard sections in the new hierarchy with payments as a dedicated section', async () => {
  const i18n = provideI18nTesting();
  const restaurantContext = createRestaurantContextMock();
  const routeHarness = createRouteHarness();
  const api = { getReport: vi.fn(() => of(createReport())) };

  await render(RestaurantPosDashboardPage, {
    imports: [...i18n.imports],
    providers: [
      ...i18n.providers,
      ...routeHarness.providers,
      { provide: RestaurantContextStore, useValue: restaurantContext },
      { provide: RestaurantAnalyticsApiService, useValue: api },
    ],
  });

  expect(screen.getByRole('region', { name: 'Resumen' })).toBeTruthy();
  expect(screen.getByRole('region', { name: 'Tendencias' })).toBeTruthy();
  expect(screen.getByRole('region', { name: 'Pagos' })).toBeTruthy();
  expect(screen.getByRole('region', { name: 'Operativa' })).toBeTruthy();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test --watch=false --include src/app/features/restaurant-pos/pages/restaurant-pos-dashboard-page/restaurant-pos-dashboard-page.spec.ts`

Expected: FAIL because the current dashboard is still a flat 2-column grid without semantic grouped sections.

- [ ] **Step 3: Write minimal implementation**

```ts
protected readonly bestRevenueDay = computed(() => {
  const points = this.report()?.salesByDay ?? [];
  if (!points.length) return null;
  return points.reduce((best, point) => point.revenueCents > best.revenueCents ? point : best);
});
```

```html
<section class="restaurant-pos-dashboard-page__summary" aria-label="{{ 'restaurantPos.dashboard.sections.summary' | transloco }}">
  <!-- KPI cards: revenue, orders, average ticket, dominant payment or best day -->
</section>

<section class="restaurant-pos-dashboard-page__trends" aria-label="{{ 'restaurantPos.dashboard.sections.trends' | transloco }}">
  <!-- sales by day + average ticket by day -->
</section>

<section class="restaurant-pos-dashboard-page__payments" aria-label="{{ 'restaurantPos.dashboard.sections.payments' | transloco }}">
  <!-- payment donut + payment share chart + table/insight -->
</section>

<section class="restaurant-pos-dashboard-page__secondary" aria-label="{{ 'restaurantPos.dashboard.sections.secondary' | transloco }}">
  <!-- top products + peak hours -->
</section>
```

```css
.restaurant-pos-dashboard-page__trends,
.restaurant-pos-dashboard-page__payments,
.restaurant-pos-dashboard-page__secondary {
  display: grid;
  gap: 1rem;
}

@media (min-width: 1024px) {
  .restaurant-pos-dashboard-page__trends {
    grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
  }

  .restaurant-pos-dashboard-page__payments {
    grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
    align-items: start;
  }
}
```

- [ ] **Step 4: Run focused verification**

Run:
- `pnpm test --watch=false --include src/app/features/restaurant-pos/pages/restaurant-pos-dashboard-page/restaurant-pos-dashboard-page.spec.ts`
- `pnpm build`

Expected: PASS, with the hierarchy visible in both chart mode and table mode.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/features/restaurant-pos/pages/restaurant-pos-dashboard-page/restaurant-pos-dashboard-page.ts frontend/src/app/features/restaurant-pos/pages/restaurant-pos-dashboard-page/restaurant-pos-dashboard-page.html frontend/src/app/features/restaurant-pos/pages/restaurant-pos-dashboard-page/restaurant-pos-dashboard-page.css frontend/src/app/features/restaurant-pos/pages/restaurant-pos-dashboard-page/restaurant-pos-dashboard-page.spec.ts
git commit -m "feat: reorganize analytics dashboard hierarchy"
```

### Task 4: Preserve Accessibility and Finish With Focused Regression Coverage

**Files:**
- Modify: `frontend/src/app/features/restaurant-pos/pages/restaurant-pos-dashboard-page/restaurant-pos-dashboard-page.spec.ts`

**Interfaces:**
- Consumes: all page helpers introduced in Tasks 1-3
- Produces: focused regression coverage for new UI state without broadening into unrelated restaurant POS screens

- [ ] **Step 1: Write the failing tests**

```ts
it('keeps the table view toggle working after the layout reorganization', async () => {
  const i18n = provideI18nTesting();
  const restaurantContext = createRestaurantContextMock();
  const routeHarness = createRouteHarness({ view: 'table' });
  const api = { getReport: vi.fn(() => of(createReport())) };

  TestBed.overrideComponent(RestaurantPosDashboardPage, {
    remove: { imports: [Chart] },
    add: { imports: [ChartStub] },
  });

  await render(RestaurantPosDashboardPage, {
    imports: [...i18n.imports],
    providers: [
      ...i18n.providers,
      ...routeHarness.providers,
      { provide: RestaurantContextStore, useValue: restaurantContext },
      { provide: RestaurantAnalyticsApiService, useValue: api },
    ],
  });

  expect(screen.getAllByRole('table').length).toBe(5);
  fireEvent.click(screen.getByRole('button', { name: 'Ver como grafico' }));
  expect(screen.queryByRole('table')).toBeNull();
});
```

```ts
it('does not hide the error state behind the collapsed filter card', async () => {
  const i18n = provideI18nTesting();
  const restaurantContext = createRestaurantContextMock();
  const routeHarness = createRouteHarness({ filters: 'closed' });
  const api = {
    getReport: vi.fn(() =>
      throwError(() => new HttpErrorResponse({ status: 500, statusText: 'Internal Server Error' })),
    ),
  };

  await render(RestaurantPosDashboardPage, {
    imports: [...i18n.imports],
    providers: [
      ...i18n.providers,
      ...routeHarness.providers,
      { provide: RestaurantContextStore, useValue: restaurantContext },
      { provide: RestaurantAnalyticsApiService, useValue: api },
    ],
  });

  expect(screen.getByText('No se han podido cargar las analiticas')).toBeTruthy();
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test --watch=false --include src/app/features/restaurant-pos/pages/restaurant-pos-dashboard-page/restaurant-pos-dashboard-page.spec.ts`

Expected: FAIL until the final layout and state transitions are fully wired.

- [ ] **Step 3: Finish the implementation and tighten assertions**

```ts
expect(screen.getByRole('button', { name: 'Mostrar filtros' })).toBeTruthy();
expect(screen.getByRole('button', { name: 'Limpiar filtros' })).toBeTruthy();
expect(screen.getByRole('region', { name: 'Pagos' })).toBeTruthy();
expect(screen.getByText('Efectivo')).toBeTruthy();
```

- [ ] **Step 4: Run final verification**

Run:
- `pnpm test --watch=false --include src/app/features/restaurant-pos/pages/restaurant-pos-dashboard-page/restaurant-pos-dashboard-page.spec.ts`
- `pnpm build`

Expected: PASS, with only any pre-existing bundle budget warning remaining.

- [ ] **Step 5: Review diff and commit**

Run:
- `git diff --stat`
- `git status --short`

Expected: only the dashboard page, its tests, and the touched i18n files are modified for this iteration.

```bash
git add frontend/src/app/features/restaurant-pos/pages/restaurant-pos-dashboard-page frontend/public/i18n/en.json frontend/public/i18n/es.json frontend/public/i18n/ca.json
git commit -m "test: cover analytics dashboard next iteration"
```

---

## Self-Review

### Spec coverage
- Collapsible filters like audit: covered by Task 1 and Task 2.
- Better dashboard hierarchy: covered by Task 3.
- Active filter context and reset path: covered by Task 2.
- Persisted view/filter presentation state: covered by Task 1.
- No backend/API changes: enforced in Global Constraints and all tasks.
- Accessibility and regression confidence: covered by Task 4.

### Placeholder scan
- No `TODO`, `TBD`, or “similar to previous task” placeholders remain.
- Every task names exact files, concrete commands, and concrete code anchors.

### Type consistency
- Dashboard view is consistently named `DashboardViewMode` with values `'chart' | 'table'`.
- Collapsible filter state is consistently `filtersExpanded`.
- Active filter summary uses `ActiveFilterChip` and is kept local to the dashboard page.
