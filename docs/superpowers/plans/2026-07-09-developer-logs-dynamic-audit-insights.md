# Developer Logs Dynamic Audit Insights Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the `/developer/logs` insight band switch between operations signals and mixed audit signals, then tighten the page spacing so filters, insights, KPIs, and table feel like one dashboard.

**Architecture:** Keep the existing three-card band and route card generation through one dispatcher that branches by `view()`. Derive audit insights from `summary`, `breakdown`, `timelineEvents`, and active filters already loaded in the page, then apply a small CSS/html polish pass without changing the route structure or adding backend dependencies.

**Tech Stack:** Angular standalone components, signals/computed state, Transloco, Testing Library, Vitest, pnpm

## Global Constraints

- Do not add backend API changes unless a missing field blocks the design.
- Keep the current three-card insight band layout and only swap titles, summaries, details, and click actions by active view.
- Use dynamic insight builders split into operations and audit paths instead of growing one monolithic helper.
- Keep the polish pass constrained to spacing, density, and hierarchy; no redesign and no new charts.
- Add focused frontend tests for audit insight rendering and click behavior.
- Verify with `pnpm exec ng test --watch=false --include src/app/features/developer/pages/developer-logs-page/developer-logs-page.spec.ts`, `pnpm exec ng test --watch=false --include src/app/shared/ui/chart/chart.spec.ts`, and `pnpm build`.

---

## File Structure

- Modify: `frontend/src/app/features/developer/pages/developer-logs-page/developer-logs-page.ts`
  Responsibility: dispatch by view, define audit insight action types, compute audit insight cards from loaded page data, and apply audit-specific click filters.
- Modify: `frontend/src/app/features/developer/pages/developer-logs-page/developer-logs-page.html`
  Responsibility: keep the shared insight-band markup but expose any small copy or affordance adjustments needed by the new audit cards.
- Modify: `frontend/src/app/features/developer/pages/developer-logs-page/developer-logs-page.css`
  Responsibility: tighten section rhythm, compact top-row spacing, and make the filter card, insight band, KPI cards, and table feel visually continuous.
- Modify: `frontend/src/app/features/developer/pages/developer-logs-page/developer-logs-page.spec.ts`
  Responsibility: protect operations behavior, assert audit-specific card text, and verify clickable audit actions apply the right filters.
- Modify: `frontend/public/i18n/es.json`
  Responsibility: Spanish copy for audit insight titles and fallback text.
- Modify: `frontend/public/i18n/en.json`
  Responsibility: English copy for audit insight titles and fallback text.
- Modify: `frontend/public/i18n/ca.json`
  Responsibility: Catalan copy for audit insight titles and fallback text.

### Task 1: Split Insight Builders And Add Audit Insight Logic

**Files:**
- Modify: `frontend/src/app/features/developer/pages/developer-logs-page/developer-logs-page.spec.ts`
- Modify: `frontend/src/app/features/developer/pages/developer-logs-page/developer-logs-page.ts`

**Interfaces:**
- Consumes: `DeveloperLogSummaryDto`, `DeveloperLogEventDto`, `DeveloperLogFilters`, `DeveloperLogsView`
- Produces: 
  - `buildOperationsInsightCards(input): DeveloperLogInsightCardVm[]`
  - `buildAuditInsightCards(input): DeveloperLogInsightCardVm[]`
  - `buildInsightCards(input: { view: DeveloperLogsView; ... }): DeveloperLogInsightCardVm[]`
  - audit-only actions:
    - `{ kind: 'audit-actor'; actorUserId: string }`
    - `{ kind: 'audit-entity'; entityType: string }`
    - `{ kind: 'audit-result'; result: 'failed' }`
    - `{ kind: 'audit-origin'; clientOrigin: DeveloperLogFilters['clientOrigin'] }`

- [ ] **Step 1: Write the failing audit insight rendering test**

```ts
it('renders audit-specific insight cards when the audit view is active', async () => {
  const i18n = provideI18nTesting();
  const routeHarness = createRouteHarness({ view: 'audit', category: 'audit' });
  const api = {
    ...pickerApiMocks(),
    getSummary: vi.fn(() => of({
      totalRequests: 4,
      errorCount: 0,
      errorRate: 0,
      auditEvents: 9,
      p95DurationMs: 120,
      authByOrigin: [],
      topSlowPaths: [],
      topErrorEvents: [],
      comparison: {
        previous: {
          totalRequests: 2,
          errorCount: 0,
          errorRate: 0,
          auditEvents: 4,
          p95DurationMs: 100,
        },
        delta: {
          totalRequests: { absolute: 2, percent: 100, direction: 'up' },
          errorCount: { absolute: 0, percent: 0, direction: 'flat' },
          errorRate: { absolute: 0, percent: 0, direction: 'flat' },
          auditEvents: { absolute: 5, percent: 125, direction: 'up' },
          p95DurationMs: { absolute: 20, percent: 20, direction: 'up' },
        },
      },
    })),
    getTimeline: vi.fn(() => of([])),
    getBreakdown: vi.fn(() => of({
      levels: [],
      categories: [{ key: 'audit', count: 9 }],
      origins: [{ key: 'web-admin', count: 6 }],
    })),
    getEvents: vi.fn(() => of({
      total: 3,
      items: [
        makeAuditEvent({ id: 'a1', userId: 'user-1', result: 'failed', entityType: 'auth', clientOrigin: 'web-admin' }),
        makeAuditEvent({ id: 'a2', userId: 'user-1', result: 'succeeded', entityType: 'auth', clientOrigin: 'web-admin' }),
        makeAuditEvent({ id: 'a3', userId: 'user-2', result: 'succeeded', entityType: 'orders', clientOrigin: 'web-pos' }),
      ],
    })),
    getErrorTrendsByPath: vi.fn(() => of([])),
  };

  const { container } = await render(DeveloperLogsPage, {
    imports: [...i18n.imports],
    providers: [...i18n.providers, ...routeHarness.providers, { provide: DeveloperLogsApiService, useValue: api }],
  });

  const band = container.querySelector('.developer-logs-page__insight-band');
  expect(band?.textContent).toContain('developer.logs.insights.auditActivity');
  expect(band?.textContent).toContain('developer.logs.insights.auditRisk');
  expect(band?.textContent).toContain('developer.logs.insights.currentFocus');
  expect(band?.textContent).toContain('user-1');
});
```

- [ ] **Step 2: Run the page spec to verify it fails**

Run: `pnpm exec ng test --watch=false --include src/app/features/developer/pages/developer-logs-page/developer-logs-page.spec.ts`
Expected: FAIL because the page still renders `overview` and `mainAlert` for audit view.

- [ ] **Step 3: Refactor the computed insight dispatcher in the page component**

```ts
protected readonly insightCards = computed<DeveloperLogInsightCardVm[]>(() => buildInsightCards({
  view: this.view(),
  filters: this.filters(),
  summary: this.summary(),
  origins: this.breakdown().origins,
  topErrorEvents: this.topErrorEvents(),
  topSlowPaths: this.topSlowPaths(),
  events: this.timelineEvents(),
  translate: (key: string) => this.transloco.translate(key),
  clientOriginLabel: (origin) => this.clientOriginLabel(origin),
}));
```

```ts
function buildInsightCards(input: {
  view: DeveloperLogsView;
  filters: DeveloperLogFilters;
  summary: DeveloperLogSummaryDto | null;
  origins: Array<{ key: string; count: number }>;
  topErrorEvents: DeveloperLogSummaryDto['topErrorEvents'];
  topSlowPaths: DeveloperLogSummaryDto['topSlowPaths'];
  events: DeveloperLogEventDto[];
  translate: (key: string) => string;
  clientOriginLabel: (origin: string) => string;
}): DeveloperLogInsightCardVm[] {
  return input.view === 'audit'
    ? buildAuditInsightCards(input)
    : buildOperationsInsightCards(input);
}
```

- [ ] **Step 4: Implement the audit card builder with actor/entity/risk heuristics**

```ts
function buildAuditInsightCards(input: {
  filters: DeveloperLogFilters;
  summary: DeveloperLogSummaryDto | null;
  origins: Array<{ key: string; count: number }>;
  events: DeveloperLogEventDto[];
  translate: (key: string) => string;
  clientOriginLabel: (origin: string) => string;
}): DeveloperLogInsightCardVm[] {
  const actorCounts = countBy(input.events.filter((event) => event.userId), (event) => event.userId ?? '');
  const entityCounts = countBy(input.events.filter((event) => event.entityType), (event) => event.entityType ?? '');
  const failedCount = input.events.filter((event) => event.result === 'failed').length;
  const authCount = input.events.filter((event) => event.entityType === 'auth').length;
  const topActor = firstCountEntry(actorCounts);
  const topEntity = firstCountEntry(entityCounts);
  const topOrigin = input.origins[0] ?? null;

  const activityCard: DeveloperLogInsightCardVm = topActor
    ? {
        titleKey: 'developer.logs.insights.auditActivity',
        summary: topActor.key,
        detail: `${topActor.count} ${input.translate('developer.logs.insights.auditActions')}`,
        tone: 'neutral',
        action: { kind: 'audit-actor', actorUserId: topActor.key },
      }
    : topEntity
      ? {
          titleKey: 'developer.logs.insights.auditActivity',
          summary: topEntity.key,
          detail: `${topEntity.count} ${input.translate('developer.logs.insights.auditChanges')}`,
          tone: 'neutral',
          action: { kind: 'audit-entity', entityType: topEntity.key },
        }
      : {
          titleKey: 'developer.logs.insights.auditActivity',
          summary: `${input.summary?.auditEvents ?? 0} ${input.translate('developer.logs.metrics.audit')}`,
          detail: input.translate('developer.logs.insights.auditActivityFallback'),
          tone: 'neutral',
          action: null,
        };

  const riskCard: DeveloperLogInsightCardVm = failedCount > 0
    ? {
        titleKey: 'developer.logs.insights.auditRisk',
        summary: input.translate('developer.logs.insights.failedAuditActions'),
        detail: `${failedCount} ${input.translate('developer.logs.sections.occurrences')}`,
        tone: 'bad',
        action: { kind: 'audit-result', result: 'failed' },
      }
    : authCount > 0
      ? {
          titleKey: 'developer.logs.insights.auditRisk',
          summary: input.translate('developer.logs.insights.authNeedsReview'),
          detail: `${authCount} ${input.translate('developer.logs.insights.auditActions')}`,
          tone: 'neutral',
          action: { kind: 'audit-entity', entityType: 'auth' },
        }
      : {
          titleKey: 'developer.logs.insights.auditRisk',
          summary: input.translate('developer.logs.insights.noRiskHighlighted'),
          detail: input.translate('developer.logs.insights.auditRiskFallback'),
          tone: 'good',
          action: null,
        };

  const focusCard: DeveloperLogInsightCardVm = topEntity
    ? {
        titleKey: 'developer.logs.insights.currentFocus',
        summary: topEntity.key,
        detail: `${topEntity.count} ${input.translate('developer.logs.insights.auditChanges')}`,
        tone: 'neutral',
        action: { kind: 'audit-entity', entityType: topEntity.key },
      }
    : topOrigin
      ? {
          titleKey: 'developer.logs.insights.currentFocus',
          summary: input.clientOriginLabel(topOrigin.key),
          detail: `${topOrigin.count} ${input.translate('developer.logs.insights.events')}`,
          tone: 'neutral',
          action: { kind: 'audit-origin', clientOrigin: parseClientOrigin(topOrigin.key) ?? '' },
        }
      : {
          titleKey: 'developer.logs.insights.currentFocus',
          summary: input.translate('developer.logs.insights.noFocus'),
          detail: input.translate('developer.logs.insights.awaitingSignals'),
          tone: 'neutral',
          action: null,
        };

  return [activityCard, riskCard, focusCard];
}
```

- [ ] **Step 5: Extend `focusInsight` to handle audit actions**

```ts
protected focusInsight(card: DeveloperLogInsightCardVm): void {
  if (!card.action) return;

  if (card.action.kind === 'audit-actor') {
    this.applyFilterState({ actorUserId: card.action.actorUserId, category: 'audit' }, 'audit');
    return;
  }

  if (card.action.kind === 'audit-entity') {
    this.applyFilterState({ entityType: card.action.entityType, category: 'audit', entityId: '' }, 'audit');
    return;
  }

  if (card.action.kind === 'audit-result') {
    this.applyFilterState({ result: card.action.result, category: 'audit' }, 'audit');
    return;
  }

  if (card.action.kind === 'audit-origin') {
    this.applyFilterState({ clientOrigin: card.action.clientOrigin, category: 'audit' }, 'audit');
    return;
  }

  // existing operations actions stay below
}
```

- [ ] **Step 6: Run the page spec to verify the new audit rendering passes**

Run: `pnpm exec ng test --watch=false --include src/app/features/developer/pages/developer-logs-page/developer-logs-page.spec.ts`
Expected: PASS for the new audit rendering test and no regression in the existing operations insight tests.

- [ ] **Step 7: Commit the refactor slice**

```bash
git add frontend/src/app/features/developer/pages/developer-logs-page/developer-logs-page.ts frontend/src/app/features/developer/pages/developer-logs-page/developer-logs-page.spec.ts
git commit -m "feat: add dynamic audit insight builders"
```

### Task 2: Add Clickable Audit Filters And Localized Insight Copy

**Files:**
- Modify: `frontend/src/app/features/developer/pages/developer-logs-page/developer-logs-page.spec.ts`
- Modify: `frontend/src/app/features/developer/pages/developer-logs-page/developer-logs-page.ts`
- Modify: `frontend/public/i18n/es.json`
- Modify: `frontend/public/i18n/en.json`
- Modify: `frontend/public/i18n/ca.json`

**Interfaces:**
- Consumes:
  - `DeveloperLogInsightCardVm['action']`
  - Transloco keys under `developer.logs.insights.*`
- Produces:
  - localized keys:
    - `developer.logs.insights.auditActivity`
    - `developer.logs.insights.auditRisk`
    - `developer.logs.insights.auditActions`
    - `developer.logs.insights.auditChanges`
    - `developer.logs.insights.auditActivityFallback`
    - `developer.logs.insights.failedAuditActions`
    - `developer.logs.insights.authNeedsReview`
    - `developer.logs.insights.noRiskHighlighted`
    - `developer.logs.insights.auditRiskFallback`

- [ ] **Step 1: Write the failing interaction tests for audit risk and activity cards**

```ts
it('applies a failed-result audit filter when the audit risk card is clicked', async () => {
  const setup = await renderAuditInsightPage();

  fireEvent.click(screen.getByRole('button', { name: 'developer.logs.insights.auditRisk' }));

  expect(setup.api.getSummary).toHaveBeenLastCalledWith(expect.objectContaining({
    category: 'audit',
    result: 'failed',
  }));
  expect(setup.api.getEvents).toHaveBeenLastCalledWith(expect.objectContaining({
    category: 'audit',
    result: 'failed',
  }), 1, 20);
});

it('applies an actor audit filter when the audit activity card is clicked', async () => {
  const setup = await renderAuditInsightPage();

  fireEvent.click(screen.getByRole('button', { name: 'developer.logs.insights.auditActivity' }));

  expect(setup.api.getSummary).toHaveBeenLastCalledWith(expect.objectContaining({
    category: 'audit',
    actorUserId: 'user-1',
  }));
});
```

- [ ] **Step 2: Run the page spec to verify the new interaction tests fail first**

Run: `pnpm exec ng test --watch=false --include src/app/features/developer/pages/developer-logs-page/developer-logs-page.spec.ts`
Expected: FAIL if the audit cards render without the correct audit click behavior or copy keys.

- [ ] **Step 3: Add the localized strings in all three language files**

```json
"developer": {
  "logs": {
    "insights": {
      "auditActivity": "Actividad",
      "auditRisk": "Riesgo",
      "auditActions": "acciones visibles",
      "auditChanges": "cambios visibles",
      "auditActivityFallback": "Actividad de auditoría en el rango actual",
      "failedAuditActions": "Acciones fallidas para revisar",
      "authNeedsReview": "La actividad de acceso requiere revisión",
      "noRiskHighlighted": "Sin señal de riesgo destacada",
      "auditRiskFallback": "No hay un patrón riesgoso dominante en lo visible"
    }
  }
}
```

Apply equivalent translations in `frontend/public/i18n/en.json` and `frontend/public/i18n/ca.json`, keeping the same key structure.

- [ ] **Step 4: Factor a reusable audit-page fixture helper inside the spec file**

```ts
async function renderAuditInsightPage() {
  const i18n = provideI18nTesting();
  const routeHarness = createRouteHarness({ view: 'audit', category: 'audit' });
  const api = createAuditInsightApi();

  await render(DeveloperLogsPage, {
    imports: [...i18n.imports],
    providers: [...i18n.providers, ...routeHarness.providers, { provide: DeveloperLogsApiService, useValue: api }],
  });

  return { api };
}
```

- [ ] **Step 5: Run the page spec again to verify audit clicks and copy pass**

Run: `pnpm exec ng test --watch=false --include src/app/features/developer/pages/developer-logs-page/developer-logs-page.spec.ts`
Expected: PASS with audit view text and click behavior covered.

- [ ] **Step 6: Commit the audit interaction and copy slice**

```bash
git add frontend/src/app/features/developer/pages/developer-logs-page/developer-logs-page.spec.ts frontend/src/app/features/developer/pages/developer-logs-page/developer-logs-page.ts frontend/public/i18n/es.json frontend/public/i18n/en.json frontend/public/i18n/ca.json
git commit -m "feat: add mixed audit insight actions"
```

### Task 3: Apply The Final Dashboard Polish Pass And Re-Verify

**Files:**
- Modify: `frontend/src/app/features/developer/pages/developer-logs-page/developer-logs-page.html`
- Modify: `frontend/src/app/features/developer/pages/developer-logs-page/developer-logs-page.css`
- Modify: `frontend/src/app/features/developer/pages/developer-logs-page/developer-logs-page.spec.ts`

**Interfaces:**
- Consumes:
  - `.developer-logs-page__filters`
  - `.developer-logs-page__shortcuts`
  - `.developer-logs-page__insight-band`
  - `.developer-logs-page__summary-cards`
  - `.developer-logs-page__table`
- Produces:
  - compact layout classes for section spacing and top-row grouping
  - one regression test that protects the dense layout hooks

- [ ] **Step 1: Write a failing layout regression test for the compact dashboard rhythm**

```ts
it('keeps the top dashboard stack in the compact mixed layout', async () => {
  const i18n = provideI18nTesting();
  const routeHarness = createRouteHarness();
  const api = createDefaultLogsApi();

  const { container } = await render(DeveloperLogsPage, {
    imports: [...i18n.imports],
    providers: [...i18n.providers, ...routeHarness.providers, { provide: DeveloperLogsApiService, useValue: api }],
  });

  expect(container.querySelector('.developer-logs-page__dashboard-top')).toBeTruthy();
  expect(container.querySelector('.developer-logs-page__shortcuts--compact')).toBeTruthy();
  expect(container.querySelector('.developer-logs-page__summary-cards--compact')).toBeTruthy();
});
```

- [ ] **Step 2: Run the page spec to confirm the compact layout test fails**

Run: `pnpm exec ng test --watch=false --include src/app/features/developer/pages/developer-logs-page/developer-logs-page.spec.ts`
Expected: FAIL because the compact wrapper/classes do not exist yet.

- [ ] **Step 3: Group the top modules in the template with compact dashboard hooks**

```html
<section class="developer-logs-page__dashboard-top">
  <section class="developer-logs-page__shortcuts developer-logs-page__shortcuts--compact">
    <!-- existing shortcut buttons -->
  </section>

  <section class="developer-logs-page__insight-band">
    <!-- existing insight cards -->
  </section>

  <section class="developer-logs-page__summary-cards developer-logs-page__summary-cards--compact">
    <!-- existing KPI cards -->
  </section>
</section>
```

- [ ] **Step 4: Tighten the spacing and density in the page stylesheet**

```css
.developer-logs-page {
  gap: 1.25rem;
}

.developer-logs-page__dashboard-top {
  display: grid;
  gap: 0.85rem;
}

.developer-logs-page__filters {
  gap: 0.85rem;
}

.developer-logs-page__shortcuts--compact,
.developer-logs-page__summary-cards--compact,
.developer-logs-page__insight-band {
  gap: 0.85rem;
}

.developer-logs-page__table {
  gap: 0.65rem;
}
```

- [ ] **Step 5: Re-run focused verification for page behavior and chart compatibility**

Run: `pnpm exec ng test --watch=false --include src/app/features/developer/pages/developer-logs-page/developer-logs-page.spec.ts`
Expected: PASS

Run: `pnpm exec ng test --watch=false --include src/app/shared/ui/chart/chart.spec.ts`
Expected: PASS

Run: `pnpm build`
Expected: PASS, with only the known existing bundle/CommonJS warnings if they are still present.

- [ ] **Step 6: Commit the visual polish slice**

```bash
git add frontend/src/app/features/developer/pages/developer-logs-page/developer-logs-page.html frontend/src/app/features/developer/pages/developer-logs-page/developer-logs-page.css frontend/src/app/features/developer/pages/developer-logs-page/developer-logs-page.spec.ts
git commit -m "style: tighten developer logs dashboard rhythm"
```

## Self-Review

- Spec coverage:
  - Dynamic view-based insight band: covered in Task 1.
  - Audit activity/risk/current focus heuristics: covered in Task 1 and Task 2.
  - Clickable audit filters: covered in Task 2.
  - Small visual polish across filters, insights, KPI cards, and table: covered in Task 3.
  - Focused frontend verification: covered across all tasks, finalized in Task 3.
- Placeholder scan:
  - No `TODO`, `TBD`, or “write tests later” placeholders remain.
- Type consistency:
  - Audit action kinds introduced in Task 1 are the same kinds consumed in Task 2.
  - `buildInsightCards`, `buildOperationsInsightCards`, and `buildAuditInsightCards` use consistent naming across tasks.
