# Reservations Drawer And Occupancy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the reservation creation dialog with a guided drawer and strengthen occupancy signals on the reservations page without changing routing or backend contracts.

**Architecture:** Keep the existing `RestaurantPosReservationsPage` as the orchestration unit, add focused computed view-model signals for drawer progress, slot recommendations, table suggestions, and occupancy summaries, then update the page template and CSS around those derived states. Reuse the current API calls, creation form state, and action handlers so the work stays inside the existing page boundary unless the shared overlay layer must expose a reusable drawer variant.

**Tech Stack:** Angular standalone components, signals, Transloco, Tailwind utility classes, component-scoped CSS, Vitest, Testing Library

## Global Constraints

- The work is concentrated in `frontend/src/app/features/restaurant-pos/pages/restaurant-pos-reservations-page/`.
- The priority is to replace the current creation dialog with a guided drawer in desktop.
- The main reservations view stays in place, but must gain stronger occupancy signals.
- This phase does not rewrite the full flow and does not change routing.
- The existing creation flow must still allow creating a reservation without an assigned table if the current logic allows it.
- Reuse the current API contracts, customer search flow, service windows, slot generation, and table capacity logic.
- Keep changes scoped to the requested feature and preserve existing frontend patterns.

---

### Task 1: Add Guided Drawer View-Model Signals

**Files:**
- Modify: `frontend/src/app/features/restaurant-pos/pages/restaurant-pos-reservations-page/restaurant-pos-reservations-page.ts`
- Test: `frontend/src/app/features/restaurant-pos/pages/restaurant-pos-reservations-page/restaurant-pos-reservations-page.spec.ts`

**Interfaces:**
- Consumes: `creationForm(): ReservationCreateForm`, `activeSlots(): string[]`, `availableTables(): Array<{ id: string; label: string; capacity: number }>`, `selectedTablesCapacity(): number | null`, `serviceGroups()`
- Produces: `recommendedSlots(): string[]`, `secondarySlots(): string[]`, `suggestedTables(): Array<{ id: string; label: string; capacity: number; fit: 'ideal' | 'tight' | 'oversized'; selected: boolean }>`, `manualTables(): Array<{ id: string; label: string; capacity: number; selected: boolean }>`, `creationProgressState(): { hasCustomer: boolean; hasPartySize: boolean; hasTime: boolean; hasSuggestedTable: boolean; ctaLabelKey: string }`, `serviceLoadSummary(): Array<{ serviceKey: string; reservationCount: number; unassignedCount: number; overdueCount: number; upcomingCount: number; intensity: 'quiet' | 'balanced' | 'busy' }>`

- [ ] **Step 1: Write the failing tests for the new derived states**

```ts
it('shows recommended slots and suggested tables in the creation flow', async () => {
  const i18n = provideI18nTesting();
  const apiMock = createApiMock();
  const { fixture } = await render(RestaurantPosReservationsPage, {
    imports: [...i18n.imports],
    providers: [...i18n.providers, { provide: RestaurantPosApiService, useValue: apiMock }],
  });

  const component = fixture.componentInstance as unknown as {
    openCreateReservation(): void;
    updateCreateField(field: 'customerNameSnapshot' | 'partySize', value: string | number): void;
    recommendedSlots(): string[];
    suggestedTables(): Array<{ id: string; fit: string }>;
  };

  component.openCreateReservation();
  component.updateCreateField('customerNameSnapshot', 'Marina Soler');
  component.updateCreateField('partySize', 4);
  fixture.detectChanges();

  expect(component.recommendedSlots().length).toBeGreaterThan(0);
  expect(component.suggestedTables()[0]).toEqual(expect.objectContaining({ id: 'table-2' }));
});

it('derives a guided CTA state before submission', async () => {
  const i18n = provideI18nTesting();
  const apiMock = createApiMock();
  const { fixture } = await render(RestaurantPosReservationsPage, {
    imports: [...i18n.imports],
    providers: [...i18n.providers, { provide: RestaurantPosApiService, useValue: apiMock }],
  });

  const component = fixture.componentInstance as unknown as {
    creationProgressState(): { ctaLabelKey: string };
  };

  expect(component.creationProgressState().ctaLabelKey).toBe('restaurantPos.reservations.create.cta.selectTime');
});
```

- [ ] **Step 2: Run the targeted spec to verify it fails**

Run: `pnpm test -- --watch=false --runInBand src/app/features/restaurant-pos/pages/restaurant-pos-reservations-page/restaurant-pos-reservations-page.spec.ts`
Expected: FAIL with missing `recommendedSlots`, `suggestedTables`, or `creationProgressState` properties.

- [ ] **Step 3: Add the minimal derived signals in the page class**

```ts
protected readonly recommendedSlots = computed(() => {
  const selected = this.creationForm().time;
  const slots = this.activeSlots();
  if (slots.length <= 4) return slots;
  const anchorIndex = Math.max(slots.indexOf(selected), 0);
  return Array.from(new Set([slots[anchorIndex - 1], slots[anchorIndex], slots[anchorIndex + 1], slots[anchorIndex + 2]].filter(Boolean))) as string[];
});

protected readonly secondarySlots = computed(() =>
  this.activeSlots().filter((slot) => !this.recommendedSlots().includes(slot)),
);

protected readonly suggestedTables = computed(() => {
  const partySize = this.creationForm().partySize;
  const selectedIds = this.creationForm().tableIds;
  return this.availableTables()
    .map((table) => ({
      ...table,
      selected: selectedIds.includes(table.id),
      fit: table.capacity === partySize ? 'ideal' : table.capacity < partySize ? 'tight' : 'oversized' as const,
    }))
    .sort((left, right) => Math.abs(left.capacity - partySize) - Math.abs(right.capacity - partySize))
    .slice(0, 4);
});

protected readonly manualTables = computed(() =>
  this.availableTables().map((table) => ({
    ...table,
    selected: this.creationForm().tableIds.includes(table.id),
  })),
);

protected readonly creationProgressState = computed(() => {
  const form = this.creationForm();
  const hasCustomer = form.customerNameSnapshot.trim().length > 0;
  const hasPartySize = form.partySize > 0;
  const hasTime = form.time.trim().length > 0;
  const hasSuggestedTable = form.tableIds.length > 0;

  let ctaLabelKey = 'restaurantPos.reservations.create.submit';
  if (!hasTime) ctaLabelKey = 'restaurantPos.reservations.create.cta.selectTime';
  else if (!hasSuggestedTable) ctaLabelKey = 'restaurantPos.reservations.create.cta.optionalTable';

  return { hasCustomer, hasPartySize, hasTime, hasSuggestedTable, ctaLabelKey };
});

protected readonly serviceLoadSummary = computed(() =>
  this.serviceGroups().map((group) => {
    const reservationCount = group.reservations.length;
    const unassignedCount = group.reservations.filter((reservation) => reservation.isUnassigned).length;
    const overdueCount = group.reservations.filter((reservation) => reservation.isOverdue).length;
    const upcomingCount = group.reservations.filter((reservation) => reservation.isUpcoming).length;
    const intensity = reservationCount >= 6 ? 'busy' : reservationCount >= 3 ? 'balanced' : 'quiet';
    return { serviceKey: group.labelKey, reservationCount, unassignedCount, overdueCount, upcomingCount, intensity } as const;
  }),
);
```

- [ ] **Step 4: Run the targeted spec to verify it passes**

Run: `pnpm test -- --watch=false --runInBand src/app/features/restaurant-pos/pages/restaurant-pos-reservations-page/restaurant-pos-reservations-page.spec.ts`
Expected: PASS for the new view-model assertions and no regressions in existing reservations tests.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/features/restaurant-pos/pages/restaurant-pos-reservations-page/restaurant-pos-reservations-page.ts frontend/src/app/features/restaurant-pos/pages/restaurant-pos-reservations-page/restaurant-pos-reservations-page.spec.ts
git commit -m "feat: add reservations drawer view model"
```

### Task 2: Replace The Creation Dialog With A Guided Drawer Layout

**Files:**
- Modify: `frontend/src/app/features/restaurant-pos/pages/restaurant-pos-reservations-page/restaurant-pos-reservations-page.html`
- Modify: `frontend/src/app/features/restaurant-pos/pages/restaurant-pos-reservations-page/restaurant-pos-reservations-page.css`
- Modify: `frontend/src/app/features/restaurant-pos/pages/restaurant-pos-reservations-page/restaurant-pos-reservations-page.ts`
- Test: `frontend/src/app/features/restaurant-pos/pages/restaurant-pos-reservations-page/restaurant-pos-reservations-page.spec.ts`

**Interfaces:**
- Consumes: `recommendedSlots()`, `secondarySlots()`, `suggestedTables()`, `manualTables()`, `creationProgressState()`, `selectedCustomer()`, `customerSearchResults()`, `selectedDateLabel()`
- Produces: desktop drawer open state driven by `creationOpen()`, sticky summary footer markup, guided block structure for customer/details/time/table/notes, CTA label rendered from `creationProgressState().ctaLabelKey`

- [ ] **Step 1: Write the failing UI tests for the drawer behavior**

```ts
it('opens the reservation creation flow inside a drawer instead of a centered dialog', async () => {
  const i18n = provideI18nTesting();
  const apiMock = createApiMock();

  await render(RestaurantPosReservationsPage, {
    imports: [...i18n.imports],
    providers: [...i18n.providers, { provide: RestaurantPosApiService, useValue: apiMock }],
  });

  fireEvent.click(screen.getByRole('button', { name: 'Nueva reserva' }));

  const drawer = screen.getByRole('dialog', { name: 'Nueva reserva' });
  expect(drawer).toHaveAttribute('data-variant', 'drawer');
  expect(within(drawer).getByText('Cliente')).toBeTruthy();
  expect(within(drawer).getByText('Hora')).toBeTruthy();
  expect(within(drawer).getByText('Mesa')).toBeTruthy();
});

it('renders a sticky reservation summary and guided CTA label', async () => {
  const i18n = provideI18nTesting();
  const apiMock = createApiMock();

  await render(RestaurantPosReservationsPage, {
    imports: [...i18n.imports],
    providers: [...i18n.providers, { provide: RestaurantPosApiService, useValue: apiMock }],
  });

  fireEvent.click(screen.getByRole('button', { name: 'Nueva reserva' }));

  expect(screen.getByText('Resumen de la reserva')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Selecciona una mesa o continua sin asignar' })).toBeTruthy();
});
```

- [ ] **Step 2: Run the targeted spec to verify it fails**

Run: `pnpm test -- --watch=false --runInBand src/app/features/restaurant-pos/pages/restaurant-pos-reservations-page/restaurant-pos-reservations-page.spec.ts`
Expected: FAIL because the template still renders the old dialog structure and CTA labels.

- [ ] **Step 3: Replace the creation markup with the guided drawer blocks**

```html
<app-dialog
  [open]="creationOpen()"
  size="lg"
  [title]="'restaurantPos.reservations.create.title' | transloco"
  [footerSummary]="selectedDateLabel()"
  [showActions]="false"
  panelClass="reservations-page__drawer"
  [attr.data-variant]="'drawer'"
  (closed)="closeCreateReservation()"
>
  <div class="reservations-page__drawer-body">
    <section class="reservations-page__drawer-section">
      <div class="reservations-page__section-header">
        <p class="reservations-page__section-step">1</p>
        <div>
          <h2 class="theme-title text-base font-semibold">{{ 'restaurantPos.reservations.create.customer' | transloco }}</h2>
          <p class="theme-muted text-sm">{{ 'restaurantPos.reservations.create.customerHelp' | transloco }}</p>
        </div>
      </div>
      <!-- existing customer search flow -->
    </section>

    <section class="reservations-page__drawer-section">
      <div class="reservations-page__section-header">
        <p class="reservations-page__section-step">2</p>
        <div>
          <h2 class="theme-title text-base font-semibold">{{ 'restaurantPos.reservations.create.timeSlots' | transloco }}</h2>
          <p class="theme-muted text-sm">{{ 'restaurantPos.reservations.create.timeHelp' | transloco }}</p>
        </div>
      </div>

      <div class="reservations-page__slot-group">
        <p class="reservations-page__subheading">{{ 'restaurantPos.reservations.create.recommendedSlots' | transloco }}</p>
        <div class="reservations-page__time-slots">
          @for (slot of recommendedSlots(); track slot) {
            <button
              type="button"
              class="reservations-page__time-slot reservations-page__time-slot--recommended"
              [class.reservations-page__time-slot--selected]="creationForm().time === slot"
              (click)="updateCreateField('time', slot)"
            >{{ slot }}</button>
          }
        </div>
      </div>

      @if (secondarySlots().length > 0) {
        <div class="reservations-page__slot-group">
          <p class="reservations-page__subheading">{{ 'restaurantPos.reservations.create.otherSlots' | transloco }}</p>
          <div class="reservations-page__time-slots">
            @for (slot of secondarySlots(); track slot) {
              <button
                type="button"
                class="reservations-page__time-slot"
                [class.reservations-page__time-slot--selected]="creationForm().time === slot"
                (click)="updateCreateField('time', slot)"
              >{{ slot }}</button>
            }
          </div>
        </div>
      }
    </section>

    <footer class="reservations-page__drawer-footer">
      <div class="reservations-page__drawer-summary">
        <p class="theme-muted text-xs font-semibold uppercase tracking-[0.18em]">{{ 'restaurantPos.reservations.create.summaryTitle' | transloco }}</p>
        <p class="theme-title text-sm font-semibold">{{ selectedDateLabel() }} · {{ creationForm().time }} · {{ creationForm().partySize }}</p>
      </div>
      <div class="reservations-page__drawer-actions">
        <button type="button" class="reservations-page__secondary-button" (click)="closeCreateReservation()">
          {{ 'restaurantPos.reservations.create.cancel' | transloco }}
        </button>
        <button type="button" class="reservations-page__primary-button" (click)="submitReservation()">
          {{ creationProgressState().ctaLabelKey | transloco }}
        </button>
      </div>
    </footer>
  </div>
</app-dialog>
```

- [ ] **Step 4: Add the minimal drawer styling**

```css
.reservations-page__drawer {
  margin-left: auto;
  width: min(42rem, 100vw);
  height: 100dvh;
  border-radius: 1.5rem 0 0 1.5rem;
}

.reservations-page__drawer-body {
  display: grid;
  grid-template-rows: 1fr auto;
  min-height: 100%;
}

.reservations-page__drawer-section {
  padding: 1.25rem 1.25rem 0;
  border-bottom: 1px solid color-mix(in srgb, var(--ui-border, #cbd5e1) 55%, transparent);
}

.reservations-page__drawer-footer {
  position: sticky;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem 1.25rem 1.25rem;
  background: color-mix(in srgb, var(--ui-surface, #ffffff) 94%, transparent);
  border-top: var(--reservations-border);
}

.reservations-page__section-header {
  display: flex;
  gap: 0.875rem;
  margin-bottom: 0.875rem;
}

.reservations-page__section-step {
  width: 2rem;
  height: 2rem;
  display: grid;
  place-items: center;
  border-radius: 999px;
  background: color-mix(in srgb, var(--ui-primary, #0891b2) 16%, transparent);
  color: var(--reservations-title);
  font-weight: 700;
}
```

- [ ] **Step 5: Run the targeted spec to verify it passes**

Run: `pnpm test -- --watch=false --runInBand src/app/features/restaurant-pos/pages/restaurant-pos-reservations-page/restaurant-pos-reservations-page.spec.ts`
Expected: PASS for drawer rendering, sticky summary, guided CTA text, and existing create flow assertions after selector updates.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/app/features/restaurant-pos/pages/restaurant-pos-reservations-page/restaurant-pos-reservations-page.html frontend/src/app/features/restaurant-pos/pages/restaurant-pos-reservations-page/restaurant-pos-reservations-page.css frontend/src/app/features/restaurant-pos/pages/restaurant-pos-reservations-page/restaurant-pos-reservations-page.ts frontend/src/app/features/restaurant-pos/pages/restaurant-pos-reservations-page/restaurant-pos-reservations-page.spec.ts
git commit -m "feat: convert reservations creation to guided drawer"
```

### Task 3: Add Table Suggestions, Context Warnings, And Occupancy Signals

**Files:**
- Modify: `frontend/src/app/features/restaurant-pos/pages/restaurant-pos-reservations-page/restaurant-pos-reservations-page.html`
- Modify: `frontend/src/app/features/restaurant-pos/pages/restaurant-pos-reservations-page/restaurant-pos-reservations-page.css`
- Modify: `frontend/src/app/features/restaurant-pos/pages/restaurant-pos-reservations-page/restaurant-pos-reservations-page.ts`
- Test: `frontend/src/app/features/restaurant-pos/pages/restaurant-pos-reservations-page/restaurant-pos-reservations-page.spec.ts`

**Interfaces:**
- Consumes: `suggestedTables()`, `manualTables()`, `selectedTablesCapacity()`, `capacityWarningDescription()`, `serviceLoadSummary()`, `summary()`
- Produces: suggested table cards, inline non-blocking capacity warning content, top-of-page service load strip, stronger occupancy markers in reservation cards and summaries

- [ ] **Step 1: Write the failing UI tests for suggestions and occupancy**

```ts
it('shows suggested tables with fit labels and contextual capacity guidance', async () => {
  const i18n = provideI18nTesting();
  const apiMock = createApiMock();

  await render(RestaurantPosReservationsPage, {
    imports: [...i18n.imports],
    providers: [...i18n.providers, { provide: RestaurantPosApiService, useValue: apiMock }],
  });

  fireEvent.click(screen.getByRole('button', { name: 'Nueva reserva' }));
  fireEvent.input(screen.getByLabelText('Comensales'), { target: { value: '4' } });

  expect(screen.getByText('Mesas sugeridas')).toBeTruthy();
  expect(screen.getByText('Encaje ideal')).toBeTruthy();
});

it('renders a service occupancy strip above the reservation lists', async () => {
  const i18n = provideI18nTesting();
  const apiMock = createApiMock();

  await render(RestaurantPosReservationsPage, {
    imports: [...i18n.imports],
    providers: [...i18n.providers, { provide: RestaurantPosApiService, useValue: apiMock }],
  });

  expect(screen.getByText('Carga por servicio')).toBeTruthy();
  expect(screen.getByText('Comidas')).toBeTruthy();
  expect(screen.getByText('Cenas')).toBeTruthy();
});
```

- [ ] **Step 2: Run the targeted spec to verify it fails**

Run: `pnpm test -- --watch=false --runInBand src/app/features/restaurant-pos/pages/restaurant-pos-reservations-page/restaurant-pos-reservations-page.spec.ts`
Expected: FAIL because table suggestion content and occupancy strip markup do not exist yet.

- [ ] **Step 3: Add the table suggestion block and inline warnings**

```html
<section class="reservations-page__drawer-section">
  <div class="reservations-page__section-header">
    <p class="reservations-page__section-step">3</p>
    <div>
      <h2 class="theme-title text-base font-semibold">{{ 'restaurantPos.reservations.create.tables' | transloco }}</h2>
      <p class="theme-muted text-sm">{{ 'restaurantPos.reservations.create.tableHelp' | transloco }}</p>
    </div>
  </div>

  <p class="reservations-page__subheading">{{ 'restaurantPos.reservations.create.suggestedTables' | transloco }}</p>
  <div class="reservations-page__suggested-tables">
    @for (table of suggestedTables(); track table.id) {
      <label class="reservations-page__table-card" [class.reservations-page__table-card--selected]="table.selected">
        <input
          type="checkbox"
          [checked]="table.selected"
          (change)="toggleCreateTable(table.id, $any($event.target).checked)"
        />
        <span class="theme-title text-sm font-semibold">{{ table.label }}</span>
        <span class="reservations-page__table-capacity">{{ table.capacity }}</span>
        <span class="reservations-page__fit-chip">{{ ('restaurantPos.reservations.create.fit.' + table.fit) | transloco }}</span>
      </label>
    }
  </div>

  @if (selectedTablesCapacity() !== null && creationForm().partySize > (selectedTablesCapacity() ?? 0)) {
    <p class="reservations-page__warning-copy">{{ capacityWarningDescription() }}</p>
  }
</section>
```

- [ ] **Step 4: Add the occupancy strip above the service lists**

```html
<div class="mx-auto w-full max-w-7xl px-4 pb-4 lg:px-6">
  <section class="theme-panel reservations-page__occupancy-strip rounded-2xl border p-4 shadow-sm" aria-label="Carga por servicio">
    <div class="mb-3 flex items-center justify-between gap-3">
      <div>
        <p class="theme-muted text-xs font-semibold uppercase tracking-[0.18em]">{{ 'restaurantPos.reservations.occupancyTitle' | transloco }}</p>
        <h2 class="theme-title text-lg font-semibold">{{ 'restaurantPos.reservations.occupancyHeading' | transloco }}</h2>
      </div>
      <span class="reservations-page__pax-chip">{{ summary().pax }} {{ 'restaurantPos.reservations.summaryPax' | transloco | lowercase }}</span>
    </div>
    <div class="reservations-page__occupancy-grid">
      @for (service of serviceLoadSummary(); track service.serviceKey) {
        <article class="reservations-page__occupancy-card" [class.reservations-page__occupancy-card--busy]="service.intensity === 'busy'">
          <p class="theme-title text-sm font-semibold">{{ service.serviceKey | transloco }}</p>
          <p class="theme-muted text-sm">{{ service.reservationCount }} {{ 'restaurantPos.reservations.summaryReservations' | transloco | lowercase }}</p>
          <div class="reservations-page__badges">
            @if (service.unassignedCount > 0) {
              <span class="reservations-page__badge">{{ service.unassignedCount }} {{ 'restaurantPos.reservations.summaryUnassigned' | transloco | lowercase }}</span>
            }
            @if (service.overdueCount > 0) {
              <span class="reservations-page__badge reservations-page__badge--warning">{{ service.overdueCount }} {{ 'restaurantPos.reservations.summaryOverdue' | transloco | lowercase }}</span>
            }
          </div>
        </article>
      }
    </div>
  </section>
</div>
```

- [ ] **Step 5: Run the targeted spec to verify it passes**

Run: `pnpm test -- --watch=false --runInBand src/app/features/restaurant-pos/pages/restaurant-pos-reservations-page/restaurant-pos-reservations-page.spec.ts`
Expected: PASS for suggestion labels, warning copy, and occupancy strip content without regressing list rendering.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/app/features/restaurant-pos/pages/restaurant-pos-reservations-page/restaurant-pos-reservations-page.html frontend/src/app/features/restaurant-pos/pages/restaurant-pos-reservations-page/restaurant-pos-reservations-page.css frontend/src/app/features/restaurant-pos/pages/restaurant-pos-reservations-page/restaurant-pos-reservations-page.ts frontend/src/app/features/restaurant-pos/pages/restaurant-pos-reservations-page/restaurant-pos-reservations-page.spec.ts
git commit -m "feat: add reservations occupancy guidance"
```

### Task 4: Finish Copy, Responsive Polish, And Regression Coverage

**Files:**
- Modify: `frontend/src/app/features/restaurant-pos/pages/restaurant-pos-reservations-page/restaurant-pos-reservations-page.html`
- Modify: `frontend/src/app/features/restaurant-pos/pages/restaurant-pos-reservations-page/restaurant-pos-reservations-page.css`
- Modify: `frontend/src/app/features/restaurant-pos/pages/restaurant-pos-reservations-page/restaurant-pos-reservations-page.spec.ts`
- Modify: `frontend/src/app/shared/i18n/i18n-testing.ts`

**Interfaces:**
- Consumes: new drawer CTA label keys, slot labels, fit labels, occupancy labels
- Produces: stable translation coverage for tests, mobile-safe drawer styles, regression coverage for create-without-table and action flows

- [ ] **Step 1: Write the failing regression tests for copy and non-assigned table flow**

```ts
it('keeps the create flow available without selecting a table', async () => {
  const i18n = provideI18nTesting();
  const apiMock = createApiMock();

  await render(RestaurantPosReservationsPage, {
    imports: [...i18n.imports],
    providers: [...i18n.providers, { provide: RestaurantPosApiService, useValue: apiMock }],
  });

  fireEvent.click(screen.getByRole('button', { name: 'Nueva reserva' }));
  fireEvent.input(screen.getByLabelText('Cliente'), { target: { value: 'Marina Soler' } });
  fireEvent.click(screen.getByRole('button', { name: '13:30' }));
  fireEvent.click(screen.getByRole('button', { name: 'Crear reserva' }));

  expect(apiMock.createRestaurantReservation).toHaveBeenCalledWith(
    'restaurant-mesaflow-centro',
    expect.objectContaining({ tableIds: [] }),
  );
});

it('provides translation entries for the drawer guidance labels', () => {
  const i18n = provideI18nTesting();
  expect(i18n.translations.es.restaurantPos.reservations.create.cta.selectTime).toBeTruthy();
  expect(i18n.translations.es.restaurantPos.reservations.create.suggestedTables).toBeTruthy();
  expect(i18n.translations.es.restaurantPos.reservations.occupancyHeading).toBeTruthy();
});
```

- [ ] **Step 2: Run the targeted spec to verify it fails**

Run: `pnpm test -- --watch=false --runInBand src/app/features/restaurant-pos/pages/restaurant-pos-reservations-page/restaurant-pos-reservations-page.spec.ts`
Expected: FAIL because the new translation keys and edge-flow assertions are not fully covered yet.

- [ ] **Step 3: Add missing translation fixtures and responsive polish**

```ts
restaurantPos: {
  reservations: {
    occupancyTitle: 'Carga por servicio',
    occupancyHeading: 'Vision operativa del dia',
    create: {
      summaryTitle: 'Resumen de la reserva',
      customerHelp: 'Busca un cliente existente o escribe un nombre nuevo.',
      timeHelp: 'Empieza por una hora recomendada para este servicio.',
      tableHelp: 'Selecciona una mesa sugerida o continua sin asignarla.',
      suggestedTables: 'Mesas sugeridas',
      recommendedSlots: 'Horas recomendadas',
      otherSlots: 'Mas horas disponibles',
      cta: {
        selectTime: 'Selecciona una hora',
        optionalTable: 'Selecciona una mesa o continua sin asignar',
      },
      fit: {
        ideal: 'Encaje ideal',
        tight: 'Capacidad justa',
        oversized: 'Mesa amplia',
      },
    },
  },
}
```

```css
@media (max-width: 767px) {
  .reservations-page__drawer {
    width: 100vw;
    border-radius: 0;
  }

  .reservations-page__drawer-footer {
    flex-direction: column;
    align-items: stretch;
  }

  .reservations-page__occupancy-grid,
  .reservations-page__suggested-tables {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 4: Run focused verification**

Run: `pnpm test -- --watch=false --runInBand src/app/features/restaurant-pos/pages/restaurant-pos-reservations-page/restaurant-pos-reservations-page.spec.ts`
Expected: PASS for the new copy coverage, create-without-table flow, and all existing reservation action scenarios.

Run: `pnpm build`
Expected: PASS with no template or translation typing errors in the frontend build.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/features/restaurant-pos/pages/restaurant-pos-reservations-page/restaurant-pos-reservations-page.html frontend/src/app/features/restaurant-pos/pages/restaurant-pos-reservations-page/restaurant-pos-reservations-page.css frontend/src/app/features/restaurant-pos/pages/restaurant-pos-reservations-page/restaurant-pos-reservations-page.spec.ts frontend/src/app/shared/i18n/i18n-testing.ts
git commit -m "feat: polish reservations drawer guidance"
```

## Self-Review

- Spec coverage:
  - Guided drawer replacement is covered by Task 2.
  - Customer/time/table guidance and sticky summary are covered by Tasks 1 and 2.
  - Table suggestions, capacity guidance, and create-without-table behavior are covered by Tasks 1, 3, and 4.
  - Occupancy strip and stronger main-page signals are covered by Task 3.
  - Responsive safety and copy additions are covered by Task 4.
- Placeholder scan:
  - No `TODO`, `TBD`, or cross-task shorthand remain.
  - Every task includes exact files, commands, expected outcomes, and code snippets.
- Type consistency:
  - `recommendedSlots`, `secondarySlots`, `suggestedTables`, `manualTables`, `creationProgressState`, and `serviceLoadSummary` are defined in Task 1 and reused consistently in later tasks.

