# Servicio De Sala Command Center Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rework the restaurant floor service screen into a modern command-center layout with workflow-first table handling and a drawer-based product picker, while preserving current service, kitchen, payment, and closing behavior.

**Architecture:** Keep `RestaurantPosServicePage` as the orchestration layer and push visual restructuring through computed view-model helpers plus focused template changes in the page, table panel, floor plan, and product picker. Reuse existing API calls, store actions, and dialog/customizer flows so the redesign stays within the current feature boundary and does not alter backend contracts.

**Tech Stack:** Angular standalone components, Angular signals, Transloco, Tailwind utility classes, component-scoped templates, Vitest, Testing Library

## Global Constraints

- The work is concentrated in `frontend/src/app/features/restaurant-pos/pages/restaurant-pos-service-page/`.
- The priority is visual clarity and a more premium, technological TPV feel.
- The approved product direction is a mix of `command center` and `workflow-first`.
- Preserve the current service logic for table selection, order editing, kitchen handoff, payment, and closing.
- Do not change routing or backend contracts in this phase.
- Keep the product picker as an overlay pattern, but redesign it into a drawer-like experience.
- Reuse the existing `RestaurantPosStore`, `OrderWriteService`, product customizers, and floor-plan interactions.
- Keep accessibility behavior aligned with the project UI guidance.

---

### Task 1: Add Service Dashboard And Workflow View Models

**Files:**
- Modify: `frontend/src/app/features/restaurant-pos/pages/restaurant-pos-service-page/restaurant-pos-service-page.ts`
- Modify: `frontend/src/app/features/restaurant-pos/components/service-table-panel/service-table-panel.ts`
- Test: `frontend/src/app/features/restaurant-pos/pages/restaurant-pos-service-page/restaurant-pos-service-page.spec.ts`
- Test: `frontend/src/app/features/restaurant-pos/components/service-table-panel/service-table-panel.spec.ts`

**Interfaces:**
- Consumes: `store.servicePoints()`, `store.selectedServiceInfo()`, `store.selectedOrder()`, `store.selectedTable()`, `lastSelectedServicePoint()`, `productQuantities()`
- Produces: `serviceDashboardStats(): Array<{ id: 'occupied' | 'kitchen' | 'charge' | 'sales'; value: string; tone: 'neutral' | 'warning' | 'accent' }>`, `activeServiceFilters(): Array<{ id: string; label: string; active: boolean }>`, `selectedServiceWorkflowSections(): Array<{ id: 'summary' | 'order' | 'kitchen' | 'payment' | 'closing'; titleKey: string; highlighted: boolean; countLabel: string | null }>`, `selectedServiceHero(): { statusLabel: string; durationLabel: string; guestLabel: string; totalLabel: string; nextActionLabel: string }`, `productPickerMode(): 'drawer'`

- [ ] **Step 1: Write the failing tests for the new page and panel view models**

```ts
it('derives compact dashboard stats for the command center header', async () => {
  const { fixture } = await renderServicePage();
  const component = fixture.componentInstance as unknown as {
    serviceDashboardStats(): Array<{ id: string; value: string }>;
  };

  expect(component.serviceDashboardStats()).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ id: 'occupied' }),
      expect.objectContaining({ id: 'kitchen' }),
      expect.objectContaining({ id: 'charge' }),
      expect.objectContaining({ id: 'sales' }),
    ]),
  );
});

it('exposes workflow-first panel sections with one highlighted next step', async () => {
  const serviceInfo = buildSelectedServiceInfo({ nextAction: { type: 'send_kitchen', count: 2 } });
  const { fixture } = await render(ServiceTablePanelHostComponent, { componentProperties: { serviceInfo } });
  const component = fixture.debugElement.children[0].componentInstance as ServiceTablePanel & {
    selectedServiceWorkflowSections(): Array<{ id: string; highlighted: boolean }>;
  };

  expect(component.selectedServiceWorkflowSections()).toContainEqual(
    expect.objectContaining({ id: 'kitchen', highlighted: true }),
  );
});
```

- [ ] **Step 2: Run the focused specs to verify they fail**

Run: `pnpm test -- --watch=false src/app/features/restaurant-pos/pages/restaurant-pos-service-page/restaurant-pos-service-page.spec.ts`
Expected: FAIL with missing `serviceDashboardStats` symbols or mismatched expectations.

Run: `pnpm test -- --watch=false src/app/features/restaurant-pos/components/service-table-panel/service-table-panel.spec.ts`
Expected: FAIL with missing `selectedServiceWorkflowSections` symbols or mismatched expectations.

- [ ] **Step 3: Add the minimal computed signals for dashboard and workflow grouping**

```ts
protected readonly serviceDashboardStats = computed(() => {
  const servicePoints = this.store.servicePoints();
  const occupied = servicePoints.filter((point) => point.table.status !== 'free').length;
  const kitchen = servicePoints.filter((point) => point.table.status === 'waiting_kitchen').length;
  const charge = servicePoints.filter((point) => point.table.status === 'payment_pending' || point.table.status === 'served').length;

  return [
    { id: 'occupied', value: String(occupied), tone: 'neutral' as const },
    { id: 'kitchen', value: String(kitchen), tone: kitchen > 0 ? 'warning' as const : 'neutral' as const },
    { id: 'charge', value: String(charge), tone: charge > 0 ? 'accent' as const : 'neutral' as const },
    { id: 'sales', value: this.formatCurrency(this.store.salesToday()), tone: 'accent' as const },
  ];
});

protected readonly productPickerMode = computed<'drawer'>(() => 'drawer');
```

```ts
protected readonly selectedServiceWorkflowSections = computed(() => {
  const info = this.serviceInfo();
  const order = info?.order;
  const pendingKitchenCount = info?.pendingKitchenCount ?? 0;
  const nextAction = info?.nextAction?.type;

  return [
    { id: 'summary', titleKey: 'restaurantPos.service.workflow.summary', highlighted: false, countLabel: null },
    { id: 'order', titleKey: 'restaurantPos.service.workflow.order', highlighted: false, countLabel: order ? `${order.lines.length}` : null },
    { id: 'kitchen', titleKey: 'restaurantPos.service.workflow.kitchen', highlighted: nextAction === 'send_kitchen' || nextAction === 'mark_served', countLabel: pendingKitchenCount > 0 ? `${pendingKitchenCount}` : null },
    { id: 'payment', titleKey: 'restaurantPos.service.workflow.payment', highlighted: nextAction === 'charge', countLabel: order ? this.formatCurrency(order.total) : null },
    { id: 'closing', titleKey: 'restaurantPos.service.workflow.closing', highlighted: nextAction === 'cleaning' || nextAction === 'free_table', countLabel: null },
  ] as const;
});
```

- [ ] **Step 4: Run the focused specs to verify they pass**

Run: `pnpm test -- --watch=false src/app/features/restaurant-pos/pages/restaurant-pos-service-page/restaurant-pos-service-page.spec.ts`
Expected: PASS for the new dashboard signal assertions and no regression in existing page behavior.

Run: `pnpm test -- --watch=false src/app/features/restaurant-pos/components/service-table-panel/service-table-panel.spec.ts`
Expected: PASS for the new workflow signal assertions and no regression in existing panel behavior.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/features/restaurant-pos/pages/restaurant-pos-service-page/restaurant-pos-service-page.ts frontend/src/app/features/restaurant-pos/components/service-table-panel/service-table-panel.ts frontend/src/app/features/restaurant-pos/pages/restaurant-pos-service-page/restaurant-pos-service-page.spec.ts frontend/src/app/features/restaurant-pos/components/service-table-panel/service-table-panel.spec.ts
git commit -m "feat: add service dashboard workflow view models"
```

### Task 2: Rebuild The Service Page Into A Command-Center Layout

**Files:**
- Modify: `frontend/src/app/features/restaurant-pos/pages/restaurant-pos-service-page/restaurant-pos-service-page.html`
- Modify: `frontend/src/app/features/restaurant-pos/pages/restaurant-pos-service-page/restaurant-pos-service-page.ts`
- Test: `frontend/src/app/features/restaurant-pos/pages/restaurant-pos-service-page/restaurant-pos-service-page.spec.ts`

**Interfaces:**
- Consumes: `serviceDashboardStats()`, `store.kitchenQueue()`, `store.servicePoints()`, `selectedTableTitle()`, `lastSelectedServicePoint()`, `productPickerMode()`
- Produces: command-center header metrics, global service controls, dominant floor-plan canvas region, right-side panel slot styled as a workflow surface

- [ ] **Step 1: Write the failing UI test for the command-center shell**

```ts
it('renders the service page as a command center with compact metrics and a dominant floor canvas', async () => {
  await renderServicePage();

  expect(screen.getByText('Servicio de sala')).toBeTruthy();
  expect(screen.getByTestId('service-dashboard-stats')).toBeTruthy();
  expect(screen.getByTestId('service-floor-canvas')).toBeTruthy();
  expect(screen.getByTestId('service-workflow-panel-shell')).toBeTruthy();
});
```

- [ ] **Step 2: Run the focused page spec to verify it fails**

Run: `pnpm test -- --watch=false src/app/features/restaurant-pos/pages/restaurant-pos-service-page/restaurant-pos-service-page.spec.ts`
Expected: FAIL because the new test ids and command-center structure do not exist yet.

- [ ] **Step 3: Replace the page layout with a dashboard header and canvas-first body**

```html
<main class="service-page min-h-dvh">
  <header class="service-page__header sticky top-0 z-30 border-b backdrop-blur">
    <div class="service-page__header-inner">
      <div class="service-page__title-block">
        <p class="service-page__eyebrow">{{ 'restaurantPos.service.eyebrow' | transloco }}</p>
        <h1 class="service-page__title">{{ 'restaurantPos.service.title' | transloco }}</h1>
      </div>

      <div data-testid="service-dashboard-stats" class="service-page__stats">
        @for (stat of serviceDashboardStats(); track stat.id) {
          <article class="service-page__stat" [attr.data-tone]="stat.tone">
            <span class="service-page__stat-label">{{ ('restaurantPos.service.dashboard.' + stat.id) | transloco }}</span>
            <strong class="service-page__stat-value">{{ stat.value }}</strong>
          </article>
        }
      </div>

      <div class="service-page__actions">
        <app-button variant="neutral" fill="outline" size="sm" (pressed)="openServicePointSearch()">
          <span class="inline-flex items-center gap-1.5"><app-icon name="manage_search" size="sm" />{{ 'restaurantPos.service.searchServicePoint' | transloco }}</span>
        </app-button>
        <a class="service-page__kitchen-link" routerLink="/restaurant-pos/kitchen">
          <app-icon name="restaurant" size="sm" />
          {{ 'restaurantPos.common.kitchen' | transloco }}
        </a>
      </div>
    </div>
  </header>

  <section class="service-page__body">
    <div data-testid="service-floor-canvas" class="service-page__floor-stage">
      <app-floor-plan [layoutMode]="false" [focusRequest]="floorFocusRequest()" (servicePointSelected)="selectServicePointFromFloor($event)" />
    </div>

    <div data-testid="service-workflow-panel-shell" class="service-page__workflow-shell">
      <app-service-table-panel
        [serviceInfo]="store.selectedServiceInfo()"
        [title]="selectedTableTitle()"
        [errorMessage]="store.errorMessage()"
        (occupy)="occupySelectedTable()"
        (openProductSearch)="openProductSearch()"
        (sendToKitchen)="sendToKitchen()"
        (markServed)="markServed()"
        (increaseProduct)="increaseProductQuantity($event)"
        (decreaseProduct)="decreaseProductQuantity($event)"
        (markProductReady)="markProductReady($event)"
        (markProductServed)="markProductServed($event)"
        (removeProduct)="removeProduct($event)"
        (updateProductNote)="updateProductNote($event)"
        (setPaymentMethod)="setPaymentMethod($event)"
        (charge)="chargeTable()"
        (markCleaning)="markCleaning()"
        (freeTable)="freeTable()"
      />
    </div>
  </section>
</main>
```

- [ ] **Step 4: Run the focused page spec to verify it passes**

Run: `pnpm test -- --watch=false src/app/features/restaurant-pos/pages/restaurant-pos-service-page/restaurant-pos-service-page.spec.ts`
Expected: PASS for the command-center shell and existing interaction flows after selector updates.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/features/restaurant-pos/pages/restaurant-pos-service-page/restaurant-pos-service-page.html frontend/src/app/features/restaurant-pos/pages/restaurant-pos-service-page/restaurant-pos-service-page.ts frontend/src/app/features/restaurant-pos/pages/restaurant-pos-service-page/restaurant-pos-service-page.spec.ts
git commit -m "feat: rebuild service page as command center"
```

### Task 3: Reorganize The Table Panel By Workflow Phase

**Files:**
- Modify: `frontend/src/app/features/restaurant-pos/components/service-table-panel/service-table-panel.html`
- Modify: `frontend/src/app/features/restaurant-pos/components/service-table-panel/service-table-panel.ts`
- Test: `frontend/src/app/features/restaurant-pos/components/service-table-panel/service-table-panel.spec.ts`

**Interfaces:**
- Consumes: `selectedServiceWorkflowSections()`, `servicePhaseLabel()`, `nextActionLabel()`, `groupedOrderCourses()`, `canSendToKitchen()`, `canMarkServed()`, `canCharge()`, `canMarkCleaning()`, `canFreeTable()`
- Produces: unified hero summary, explicit `Resumen`, `Pedido`, `Cocina`, `Cobro`, and `Cierre` sections, visually dominant next-step action, reduced nested-card density

- [ ] **Step 1: Write the failing UI tests for workflow sections**

```ts
it('renders the selected table panel as workflow-first sections', async () => {
  await renderServiceTablePanel();

  expect(screen.getByRole('heading', { name: 'Resumen' })).toBeTruthy();
  expect(screen.getByRole('heading', { name: 'Pedido' })).toBeTruthy();
  expect(screen.getByRole('heading', { name: 'Cocina' })).toBeTruthy();
  expect(screen.getByRole('heading', { name: 'Cobro' })).toBeTruthy();
  expect(screen.getByRole('heading', { name: 'Cierre' })).toBeTruthy();
});

it('emphasizes the next action inside the matching workflow section', async () => {
  await renderServiceTablePanel({ nextAction: { type: 'charge' } });

  expect(screen.getByTestId('service-panel-next-action')).toHaveTextContent('Siguiente: cobrar');
  expect(screen.getByTestId('service-panel-payment-section')).toHaveAttribute('data-highlighted', 'true');
});
```

- [ ] **Step 2: Run the panel spec to verify it fails**

Run: `pnpm test -- --watch=false src/app/features/restaurant-pos/components/service-table-panel/service-table-panel.spec.ts`
Expected: FAIL because the workflow section headings and test ids do not exist yet.

- [ ] **Step 3: Replace the panel markup with phased sections**

```html
<aside class="service-panel" [attr.aria-label]="'restaurantPos.service.tablePanel' | transloco">
  @if (table(); as currentTable) {
    <header class="service-panel__hero">
      <div>
        <p class="service-panel__eyebrow">{{ 'restaurantPos.service.selectedTable' | transloco }}</p>
        <h2 class="service-panel__title">{{ title() }}</h2>
      </div>
      <span class="service-panel__status" [ngClass]="serviceAttentionClass(currentTable)">
        <app-icon [name]="tableStatusIcon(currentTable.status)" size="sm" />
        {{ tableStatusLabel(currentTable.status) }}
      </span>
    </header>

    <section class="service-panel__section">
      <h3>{{ 'restaurantPos.service.workflow.summary' | transloco }}</h3>
      <div class="service-panel__metrics">
        <article>{{ formatClock(currentTable.serviceStartedAt) }}</article>
        <article>{{ serviceDuration(currentTable) }}</article>
        <article>{{ 'restaurantPos.common.pax' | transloco: { count: currentTable.capacity } }}</article>
        <article>{{ formatCurrency(currentTable.total) }}</article>
      </div>
      <p data-testid="service-panel-next-action" class="service-panel__next-action">{{ nextActionLabel() }}</p>
    </section>

    <section class="service-panel__section" data-testid="service-panel-order-section">
      <div class="service-panel__section-header">
        <h3>{{ 'restaurantPos.service.workflow.order' | transloco }}</h3>
        <app-button variant="primary" fill="outline" size="sm" (pressed)="openProductSearch.emit()">
          {{ 'restaurantPos.service.searchProduct' | transloco }}
        </app-button>
      </div>
      <!-- existing order line rendering, simplified into flatter rows -->
    </section>

    <section class="service-panel__section" data-testid="service-panel-kitchen-section" [attr.data-highlighted]="canSendToKitchen() || canMarkServed()">
      <h3>{{ 'restaurantPos.service.workflow.kitchen' | transloco }}</h3>
      <p>{{ pendingKitchenCountLabel() }}</p>
      <div class="service-panel__actions-row">
        <app-button variant="primary" size="sm" [disabled]="!canSendToKitchen()" (pressed)="sendToKitchen.emit()">
          {{ 'restaurantPos.service.sendKitchen' | transloco }}
        </app-button>
        <app-button variant="secondary" size="sm" [disabled]="!canMarkServed()" (pressed)="markServed.emit()">
          {{ 'restaurantPos.service.markServed' | transloco }}
        </app-button>
      </div>
    </section>

    <section class="service-panel__section" data-testid="service-panel-payment-section" [attr.data-highlighted]="canCharge()">
      <h3>{{ 'restaurantPos.service.workflow.payment' | transloco }}</h3>
      <p class="service-panel__total">{{ formatCurrency(order()?.total ?? 0) }}</p>
      <div class="service-panel__payment-toggle">
        <!-- existing cash/card controls -->
      </div>
      <app-button variant="primary" [size]="chargePriority() ? 'lg' : 'md'" [disabled]="!canCharge()" (pressed)="charge.emit()">
        {{ 'restaurantPos.service.charge' | transloco }}
      </app-button>
    </section>

    <section class="service-panel__section" data-testid="service-panel-closing-section">
      <h3>{{ 'restaurantPos.service.workflow.closing' | transloco }}</h3>
      <div class="service-panel__actions-row">
        <app-button variant="neutral" fill="outline" size="sm" [disabled]="!canMarkCleaning()" (pressed)="markCleaning.emit()">
          {{ 'restaurantPos.service.cleaning' | transloco }}
        </app-button>
        <app-button variant="danger" fill="outline" size="sm" [disabled]="!canFreeTable()" (pressed)="requestFreeTable()">
          {{ 'restaurantPos.service.freeTable' | transloco }}
        </app-button>
      </div>
    </section>
  }
</aside>
```

- [ ] **Step 4: Run the panel spec to verify it passes**

Run: `pnpm test -- --watch=false src/app/features/restaurant-pos/components/service-table-panel/service-table-panel.spec.ts`
Expected: PASS for workflow sections, highlighted next-step behavior, and existing line-action coverage after updates.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/features/restaurant-pos/components/service-table-panel/service-table-panel.html frontend/src/app/features/restaurant-pos/components/service-table-panel/service-table-panel.ts frontend/src/app/features/restaurant-pos/components/service-table-panel/service-table-panel.spec.ts
git commit -m "feat: reorganize service table panel by workflow"
```

### Task 4: Convert The Product Picker Into A Drawer-Style Overlay

**Files:**
- Modify: `frontend/src/app/features/restaurant-pos/components/product-search-dialog/product-search-dialog.html`
- Modify: `frontend/src/app/features/restaurant-pos/components/product-search-dialog/product-search-dialog.ts`
- Modify: `frontend/src/app/features/restaurant-pos/components/product-search-dialog/product-search-dialog.spec.ts`
- Modify: `frontend/src/app/features/restaurant-pos/pages/restaurant-pos-service-page/restaurant-pos-service-page.html`

**Interfaces:**
- Consumes: `productPickerMode()`, `sectionOptions()`, `productPickerGroups()`, `productPickerSummary()`, `favoriteProductIds()`, `lastAddedProductId()`
- Produces: drawer-like product overlay shell, stronger search-first hierarchy, compact quick sections, preserved customizer and quantity control behavior

- [ ] **Step 1: Write the failing UI tests for the drawer-style product picker**

```ts
it('renders the product picker as a drawer-style overlay with search-first hierarchy', async () => {
  await renderProductSearchDialog({ open: true });

  const dialog = screen.getByRole('dialog', { name: 'Anadir productos' });
  expect(dialog).toHaveAttribute('data-layout', 'drawer');
  expect(screen.getByTestId('product-picker-header')).toBeTruthy();
  expect(screen.getByTestId('product-picker-quick-sections')).toBeTruthy();
});

it('keeps quick add actions visible while browsing products', async () => {
  await renderProductSearchDialog({ open: true });

  expect(screen.getByRole('button', { name: /Anadir/i })).toBeTruthy();
  expect(screen.getByText(/Mas vendidos|Favoritos/)).toBeTruthy();
});
```

- [ ] **Step 2: Run the picker spec to verify it fails**

Run: `pnpm test -- --watch=false src/app/features/restaurant-pos/components/product-search-dialog/product-search-dialog.spec.ts`
Expected: FAIL because the drawer layout markers and new structure do not exist yet.

- [ ] **Step 3: Rework the dialog markup into a drawer shell**

```html
<app-dialog
  [open]="open()"
  [title]="text('restaurantPos.service.addProductsTitle')"
  [description]="text('restaurantPos.service.addProductsDescription')"
  [closeAriaLabel]="text('restaurantPos.service.closeProductSearch')"
  showActions
  [showCancel]="false"
  [confirmLabel]="text('restaurantPos.service.finishProductSearch')"
  [footerSummary]="productPickerSummary()"
  size="lg"
  panelClass="product-picker product-picker--drawer"
  [attr.data-layout]="'drawer'"
  (closed)="closed.emit()"
  (confirmed)="finished.emit()"
>
  <div class="product-picker__layout">
    <header data-testid="product-picker-header" class="product-picker__header">
      <app-search-input
        [label]="text('restaurantPos.service.searchProduct')"
        [placeholder]="text('restaurantPos.service.searchProductPlaceholder')"
        [value]="query()"
        [clearAriaLabel]="text('restaurantPos.service.clearProductSearch')"
        (valueChange)="queryChanged.emit($event)"
        (searched)="searched.emit($event)"
      />
    </header>

    <nav data-testid="product-picker-quick-sections" class="product-picker__sections">
      <!-- existing section chips -->
    </nav>

    <div class="product-picker__results">
      <!-- existing grouped product rendering -->
    </div>
  </div>
</app-dialog>
```

- [ ] **Step 4: Run the picker spec to verify it passes**

Run: `pnpm test -- --watch=false src/app/features/restaurant-pos/components/product-search-dialog/product-search-dialog.spec.ts`
Expected: PASS for the drawer-style shell, search-first structure, and existing add/configure interactions after selector updates.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/features/restaurant-pos/components/product-search-dialog/product-search-dialog.html frontend/src/app/features/restaurant-pos/components/product-search-dialog/product-search-dialog.ts frontend/src/app/features/restaurant-pos/components/product-search-dialog/product-search-dialog.spec.ts frontend/src/app/features/restaurant-pos/pages/restaurant-pos-service-page/restaurant-pos-service-page.html
git commit -m "feat: turn product picker into service drawer"
```

### Task 5: Add Visual Polish, Translation Keys, And Final Regression Coverage

**Files:**
- Modify: `frontend/src/app/features/restaurant-pos/pages/restaurant-pos-service-page/restaurant-pos-service-page.html`
- Modify: `frontend/src/app/features/restaurant-pos/components/service-table-panel/service-table-panel.html`
- Modify: `frontend/src/app/features/restaurant-pos/components/product-search-dialog/product-search-dialog.html`
- Modify: `frontend/public/i18n/es.json`
- Modify: `frontend/public/i18n/ca.json`
- Modify: `frontend/src/app/shared/i18n/i18n-testing.ts`
- Test: `frontend/src/app/features/restaurant-pos/pages/restaurant-pos-service-page/restaurant-pos-service-page.spec.ts`
- Test: `frontend/src/app/features/restaurant-pos/components/service-table-panel/service-table-panel.spec.ts`
- Test: `frontend/src/app/features/restaurant-pos/components/product-search-dialog/product-search-dialog.spec.ts`

**Interfaces:**
- Consumes: new dashboard ids, workflow section titles, product drawer layout markers
- Produces: translation coverage for new copy, premium visual classes, stable responsive behavior, end-to-end regression confidence for service flows

- [ ] **Step 1: Write the failing tests for translations and premium UI markers**

```ts
it('provides translation fixtures for the new dashboard and workflow labels', () => {
  const i18n = provideI18nTesting();

  expect(i18n.translations.es.restaurantPos.service.workflow.summary).toBeTruthy();
  expect(i18n.translations.es.restaurantPos.service.workflow.payment).toBeTruthy();
  expect(i18n.translations.es.restaurantPos.service.dashboard.occupied).toBeTruthy();
});

it('keeps table selection, kitchen handoff, payment, and free-table flows intact after the redesign', async () => {
  await renderServicePage();

  fireEvent.click(screen.getByText('Mesa 1'));
  fireEvent.click(screen.getByRole('button', { name: 'Cocina' }));
  fireEvent.click(screen.getByRole('button', { name: 'Cobrar' }));

  expect(screen.getByTestId('service-workflow-panel-shell')).toBeTruthy();
});
```

- [ ] **Step 2: Run the focused specs to verify they fail**

Run: `pnpm test -- --watch=false src/app/features/restaurant-pos/pages/restaurant-pos-service-page/restaurant-pos-service-page.spec.ts`
Expected: FAIL because the new translations and regression assertions are incomplete.

Run: `pnpm test -- --watch=false src/app/features/restaurant-pos/components/service-table-panel/service-table-panel.spec.ts`
Expected: FAIL if the new translation keys are still missing from test fixtures.

- [ ] **Step 3: Add the missing translation keys and final visual labels**

```ts
restaurantPos: {
  service: {
    dashboard: {
      occupied: 'Activas',
      kitchen: 'En cocina',
      charge: 'Para cobrar',
      sales: 'Ventas',
    },
    workflow: {
      summary: 'Resumen',
      order: 'Pedido',
      kitchen: 'Cocina',
      payment: 'Cobro',
      closing: 'Cierre',
    },
  },
}
```

- [ ] **Step 4: Run focused verification**

Run: `pnpm test -- --watch=false src/app/features/restaurant-pos/pages/restaurant-pos-service-page/restaurant-pos-service-page.spec.ts`
Expected: PASS for shell, workflow, and end-to-end interaction coverage.

Run: `pnpm test -- --watch=false src/app/features/restaurant-pos/components/service-table-panel/service-table-panel.spec.ts`
Expected: PASS for phased panel behavior and translation fixtures.

Run: `pnpm test -- --watch=false src/app/features/restaurant-pos/components/product-search-dialog/product-search-dialog.spec.ts`
Expected: PASS for drawer-style product picker behavior and add/configure regressions.

Run: `pnpm build`
Expected: PASS with no Angular template errors, translation lookup failures, or type regressions.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/features/restaurant-pos/pages/restaurant-pos-service-page/restaurant-pos-service-page.html frontend/src/app/features/restaurant-pos/components/service-table-panel/service-table-panel.html frontend/src/app/features/restaurant-pos/components/product-search-dialog/product-search-dialog.html frontend/public/i18n/es.json frontend/public/i18n/ca.json frontend/src/app/shared/i18n/i18n-testing.ts frontend/src/app/features/restaurant-pos/pages/restaurant-pos-service-page/restaurant-pos-service-page.spec.ts frontend/src/app/features/restaurant-pos/components/service-table-panel/service-table-panel.spec.ts frontend/src/app/features/restaurant-pos/components/product-search-dialog/product-search-dialog.spec.ts
git commit -m "feat: polish service command center redesign"
```

## Self-Review

- Spec coverage:
  - Command-center shell and compact dashboard metrics are covered by Tasks 1 and 2.
  - Workflow-first panel restructuring is covered by Tasks 1 and 3.
  - Drawer-based product selection is covered by Task 4.
  - Premium visual polish, translation coverage, and regression verification are covered by Task 5.
- Placeholder scan:
  - No `TODO`, `TBD`, or vague cross-references remain.
  - Every task includes exact files, commands, expected outcomes, and concrete code snippets.
- Type consistency:
  - `serviceDashboardStats`, `selectedServiceWorkflowSections`, and `productPickerMode` are defined in Task 1 and reused consistently in later tasks.
  - Workflow ids stay aligned across page, panel, and tests as `summary`, `order`, `kitchen`, `payment`, and `closing`.
