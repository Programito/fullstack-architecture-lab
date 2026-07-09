# Developer Logs Top Grid Balance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reequilibrar la zona superior de `/developer/logs` para que `Insights` queden a la izquierda, `KPIs` a la derecha, ambos con una altura visual más consistente y sin huecos vacíos en desktop.

**Architecture:** Se mantendrá el dashboard actual y solo se ajustará la composición del bloque `developer-logs-page__dashboard-top`. La columna izquierda alojará una pila uniforme de insights y la derecha una rejilla explícita de KPIs en dos columnas con una última card ancha para `Latencia p95`.

**Tech Stack:** Angular standalone templates, CSS grid, Testing Library, Vitest, pnpm

## Global Constraints

- Limitar el cambio a layout de `developer-logs-page__dashboard-top`, `insight-band`, `summary-cards`, y pequeños ajustes de altura, alineación y densidad visual.
- No cambiar copy, backend, filtros, tabla, charts ni añadir nuevos KPIs.
- Mantener en tablet y móvil una sola columna con el orden `shortcuts -> insights -> kpis`.
- La última KPI `Latencia p95` debe ocupar el ancho completo dentro de la columna derecha.
- Verificar con `pnpm exec ng test --watch=false --include src/app/features/developer/pages/developer-logs-page/developer-logs-page.spec.ts` y `pnpm build`.

---

## File Structure

- Modify: `frontend/src/app/features/developer/pages/developer-logs-page/developer-logs-page.html`
  Responsibility: añadir wrappers y clases semánticas para la columna izquierda de insights, la columna derecha de KPIs y la card ancha final de latencia.
- Modify: `frontend/src/app/features/developer/pages/developer-logs-page/developer-logs-page.css`
  Responsibility: convertir el top dashboard en dos columnas en desktop, igualar alturas visuales del bloque de insights y definir la rejilla explícita de KPIs.
- Modify: `frontend/src/app/features/developer/pages/developer-logs-page/developer-logs-page.spec.ts`
  Responsibility: asegurar por test que existe la nueva estructura de columnas y que la card de latencia hace span completo.

### Task 1: Restructure The Top Dashboard Markup

**Files:**
- Modify: `frontend/src/app/features/developer/pages/developer-logs-page/developer-logs-page.html`
- Modify: `frontend/src/app/features/developer/pages/developer-logs-page/developer-logs-page.spec.ts`

**Interfaces:**
- Consumes:
  - `.developer-logs-page__dashboard-top`
  - `.developer-logs-page__insight-band`
  - `.developer-logs-page__summary-cards`
- Produces:
  - `.developer-logs-page__dashboard-main`
  - `.developer-logs-page__dashboard-insights`
  - `.developer-logs-page__dashboard-kpis`
  - `.developer-logs-page__summary-card--wide`

- [ ] **Step 1: Write the failing structure test for the balanced top grid**

```ts
it('renders a balanced top grid with separate insight and kpi columns', async () => {
  const i18n = provideI18nTesting();
  const routeHarness = createRouteHarness();
  const api = {
    ...pickerApiMocks(),
    getSummary: vi.fn(() => of({
      totalRequests: 120,
      errorCount: 8,
      errorRate: 6.7,
      auditEvents: 20,
      p95DurationMs: 340,
      authByOrigin: [],
      topSlowPaths: [],
      topErrorEvents: [],
    })),
    getTimeline: vi.fn(() => of([])),
    getBreakdown: vi.fn(() => of({ levels: [], categories: [], origins: [] })),
    getEvents: vi.fn(() => of({ total: 0, items: [] })),
    getErrorTrendsByPath: vi.fn(() => of([])),
  };

  const { container } = await render(DeveloperLogsPage, {
    imports: [...i18n.imports],
    providers: [...i18n.providers, ...routeHarness.providers, { provide: DeveloperLogsApiService, useValue: api }],
  });

  expect(container.querySelector('.developer-logs-page__dashboard-main')).toBeTruthy();
  expect(container.querySelector('.developer-logs-page__dashboard-insights')).toBeTruthy();
  expect(container.querySelector('.developer-logs-page__dashboard-kpis')).toBeTruthy();
});
```

- [ ] **Step 2: Run the page spec to verify the new structure test fails**

Run: `pnpm exec ng test --watch=false --include src/app/features/developer/pages/developer-logs-page/developer-logs-page.spec.ts`
Expected: FAIL because the new `dashboard-main`, `dashboard-insights`, and `dashboard-kpis` hooks do not exist yet.

- [ ] **Step 3: Add semantic wrappers around the top dashboard columns**

```html
<section class="developer-logs-page__dashboard-top">
  <section class="developer-logs-page__shortcuts developer-logs-page__shortcuts--compact">
    <!-- existing shortcut buttons -->
  </section>

  <section class="developer-logs-page__dashboard-main">
    <section class="developer-logs-page__dashboard-insights">
      <section class="developer-logs-page__insight-band">
        <!-- existing insight cards -->
      </section>
    </section>

    <section class="developer-logs-page__dashboard-kpis">
      <section class="developer-logs-page__summary-cards developer-logs-page__summary-cards--compact">
        <!-- existing KPI cards -->
      </section>
    </section>
  </section>
</section>
```

- [ ] **Step 4: Mark the latency KPI card as the wide closing card**

```html
<app-card variant="outlined" class="developer-logs-page__summary-card developer-logs-page__summary-card--wide">
  <button
    type="button"
    class="developer-logs-page__metric-button"
    [attr.aria-label]="'developer.logs.metrics.latency' | transloco"
    (click)="focusMetric('latency')"
  >
    <p class="developer-logs-page__metric-label">{{ 'developer.logs.metrics.latency' | transloco }}</p>
    <strong>{{ summary()?.p95DurationMs ?? 0 }} ms</strong>
    <p class="developer-logs-page__metric-comparison" [class.good]="comparisonTone('p95DurationMs') === 'good'" [class.bad]="comparisonTone('p95DurationMs') === 'bad'">
      {{ comparisonLabel('p95DurationMs', 'number') }}
    </p>
  </button>
</app-card>
```

- [ ] **Step 5: Run the page spec to verify the structure passes before CSS work**

Run: `pnpm exec ng test --watch=false --include src/app/features/developer/pages/developer-logs-page/developer-logs-page.spec.ts`
Expected: PASS for the new structure test while the visual CSS work still remains.

- [ ] **Step 6: Commit the markup slice**

```bash
git add frontend/src/app/features/developer/pages/developer-logs-page/developer-logs-page.html frontend/src/app/features/developer/pages/developer-logs-page/developer-logs-page.spec.ts
git commit -m "feat: rebalance developer logs top layout markup"
```

### Task 2: Balance The Desktop Grid And Insight Heights

**Files:**
- Modify: `frontend/src/app/features/developer/pages/developer-logs-page/developer-logs-page.css`
- Modify: `frontend/src/app/features/developer/pages/developer-logs-page/developer-logs-page.spec.ts`

**Interfaces:**
- Consumes:
  - `.developer-logs-page__dashboard-main`
  - `.developer-logs-page__dashboard-insights`
  - `.developer-logs-page__dashboard-kpis`
  - `.developer-logs-page__summary-card--wide`
- Produces:
  - 2-column desktop grid for the top dashboard
  - explicit KPI grid with full-width latency card
  - uniform insight card heights

- [ ] **Step 1: Write the failing wide-latency hook test**

```ts
it('marks the latency kpi as the full-width closing card', async () => {
  const i18n = provideI18nTesting();
  const routeHarness = createRouteHarness();
  const api = {
    ...pickerApiMocks(),
    getSummary: vi.fn(() => of({
      totalRequests: 120,
      errorCount: 8,
      errorRate: 6.7,
      auditEvents: 20,
      p95DurationMs: 340,
      authByOrigin: [],
      topSlowPaths: [],
      topErrorEvents: [],
    })),
    getTimeline: vi.fn(() => of([])),
    getBreakdown: vi.fn(() => of({ levels: [], categories: [], origins: [] })),
    getEvents: vi.fn(() => of({ total: 0, items: [] })),
    getErrorTrendsByPath: vi.fn(() => of([])),
  };

  const { container } = await render(DeveloperLogsPage, {
    imports: [...i18n.imports],
    providers: [...i18n.providers, ...routeHarness.providers, { provide: DeveloperLogsApiService, useValue: api }],
  });

  expect(container.querySelector('.developer-logs-page__summary-card--wide')).toBeTruthy();
});
```

- [ ] **Step 2: Run the page spec to verify the latency-wide test fails first**

Run: `pnpm exec ng test --watch=false --include src/app/features/developer/pages/developer-logs-page/developer-logs-page.spec.ts`
Expected: FAIL if the latency KPI is not yet marked with the full-width class.

- [ ] **Step 3: Implement the balanced desktop grid and uniform insight heights**

```css
.developer-logs-page__dashboard-main {
  display: grid;
  gap: 0.85rem;
}

.developer-logs-page__dashboard-insights,
.developer-logs-page__dashboard-kpis {
  min-width: 0;
}

.developer-logs-page__insight-band {
  grid-template-columns: 1fr;
}

.developer-logs-page__insight-band app-card,
.developer-logs-page__insight-card {
  height: 100%;
}

.developer-logs-page__insight-card {
  min-height: 7.5rem;
  align-content: space-between;
}

.developer-logs-page__summary-cards {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.developer-logs-page__summary-card--wide {
  grid-column: 1 / -1;
}

@media (min-width: 1200px) {
  .developer-logs-page__dashboard-main {
    grid-template-columns: minmax(0, 1.05fr) minmax(0, 0.95fr);
    align-items: stretch;
  }
}
```

- [ ] **Step 4: Add the responsive fallback so tablet/mobile stay single-column**

```css
@media (max-width: 1199px) {
  .developer-logs-page__dashboard-main {
    grid-template-columns: 1fr;
  }

  .developer-logs-page__summary-cards {
    grid-template-columns: repeat(auto-fit, minmax(11rem, 1fr));
  }

  .developer-logs-page__summary-card--wide {
    grid-column: auto;
  }
}
```

- [ ] **Step 5: Run focused verification**

Run: `pnpm exec ng test --watch=false --include src/app/features/developer/pages/developer-logs-page/developer-logs-page.spec.ts`
Expected: PASS

Run: `pnpm build`
Expected: PASS, with only the known existing bundle/CommonJS warnings if they remain.

- [ ] **Step 6: Commit the grid-balance slice**

```bash
git add frontend/src/app/features/developer/pages/developer-logs-page/developer-logs-page.css frontend/src/app/features/developer/pages/developer-logs-page/developer-logs-page.spec.ts
git commit -m "style: balance developer logs top grid"
```

## Self-Review

- Spec coverage:
  - 2-column desktop layout: covered in Task 1 and Task 2.
  - equalized insight heights: covered in Task 2.
  - KPI order with full-width latency close: covered in Task 1 and Task 2.
  - single-column fallback for tablet/mobile: covered in Task 2.
- Placeholder scan:
  - No placeholders or undefined future work remain.
- Type consistency:
  - The class names introduced in Task 1 are the same ones styled and tested in Task 2.
