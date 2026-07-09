# Developer Logs Period Comparison Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add previous-period KPI comparison to `/developer/logs` so the main summary cards show whether the selected window improved or worsened versus the immediately preceding window.

**Architecture:** Extend the existing backend summary contract to compute the current summary plus a previous adjacent-window snapshot using the same filters and demo-user restrictions. Keep the frontend on a single summary request, then render compact delta lines beneath the five existing KPI cards without changing chart payloads or table behavior.

**Tech Stack:** NestJS, Prisma, Testcontainers integration specs, Angular standalone components, signals, Transloco, Testing Library, Vitest, existing shared UI primitives.

## Global Constraints

- Work from `backend/` for backend commands and `frontend/` for frontend commands.
- Use `pnpm` for dependency and script commands.
- Follow TDD: write the failing test first, verify it fails, then implement the minimum code.
- Keep `/api/v1/developer/logs/*` behind the existing developer-only controller flow.
- Keep demo-account isolation intact for both current and previous windows.
- Do not remove or rename existing summary fields already consumed by the dashboard.
- Do not compute period comparison on the frontend from partial dashboard data.
- Keep user-visible copy in Transloco and update `es`, `en`, and `ca`.
- Preserve current KPI click-to-filter behavior and current chart layout.
- Do not revert unrelated user changes.

---

## File Map

### Backend files

- Modify: `backend/src/observability/application/observability.types.ts`
  - Extend `LogSummary` with typed comparison fields and shared comparison metric types.
- Modify: `backend/src/observability/application/observability.service.ts`
  - Extract summary-window computation, derive previous-window dates, and compose comparison output.
- Modify: `backend/src/observability/application/observability.service.spec.ts`
  - Add focused unit coverage for date-window math and comparison metric calculation.
- Modify: `backend/src/observability/application/observability.service.integration-spec.ts`
  - Add integration coverage proving previous-window filtering respects timestamps and normalized summary values.

### Frontend files

- Modify: `frontend/src/app/features/developer/api/developer-logs.models.ts`
  - Extend `DeveloperLogSummaryDto` with typed comparison fields.
- Modify: `frontend/src/app/features/developer/pages/developer-logs-page/developer-logs-page.ts`
  - Add helpers that format comparison labels and semantic state per KPI.
- Modify: `frontend/src/app/features/developer/pages/developer-logs-page/developer-logs-page.html`
  - Render compact comparison copy under the five KPI cards.
- Modify: `frontend/src/app/features/developer/pages/developer-logs-page/developer-logs-page.css`
  - Add minimal styles for comparison text and semantic colors.
- Modify: `frontend/src/app/features/developer/pages/developer-logs-page/developer-logs-page.spec.ts`
  - Add coverage for rendering comparison text and zero-baseline fallback.
- Modify: `frontend/public/i18n/es.json`
- Modify: `frontend/public/i18n/en.json`
- Modify: `frontend/public/i18n/ca.json`
  - Add concise copy for “vs previous”, “no comparison”, and optional direction labels if needed.

## Shared Interfaces

### Backend output shape to introduce

```ts
type LogComparisonMetric = {
  absolute: number;
  percent: number | null;
  direction: 'up' | 'down' | 'flat';
};

type LogSummaryComparison = {
  previous: {
    totalRequests: number;
    errorCount: number;
    errorRate: number;
    auditEvents: number;
    p95DurationMs: number;
  };
  delta: {
    totalRequests: LogComparisonMetric;
    errorCount: LogComparisonMetric;
    errorRate: LogComparisonMetric;
    auditEvents: LogComparisonMetric;
    p95DurationMs: LogComparisonMetric;
  };
};
```

### Frontend DTO shape to mirror

```ts
export type DeveloperLogComparisonMetricDto = {
  absolute: number;
  percent: number | null;
  direction: 'up' | 'down' | 'flat';
};
```

## Task 1: Add failing backend unit tests for previous-window summary comparison

**Files:**
- Modify: `backend/src/observability/application/observability.service.spec.ts`

**Interfaces:**
- Consumes: `service.getSummary(from, to, filters?)`
- Produces:
  - `comparison.previous`
  - `comparison.delta`

- [ ] **Step 1: Write the failing test for previous-window summary values**

Add a spec like:

```ts
it('returns comparison metrics using the immediately previous time window', async () => {
  const { prisma, service } = buildService();
  vi.mocked(prisma.appLog.count)
    .mockResolvedValueOnce(20 as never)
    .mockResolvedValueOnce(4 as never)
    .mockResolvedValueOnce(8 as never)
    .mockResolvedValueOnce(10 as never)
    .mockResolvedValueOnce(1 as never)
    .mockResolvedValueOnce(5 as never);
  vi.mocked(prisma.appLog.findMany)
    .mockResolvedValueOnce([
      { durationMs: 100, path: '/api/v1/orders/1', metadata: null },
      { durationMs: 300, path: '/api/v1/orders/2', metadata: null },
    ] as never)
    .mockResolvedValueOnce([
      { durationMs: 50, path: '/api/v1/orders/1', metadata: null },
      { durationMs: 150, path: '/api/v1/orders/2', metadata: null },
    ] as never);
  vi.mocked(prisma.$queryRaw)
    .mockResolvedValueOnce([] as never)
    .mockResolvedValueOnce([] as never)
    .mockResolvedValueOnce([] as never)
    .mockResolvedValueOnce([] as never);

  const summary = await service.getSummary(
    new Date('2026-07-08T10:00:00.000Z'),
    new Date('2026-07-08T12:00:00.000Z'),
    { clientOrigin: 'web-pos' },
  );

  expect(summary.comparison.previous).toEqual({
    totalRequests: 10,
    errorCount: 1,
    errorRate: 10,
    auditEvents: 5,
    p95DurationMs: 150,
  });
  expect(summary.comparison.delta.totalRequests).toEqual({
    absolute: 10,
    percent: 100,
    direction: 'up',
  });
  expect(summary.comparison.delta.errorRate).toEqual({
    absolute: 10,
    percent: 100,
    direction: 'up',
  });
});
```

- [ ] **Step 2: Write the failing test for zero-baseline percent handling**

Add a second spec like:

```ts
it('returns a null percent when the previous value is zero and the current value is non-zero', async () => {
  const { prisma, service } = buildService();
  vi.mocked(prisma.appLog.count)
    .mockResolvedValueOnce(3 as never)
    .mockResolvedValueOnce(1 as never)
    .mockResolvedValueOnce(0 as never)
    .mockResolvedValueOnce(0 as never)
    .mockResolvedValueOnce(0 as never)
    .mockResolvedValueOnce(0 as never);
  vi.mocked(prisma.appLog.findMany)
    .mockResolvedValueOnce([{ durationMs: 120, path: '/api/v1/auth/login', metadata: null }] as never)
    .mockResolvedValueOnce([] as never);
  vi.mocked(prisma.$queryRaw)
    .mockResolvedValueOnce([] as never)
    .mockResolvedValueOnce([] as never)
    .mockResolvedValueOnce([] as never)
    .mockResolvedValueOnce([] as never);

  const summary = await service.getSummary(
    new Date('2026-07-08T10:00:00.000Z'),
    new Date('2026-07-08T11:00:00.000Z'),
  );

  expect(summary.comparison.delta.totalRequests).toEqual({
    absolute: 3,
    percent: null,
    direction: 'up',
  });
});
```

- [ ] **Step 3: Run the focused backend unit spec to verify it fails**

Run:

```bash
.\node_modules\.bin\vitest.cmd run src/observability/application/observability.service.spec.ts
```

Expected: FAIL because `comparison` does not exist on `LogSummary` yet.

- [ ] **Step 4: Commit the red test checkpoint only if the team wants strict TDD commits**

```bash
git add backend/src/observability/application/observability.service.spec.ts
git commit -m "test: define developer log period comparison summary behavior"
```

## Task 2: Implement backend comparison types and summary composition

**Files:**
- Modify: `backend/src/observability/application/observability.types.ts`
- Modify: `backend/src/observability/application/observability.service.ts`

**Interfaces:**
- Consumes:
  - `getSummary(from, to, filters?)`
  - existing raw auth/error aggregations
- Produces:
  - `computeSummaryWindow(...)`
  - `buildComparisonMetric(current, previous)`

- [ ] **Step 1: Extend the backend summary types**

Add types like:

```ts
export type LogComparisonMetric = {
  absolute: number;
  percent: number | null;
  direction: 'up' | 'down' | 'flat';
};

export type LogSummaryComparison = {
  previous: {
    totalRequests: number;
    errorCount: number;
    errorRate: number;
    auditEvents: number;
    p95DurationMs: number;
  };
  delta: {
    totalRequests: LogComparisonMetric;
    errorCount: LogComparisonMetric;
    errorRate: LogComparisonMetric;
    auditEvents: LogComparisonMetric;
    p95DurationMs: LogComparisonMetric;
  };
};
```

and update `LogSummary`:

```ts
export type LogSummary = {
  totalRequests: number;
  errorCount: number;
  errorRate: number;
  auditEvents: number;
  p95DurationMs: number;
  authByOrigin: ...;
  topSlowPaths: ...;
  topErrorEvents: ...;
  comparison: LogSummaryComparison;
};
```

- [ ] **Step 2: Extract a private helper that computes the summary for one window**

Inside `ObservabilityService`, add a helper with the current aggregation body:

```ts
private async computeSummaryWindow(
  from: Date,
  to: Date,
  filters: Partial<Pick<LogQuery, 'level' | 'category' | 'clientOrigin' | 'path' | 'userId' | 'actorUserId' | 'restaurantId' | 'entityType' | 'entityId' | 'result' | 'search' | 'restrictToUserIds'>> = {},
): Promise<Omit<LogSummary, 'comparison'>> {
  // move current count/findMany/queryRaw logic here
}
```

- [ ] **Step 3: Add helpers for previous-window calculation and delta math**

Add helpers like:

```ts
function previousWindow(from: Date, to: Date): { from: Date; to: Date } {
  const durationMs = to.getTime() - from.getTime();
  return {
    from: new Date(from.getTime() - durationMs),
    to: new Date(from.getTime()),
  };
}

function buildComparisonMetric(current: number, previous: number): LogComparisonMetric {
  const absolute = Number((current - previous).toFixed(1));
  const percent = previous === 0 ? (current === 0 ? 0 : null) : Number((((current - previous) / previous) * 100).toFixed(1));
  return {
    absolute,
    percent,
    direction: absolute > 0 ? 'up' : absolute < 0 ? 'down' : 'flat',
  };
}
```

- [ ] **Step 4: Compose current + previous summary inside `getSummary`**

Implement the outer method like:

```ts
const current = await this.computeSummaryWindow(from, to, filters);
const previousRange = previousWindow(from, to);
const previous = await this.computeSummaryWindow(previousRange.from, previousRange.to, filters);

return {
  ...current,
  comparison: {
    previous: {
      totalRequests: previous.totalRequests,
      errorCount: previous.errorCount,
      errorRate: previous.errorRate,
      auditEvents: previous.auditEvents,
      p95DurationMs: previous.p95DurationMs,
    },
    delta: {
      totalRequests: buildComparisonMetric(current.totalRequests, previous.totalRequests),
      errorCount: buildComparisonMetric(current.errorCount, previous.errorCount),
      errorRate: buildComparisonMetric(current.errorRate, previous.errorRate),
      auditEvents: buildComparisonMetric(current.auditEvents, previous.auditEvents),
      p95DurationMs: buildComparisonMetric(current.p95DurationMs, previous.p95DurationMs),
    },
  },
};
```

- [ ] **Step 5: Preserve the existing error fallback shape**

In the `catch` branch, return:

```ts
comparison: {
  previous: {
    totalRequests: 0,
    errorCount: 0,
    errorRate: 0,
    auditEvents: 0,
    p95DurationMs: 0,
  },
  delta: {
    totalRequests: { absolute: 0, percent: 0, direction: 'flat' },
    errorCount: { absolute: 0, percent: 0, direction: 'flat' },
    errorRate: { absolute: 0, percent: 0, direction: 'flat' },
    auditEvents: { absolute: 0, percent: 0, direction: 'flat' },
    p95DurationMs: { absolute: 0, percent: 0, direction: 'flat' },
  },
}
```

- [ ] **Step 6: Re-run the focused backend unit spec**

Run:

```bash
.\node_modules\.bin\vitest.cmd run src/observability/application/observability.service.spec.ts
```

Expected: PASS with the new comparison tests and existing summary tests still green.

- [ ] **Step 7: Commit**

```bash
git add backend/src/observability/application/observability.types.ts backend/src/observability/application/observability.service.ts backend/src/observability/application/observability.service.spec.ts
git commit -m "feat: add developer log summary period comparison"
```

## Task 3: Add backend integration coverage for date-window correctness

**Files:**
- Modify: `backend/src/observability/application/observability.service.integration-spec.ts`

**Interfaces:**
- Consumes: `service.getSummary(from, to, filters?)`
- Produces: proof that previous-window comparison respects timestamp boundaries and filters.

- [ ] **Step 1: Write the failing integration spec**

Add a case like:

```ts
it('computes summary comparison from the previous adjacent time window', async () => {
  await prisma.appLog.createMany({
    data: [
      {
        timestamp: new Date('2026-01-10T08:15:00.000Z'),
        source: 'backend',
        category: 'request',
        level: 'info',
        event: 'http.request.completed',
        message: 'previous request',
        path: '/api/v1/health',
        durationMs: 100,
      },
      {
        timestamp: new Date('2026-01-10T10:15:00.000Z'),
        source: 'backend',
        category: 'request',
        level: 'error',
        event: 'http.request.failed',
        message: 'current request',
        path: '/api/v1/health',
        durationMs: 300,
      },
    ],
  });

  const summary = await service.getSummary(
    new Date('2026-01-10T10:00:00.000Z'),
    new Date('2026-01-10T12:00:00.000Z'),
  );

  expect(summary.totalRequests).toBe(1);
  expect(summary.comparison.previous.totalRequests).toBe(1);
  expect(summary.comparison.delta.errorCount).toEqual({
    absolute: 1,
    percent: null,
    direction: 'up',
  });
});
```

- [ ] **Step 2: Run the focused integration spec to verify it fails**

Run:

```bash
pnpm test:integration -- observability.service.integration-spec.ts
```

Expected: FAIL before the backend implementation exists, or PASS only after Task 2 is complete.

- [ ] **Step 3: Keep or adjust the seed data until the failure proves the window logic**

If the first attempt fails for the wrong reason, tighten the timestamps so the previous and current windows are unambiguous.

- [ ] **Step 4: Re-run the focused integration spec after Task 2**

Run:

```bash
pnpm test:integration -- observability.service.integration-spec.ts
```

Expected: PASS with Docker/Testcontainers available.

- [ ] **Step 5: Commit**

```bash
git add backend/src/observability/application/observability.service.integration-spec.ts
git commit -m "test: cover developer log comparison windows"
```

## Task 4: Add failing frontend page tests for KPI comparison rendering

**Files:**
- Modify: `frontend/src/app/features/developer/pages/developer-logs-page/developer-logs-page.spec.ts`

**Interfaces:**
- Consumes: `DeveloperLogSummaryDto`
- Produces:
  - visible comparison copy below KPI values
  - fallback copy when previous baseline is zero

- [ ] **Step 1: Extend the summary mocks in one test with comparison data**

Add a spec like:

```ts
it('renders comparison text beneath the main kpi values', async () => {
  await render(DeveloperLogsPage, {
    // existing providers
  });

  expect(screen.getByText('+10 vs previous')).toBeTruthy();
  expect(screen.getByText('+100% vs previous')).toBeTruthy();
});
```

Use a mock summary like:

```ts
comparison: {
  previous: {
    totalRequests: 10,
    errorCount: 1,
    errorRate: 10,
    auditEvents: 5,
    p95DurationMs: 150,
  },
  delta: {
    totalRequests: { absolute: 10, percent: 100, direction: 'up' },
    errorCount: { absolute: 3, percent: 300, direction: 'up' },
    errorRate: { absolute: 10, percent: 100, direction: 'up' },
    auditEvents: { absolute: 3, percent: 60, direction: 'up' },
    p95DurationMs: { absolute: 150, percent: 100, direction: 'up' },
  },
}
```

- [ ] **Step 2: Add a failing zero-baseline fallback test**

Add:

```ts
it('renders a no-comparison fallback when percent is null', async () => {
  await render(DeveloperLogsPage, {
    // summary mock with percent: null
  });

  expect(screen.getByText('developer.logs.metrics.noComparison')).toBeTruthy();
});
```

- [ ] **Step 3: Run the focused frontend spec to verify it fails**

Run:

```bash
pnpm exec ng test --watch=false --include src/app/features/developer/pages/developer-logs-page/developer-logs-page.spec.ts
```

Expected: FAIL because the DTO and template do not render comparison copy yet.

- [ ] **Step 4: Commit the red test checkpoint only if desired**

```bash
git add frontend/src/app/features/developer/pages/developer-logs-page/developer-logs-page.spec.ts
git commit -m "test: define developer log kpi comparison rendering"
```

## Task 5: Implement frontend DTO, formatting helpers, and KPI comparison UI

**Files:**
- Modify: `frontend/src/app/features/developer/api/developer-logs.models.ts`
- Modify: `frontend/src/app/features/developer/pages/developer-logs-page/developer-logs-page.ts`
- Modify: `frontend/src/app/features/developer/pages/developer-logs-page/developer-logs-page.html`
- Modify: `frontend/src/app/features/developer/pages/developer-logs-page/developer-logs-page.css`
- Modify: `frontend/public/i18n/es.json`
- Modify: `frontend/public/i18n/en.json`
- Modify: `frontend/public/i18n/ca.json`

**Interfaces:**
- Consumes:
  - `summary()?.comparison`
  - existing KPI cards
- Produces:
  - `comparisonLabel(metricKey, mode)`
  - `comparisonClass(metricKey, trendType)`

- [ ] **Step 1: Extend the frontend DTOs**

In `developer-logs.models.ts`, add:

```ts
export type DeveloperLogComparisonMetricDto = {
  absolute: number;
  percent: number | null;
  direction: 'up' | 'down' | 'flat';
};

export type DeveloperLogSummaryComparisonDto = {
  previous: {
    totalRequests: number;
    errorCount: number;
    errorRate: number;
    auditEvents: number;
    p95DurationMs: number;
  };
  delta: {
    totalRequests: DeveloperLogComparisonMetricDto;
    errorCount: DeveloperLogComparisonMetricDto;
    errorRate: DeveloperLogComparisonMetricDto;
    auditEvents: DeveloperLogComparisonMetricDto;
    p95DurationMs: DeveloperLogComparisonMetricDto;
  };
};
```

and update:

```ts
comparison: DeveloperLogSummaryComparisonDto;
```

- [ ] **Step 2: Add page helpers for compact copy and semantic state**

In `developer-logs-page.ts`, add helpers like:

```ts
protected comparisonLabel(
  metric: keyof NonNullable<DeveloperLogSummaryDto['comparison']>['delta'],
  format: 'number' | 'percent',
): string {
  const delta = this.summary()?.comparison.delta[metric];
  if (!delta) return this.transloco.translate('developer.logs.metrics.noComparison');
  if (format === 'percent') {
    return delta.percent == null
      ? this.transloco.translate('developer.logs.metrics.noComparison')
      : `${delta.percent > 0 ? '+' : ''}${delta.percent}% ${this.transloco.translate('developer.logs.metrics.vsPrevious')}`;
  }
  return `${delta.absolute > 0 ? '+' : ''}${delta.absolute} ${this.transloco.translate('developer.logs.metrics.vsPrevious')}`;
}

protected comparisonTone(
  metric: 'totalRequests' | 'errorCount' | 'errorRate' | 'auditEvents' | 'p95DurationMs',
): 'good' | 'bad' | 'neutral' {
  const delta = this.summary()?.comparison.delta[metric];
  if (!delta || delta.direction === 'flat') return 'neutral';
  const higherIsWorse = metric === 'errorCount' || metric === 'errorRate' || metric === 'p95DurationMs';
  return higherIsWorse
    ? (delta.direction === 'up' ? 'bad' : 'good')
    : (delta.direction === 'up' ? 'good' : 'bad');
}
```

- [ ] **Step 3: Render one compact comparison row under each KPI**

Update the five KPI cards with blocks like:

```html
<p class="developer-logs-page__metric-comparison" [class]="comparisonTone('totalRequests')">
  {{ comparisonLabel('totalRequests', 'percent') }}
</p>
```

Use the same pattern for:
- `errorCount`
- `errorRate`
- `auditEvents`
- `p95DurationMs`

For metrics where absolute is more useful than percent, use the number variant:

```html
{{ comparisonLabel('p95DurationMs', 'number') }}
```

- [ ] **Step 4: Add minimal CSS for compact comparison styling**

Add:

```css
.developer-logs-page__metric-comparison {
  margin: 0.35rem 0 0;
  font-size: 0.8rem;
  line-height: 1.2;
  color: var(--ui-text-muted, #71717a);
}

.developer-logs-page__metric-comparison.good {
  color: color-mix(in srgb, var(--ui-success, #15803d) 78%, black);
}

.developer-logs-page__metric-comparison.bad {
  color: color-mix(in srgb, var(--ui-danger, #b91c1c) 82%, black);
}
```

- [ ] **Step 5: Add Transloco strings**

Add at least:

```json
"vsPrevious": "vs anterior",
"noComparison": "Sin comparativa"
```

and the English/Catalan equivalents in:
- `frontend/public/i18n/en.json`
- `frontend/public/i18n/ca.json`

- [ ] **Step 6: Re-run the focused frontend spec**

Run:

```bash
pnpm exec ng test --watch=false --include src/app/features/developer/pages/developer-logs-page/developer-logs-page.spec.ts
```

Expected: PASS with the new KPI comparison tests and current KPI click behavior still passing.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/app/features/developer/api/developer-logs.models.ts frontend/src/app/features/developer/pages/developer-logs-page/developer-logs-page.ts frontend/src/app/features/developer/pages/developer-logs-page/developer-logs-page.html frontend/src/app/features/developer/pages/developer-logs-page/developer-logs-page.css frontend/src/app/features/developer/pages/developer-logs-page/developer-logs-page.spec.ts frontend/public/i18n/es.json frontend/public/i18n/en.json frontend/public/i18n/ca.json
git commit -m "feat: show developer log kpi period comparison"
```

## Task 6: Run end-to-end verification for the comparison slice

**Files:**
- Review: `backend/src/observability/application/observability.service.spec.ts`
- Review: `backend/src/observability/application/observability.service.integration-spec.ts`
- Review: `frontend/src/app/features/developer/pages/developer-logs-page/developer-logs-page.spec.ts`

**Interfaces:**
- Consumes: all changes from Tasks 1-5
- Produces: fresh verification evidence before any PR or merge step.

- [ ] **Step 1: Run the focused backend unit spec**

Run:

```bash
.\node_modules\.bin\vitest.cmd run src/observability/application/observability.service.spec.ts
```

Expected: PASS.

- [ ] **Step 2: Run the backend integration spec**

Run:

```bash
pnpm test:integration -- observability.service.integration-spec.ts
```

Expected: PASS with Docker/Testcontainers available.

- [ ] **Step 3: Run the focused frontend page spec**

Run:

```bash
pnpm exec ng test --watch=false --include src/app/features/developer/pages/developer-logs-page/developer-logs-page.spec.ts
```

Expected: PASS.

- [ ] **Step 4: Run the focused shared chart spec to guard regressions**

Run:

```bash
pnpm exec ng test --watch=false --include src/app/shared/ui/chart/chart.spec.ts
```

Expected: PASS.

- [ ] **Step 5: Run the frontend production build**

Run:

```bash
pnpm build
```

Expected: PASS. Existing warnings are acceptable only if they remain the known bundle budget warning and the existing `exceljs` / `jszip` CommonJS warnings.

- [ ] **Step 6: Commit any final fixups**

```bash
git add backend/src/observability/application/observability.types.ts backend/src/observability/application/observability.service.ts backend/src/observability/application/observability.service.spec.ts backend/src/observability/application/observability.service.integration-spec.ts frontend/src/app/features/developer/api/developer-logs.models.ts frontend/src/app/features/developer/pages/developer-logs-page/developer-logs-page.ts frontend/src/app/features/developer/pages/developer-logs-page/developer-logs-page.html frontend/src/app/features/developer/pages/developer-logs-page/developer-logs-page.css frontend/src/app/features/developer/pages/developer-logs-page/developer-logs-page.spec.ts frontend/public/i18n/es.json frontend/public/i18n/en.json frontend/public/i18n/ca.json
git commit -m "chore: finalize developer log period comparison"
```

## Self-Review

- Spec coverage:
  - backend summary extension: covered by Tasks 1-3.
  - previous-window math and zero-baseline handling: covered by Tasks 1-3.
  - frontend KPI comparison rendering: covered by Tasks 4-5.
  - verification across backend and frontend: covered by Task 6.
- Placeholder scan:
  - no `TODO` or `TBD` placeholders remain.
  - all tasks name exact files, commands, and target code shapes.
- Type consistency:
  - `LogComparisonMetric` and `DeveloperLogComparisonMetricDto` are defined before later tasks reference them.
  - `comparison.previous` and `comparison.delta` shapes stay aligned between backend and frontend.
