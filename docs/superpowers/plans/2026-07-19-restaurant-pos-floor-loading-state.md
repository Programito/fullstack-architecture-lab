# Restaurant POS Floor Loading State Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render an empty, stable floor viewport with an accessible spinner until backend table configuration is available in both the layout and service routes, with an error-and-retry state on failure.

**Architecture:** `RestaurantFloorStore` will own empty initial floor data plus a shared `loading | loaded | error` state. A new root `RestaurantFloorLoader` will make the existing service-floor request, map it once, ignore stale responses, and deduplicate requests for the same restaurant. Layout and service pages will trigger that loader and render route-specific floor controls only after it reaches `loaded`.

**Tech Stack:** Angular standalone components, Angular signals/effects, RxJS, Transloco, Tailwind CSS, Vitest, Testing Library, pnpm.

## Global Constraints

- The backend is the only source of truth; do not add `localStorage` or another floor cache.
- Do not implement multi-terminal synchronization or conflict detection.
- Runtime floor state must start empty; mock floor fixtures may remain for tests and Storybook only.
- Use the existing `GET /api/v1/restaurants/:id/service-floor` contract for the shared initial load because it contains both the floor configuration and operational table state required by service.
- Keep a minimum floor viewport height of `18rem` during loading and errors to avoid layout shift.
- Loading UI must expose `aria-busy="true"` and visible localized text.
- Editing and service-point interactions must not render before a successful load.
- Preserve unrelated backend, mobile, package-store, and local configuration changes already present in the worktree.

---

## File Map

- Modify `frontend/src/app/features/restaurant-pos/state/restaurant-floor.store.ts`: empty defaults and floor load-state transitions.
- Modify `frontend/src/app/features/restaurant-pos/state/restaurant-pos.store.ts`: delegate shared floor load signals and transitions.
- Create `frontend/src/app/features/restaurant-pos/state/restaurant-floor-loader.service.ts`: one idempotent API-loading coordinator.
- Create `frontend/src/app/features/restaurant-pos/state/restaurant-floor-loader.service.spec.ts`: request deduplication, retry, stale-response, and mapping tests.
- Modify `frontend/src/app/features/restaurant-pos/state/restaurant-pos.store.spec.ts`: isolate existing mock-dependent tests and verify the empty runtime state.
- Modify `frontend/src/app/features/restaurant-pos/pages/restaurant-pos-layout-page/restaurant-pos-layout-page.ts`: use the loader and expose retry.
- Modify `frontend/src/app/features/restaurant-pos/pages/restaurant-pos-layout-page/restaurant-pos-layout-page.html`: gate tools/floor and render loading/error states.
- Modify `frontend/src/app/features/restaurant-pos/pages/restaurant-pos-layout-page/restaurant-pos-layout-page.spec.ts`: pending, success, error, retry, and no-mock coverage.
- Modify `frontend/src/app/features/restaurant-pos/pages/restaurant-pos-service-page/restaurant-pos-service-page.ts`: replace its local boolean/request with the shared loader.
- Modify `frontend/src/app/features/restaurant-pos/pages/restaurant-pos-service-page/restaurant-pos-service-page.html`: render shared loading/error states.
- Modify `frontend/src/app/features/restaurant-pos/pages/restaurant-pos-service-page/restaurant-pos-service-page.spec.ts`: loading, error, retry, and success coverage.
- Modify `frontend/public/i18n/es.json`, `frontend/public/i18n/en.json`, `frontend/public/i18n/ca.json`, and `frontend/src/app/shared/i18n/i18n-testing.ts`: shared floor loading copy.

### Task 1: Empty floor state and explicit load transitions

**Files:**

- Modify: `frontend/src/app/features/restaurant-pos/state/restaurant-floor.store.ts`
- Modify: `frontend/src/app/features/restaurant-pos/state/restaurant-pos.store.ts`
- Modify: `frontend/src/app/features/restaurant-pos/state/restaurant-pos.store.spec.ts`

**Interfaces:**

- Produces: `export type RestaurantFloorLoadStatus = 'loading' | 'loaded' | 'error'`
- Produces: read-only signals `floorLoadStatus` and `floorLoadError`
- Produces: `beginFloorLoad(): void`, `completeEmptyFloorLoad(): void`, and `failFloorLoad(message: string): void`
- Preserves: `hydrateLayout(...)` and `hydrateServiceFloor(...)`; successful hydration changes status to `loaded`.

- [ ] **Step 1: Add a failing initial-state test**

In `restaurant-pos.store.spec.ts`, add a small describe block that creates a fresh store without hydrating test fixtures:

```ts
describe('runtime floor state', () => {
  it('starts empty and loading until the backend floor is hydrated', () => {
    const freshStore = TestBed.inject(RestaurantPosStore);

    expect(freshStore.activeFloorId()).toBeNull();
    expect(freshStore.floorElements()).toEqual([]);
    expect(freshStore.restaurantTables()).toEqual([]);
    expect(freshStore.floorLoadStatus()).toBe('loading');
    expect(freshStore.floorLoadError()).toBeNull();
  });
});
```

Keep existing mutation tests deterministic by adding a test-only helper and invoking it only in the existing mock-dependent describe setup:

```ts
function hydrateMockFloor(store: RestaurantPosStore): void {
  store.hydrateLayout({
    floorId: 'floor-main',
    floorName: 'Sala principal',
    rows: DEFAULT_GRID_ROWS,
    columns: DEFAULT_GRID_COLUMNS,
    floorElements: MOCK_FLOOR_ELEMENTS,
    restaurantTables: MOCK_RESTAURANT_TABLES,
  });
}
```

Import the four fixtures from `restaurant-pos.mock-data`. Do not restore mock defaults inside production code.

- [ ] **Step 2: Run the state test and verify it fails**

Run:

```bash
pnpm test -- --watch=false src/app/features/restaurant-pos/state/restaurant-pos.store.spec.ts
```

Expected: FAIL because the store still initializes with mock elements/tables and has no `floorLoadStatus` or `floorLoadError` signals.

- [ ] **Step 3: Implement the minimal load state in `RestaurantFloorStore`**

Replace mock-backed initial floor values with neutral values and add transitions:

```ts
export type RestaurantFloorLoadStatus = 'loading' | 'loaded' | 'error';

private readonly _gridRows = signal(1);
private readonly _gridColumns = signal(1);
private readonly _activeFloorId = signal<string | null>(null);
private readonly _activeFloorName = signal('');
private readonly _floorElements = signal<FloorElement[]>([]);
private readonly _restaurantTables = signal<RestaurantTable[]>([]);
private readonly _floorLoadStatus = signal<RestaurantFloorLoadStatus>('loading');
private readonly _floorLoadError = signal<string | null>(null);

readonly floorLoadStatus = this._floorLoadStatus.asReadonly();
readonly floorLoadError = this._floorLoadError.asReadonly();

beginFloorLoad(): void {
  this._activeFloorId.set(null);
  this._activeFloorName.set('');
  this._gridRows.set(1);
  this._gridColumns.set(1);
  this._floorElements.set([]);
  this._restaurantTables.set([]);
  this._floorLoadError.set(null);
  this._floorLoadStatus.set('loading');
}

failFloorLoad(message: string): void {
  this._floorLoadError.set(message);
  this._floorLoadStatus.set('error');
}

completeEmptyFloorLoad(): void {
  this._floorLoadError.set(null);
  this._floorLoadStatus.set('loaded');
}
```

Remove runtime imports of `MOCK_FLOOR_ELEMENTS` and `MOCK_RESTAURANT_TABLES`. Keep only grid constants if another production method genuinely needs them; otherwise remove the mock-data import entirely.

At the end of `hydrateLayout`, add:

```ts
this._floorLoadError.set(null);
this._floorLoadStatus.set('loaded');
```

Delegate the signals and methods through `RestaurantPosStore`:

```ts
readonly floorLoadStatus = this.floor.floorLoadStatus;
readonly floorLoadError = this.floor.floorLoadError;

beginFloorLoad(): void {
  this._selectedTableId.set(null);
  this.floor.beginFloorLoad();
}

failFloorLoad(message: string): void {
  this.floor.failFloorLoad(message);
}

completeEmptyFloorLoad(): void {
  this.floor.completeEmptyFloorLoad();
}
```

- [ ] **Step 4: Add transition assertions and run the focused test**

Add assertions proving `beginFloorLoad()` clears hydrated values and an earlier error, `failFloorLoad()` sets the error state, `completeEmptyFloorLoad()` produces `loaded` with a null floor and empty collections, and either hydration method returns the status to `loaded`.

Run:

```bash
pnpm test -- --watch=false src/app/features/restaurant-pos/state/restaurant-pos.store.spec.ts
```

Expected: PASS with existing store behavior preserved after explicit fixture hydration.

- [ ] **Step 5: Commit the state boundary**

```bash
git add frontend/src/app/features/restaurant-pos/state/restaurant-floor.store.ts frontend/src/app/features/restaurant-pos/state/restaurant-pos.store.ts frontend/src/app/features/restaurant-pos/state/restaurant-pos.store.spec.ts
git commit -m "feat: model restaurant floor loading state"
```

### Task 2: Shared idempotent floor loader

**Files:**

- Create: `frontend/src/app/features/restaurant-pos/state/restaurant-floor-loader.service.ts`
- Create: `frontend/src/app/features/restaurant-pos/state/restaurant-floor-loader.service.spec.ts`

**Interfaces:**

- Consumes: `RestaurantPosApiService.getRestaurantServiceFloor(restaurantId)`
- Consumes: `mapServiceFloor(ServiceFloorDto)`
- Consumes: `RestaurantPosStore.beginFloorLoad()`, `hydrateServiceFloor(...)`, `completeEmptyFloorLoad()`, and `failFloorLoad(message)`
- Produces: `load(restaurantId: string, options?: { force?: boolean }): void`
- Produces: `retry(restaurantId: string): void`

- [ ] **Step 1: Write failing loader tests**

Create the service spec with an API mock returning a `Subject<ServiceFloorDto>` and cover these exact cases:

```ts
it('loads and maps the active restaurant service floor', () => {
  loader.load('restaurant-1');
  expect(store.floorLoadStatus()).toBe('loading');

  response.next(serviceFloorFixture);
  response.complete();

  expect(store.floorLoadStatus()).toBe('loaded');
  expect(store.activeFloorId()).toBe('floor-main');
  expect(store.floorElements()[0]?.id).toBe('element-1');
});

it('deduplicates an in-flight and completed load for the same restaurant', () => {
  loader.load('restaurant-1');
  loader.load('restaurant-1');
  expect(api.getRestaurantServiceFloor).toHaveBeenCalledTimes(1);

  response.next(serviceFloorFixture);
  response.complete();
  loader.load('restaurant-1');

  expect(api.getRestaurantServiceFloor).toHaveBeenCalledTimes(1);
});

it('records an error and retries with a fresh request', () => {
  loader.load('restaurant-1');
  firstResponse.error(new Error('network'));
  expect(store.floorLoadStatus()).toBe('error');

  loader.retry('restaurant-1');
  expect(api.getRestaurantServiceFloor).toHaveBeenCalledTimes(2);
});
```

Also add a stale-response test: start restaurant A, then restaurant B; a late A response must not overwrite B.
Add a `404` test asserting that a restaurant with no configured floor finishes as `loaded`, keeps
`activeFloorId()` null, and leaves the element/table arrays empty.

- [ ] **Step 2: Run the new service spec and verify it fails**

Run:

```bash
pnpm test -- --watch=false src/app/features/restaurant-pos/state/restaurant-floor-loader.service.spec.ts
```

Expected: FAIL because `RestaurantFloorLoader` does not exist.

- [ ] **Step 3: Implement `RestaurantFloorLoader`**

Use one request generation counter so late responses are ignored:

```ts
import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map } from 'rxjs';
import { mapServiceFloor } from '../api/restaurant-pos-api.mappers';
import { RestaurantPosApiService } from '../api/restaurant-pos-api.service';
import { RestaurantPosStore } from './restaurant-pos.store';

const FLOOR_LOAD_ERROR = 'restaurantPos.floorLoading.loadError';

@Injectable({ providedIn: 'root' })
export class RestaurantFloorLoader {
  private readonly api = inject(RestaurantPosApiService);
  private readonly store = inject(RestaurantPosStore);
  private restaurantId: string | null = null;
  private requestGeneration = 0;

  load(restaurantId: string, options: { force?: boolean } = {}): void {
    const sameRestaurant = this.restaurantId === restaurantId;
    if (!options.force && sameRestaurant && this.store.floorLoadStatus() !== 'error') return;

    this.restaurantId = restaurantId;
    const generation = ++this.requestGeneration;
    this.store.beginFloorLoad();

    this.api.getRestaurantServiceFloor(restaurantId).pipe(map(mapServiceFloor)).subscribe({
      next: (floor) => {
        if (generation !== this.requestGeneration) return;
        this.store.hydrateServiceFloor(floor);
      },
      error: (error: unknown) => {
        if (generation !== this.requestGeneration) return;
        if (error instanceof HttpErrorResponse && error.status === 404) {
          this.store.completeEmptyFloorLoad();
          return;
        }
        this.store.failFloorLoad(FLOOR_LOAD_ERROR);
      },
    });
  }

  retry(restaurantId: string): void {
    this.load(restaurantId, { force: true });
  }
}
```

Name the error callback parameter `error`. The current service-floor success DTO always includes one
`floor`; the endpoint represents the absence of a configured floor with HTTP `404`. Treat that
response as a completed empty result. Other HTTP and mapping errors use `FLOOR_LOAD_ERROR`.

- [ ] **Step 4: Run the loader and state specs**

Run:

```bash
pnpm test -- --watch=false src/app/features/restaurant-pos/state/restaurant-floor-loader.service.spec.ts src/app/features/restaurant-pos/state/restaurant-pos.store.spec.ts
```

Expected: PASS, including request deduplication, empty result, retry, and stale-response protection.

- [ ] **Step 5: Commit the shared loader**

```bash
git add frontend/src/app/features/restaurant-pos/state/restaurant-floor-loader.service.ts frontend/src/app/features/restaurant-pos/state/restaurant-floor-loader.service.spec.ts
git commit -m "feat: add shared restaurant floor loader"
```

### Task 3: Layout loading, error, retry, and localized copy

**Files:**

- Modify: `frontend/src/app/features/restaurant-pos/pages/restaurant-pos-layout-page/restaurant-pos-layout-page.ts`
- Modify: `frontend/src/app/features/restaurant-pos/pages/restaurant-pos-layout-page/restaurant-pos-layout-page.html`
- Modify: `frontend/src/app/features/restaurant-pos/pages/restaurant-pos-layout-page/restaurant-pos-layout-page.spec.ts`
- Modify: `frontend/public/i18n/es.json`
- Modify: `frontend/public/i18n/en.json`
- Modify: `frontend/public/i18n/ca.json`
- Modify: `frontend/src/app/shared/i18n/i18n-testing.ts`

**Interfaces:**

- Consumes: `RestaurantFloorLoader.load(restaurantId)` and `retry(restaurantId)`
- Consumes: `store.floorLoadStatus()` and `store.floorLoadError()`
- Produces: `retryFloorLoad(): void` page action.

- [ ] **Step 1: Write failing layout route tests**

Extend `renderLayoutPage` so its default API mock includes `getRestaurantServiceFloor`, and use a `Subject<ServiceFloorDto>` in new tests:

```ts
it('shows an accessible spinner without mock tables while the floor is loading', async () => {
  const response = new Subject<ServiceFloorDto>();
  await renderLayoutPage('es', {
    apiOverrides: { getRestaurantServiceFloor: vi.fn(() => response) },
  });

  expect(screen.getByText('Cargando plano de mesas…')).toBeTruthy();
  expect(screen.getByTestId('floor-loading-state').getAttribute('aria-busy')).toBe('true');
  expect(screen.queryByLabelText('M1 elemento del plano')).toBeNull();
  expect(screen.queryByRole('button', { name: 'Añadir elemento' })).toBeNull();
});
```

Add success, failure, and retry tests. Failure must assert `role="alert"`, localized error copy, and `Reintentar`; retry must assert a second service-floor API call and then render the emitted floor.

- [ ] **Step 2: Run the layout spec and verify the new tests fail**

Run:

```bash
pnpm test -- --watch=false src/app/features/restaurant-pos/pages/restaurant-pos-layout-page/restaurant-pos-layout-page.spec.ts
```

Expected: FAIL because the page still calls `getRestaurantFloors` for its initial request and always renders its toolbar/floor.

- [ ] **Step 3: Add shared localized copy**

Under `restaurantPos`, add the same keys to the three JSON locales and the three locale branches in `i18n-testing.ts`:

```json
"floorLoading": {
  "loading": "Cargando plano de mesas…",
  "loadError": "No se pudo cargar el plano de mesas.",
  "empty": "Todavía no hay un plano de mesas configurado.",
  "retry": "Reintentar"
}
```

English values:

```json
"floorLoading": {
  "loading": "Loading table layout…",
  "loadError": "The table layout could not be loaded.",
  "empty": "No table layout has been configured yet.",
  "retry": "Retry"
}
```

Catalan values:

```json
"floorLoading": {
  "loading": "Carregant el plànol de taules…",
  "loadError": "No s'ha pogut carregar el plànol de taules.",
  "empty": "Encara no hi ha cap plànol de taules configurat.",
  "retry": "Torna-ho a provar"
}
```

- [ ] **Step 4: Replace the layout's initial API request with the loader**

Inject `RestaurantFloorLoader`, retain `RestaurantPosApiService` for layout mutations, and replace only the constructor's initial `getRestaurantFloors` subscription:

```ts
private readonly floorLoader = inject(RestaurantFloorLoader);

effect(() => {
  const restaurant = this.restaurantContext.activeRestaurant();
  if (restaurant) this.floorLoader.load(restaurant.id);
});

protected retryFloorLoad(): void {
  const restaurant = this.restaurantContext.activeRestaurant();
  if (restaurant) this.floorLoader.retry(restaurant.id);
}
```

Keep `applyFloorsResponse` for create/update/delete/reorder responses.

- [ ] **Step 5: Gate the layout toolbar and floor viewport**

Render the editing toolbar only when `store.floorLoadStatus() === 'loaded'`. Replace the unconditional `<app-floor-plan>` with:

```html
@if (store.floorLoadStatus() === 'loading') {
  <div
    data-testid="floor-loading-state"
    class="theme-soft-panel grid min-h-[18rem] place-items-center rounded-lg border"
    aria-busy="true"
    aria-live="polite"
  >
    <div class="grid justify-items-center gap-3">
      <span class="h-8 w-8 animate-spin rounded-full border-4 border-cyan-200 border-t-cyan-700" aria-hidden="true"></span>
      <p class="theme-muted text-sm">{{ 'restaurantPos.floorLoading.loading' | transloco }}</p>
    </div>
  </div>
} @else if (store.floorLoadStatus() === 'error') {
  <div class="theme-soft-panel grid min-h-[18rem] place-items-center rounded-lg border p-6 text-center" role="alert">
    <div class="grid justify-items-center gap-3">
      <p class="theme-muted text-sm">{{ store.floorLoadError()! | transloco }}</p>
      <app-button variant="neutral" fill="outline" (pressed)="retryFloorLoad()">
        {{ 'restaurantPos.floorLoading.retry' | transloco }}
      </app-button>
    </div>
  </div>
} @else if (!store.activeFloorId()) {
  <div class="theme-soft-panel grid min-h-[18rem] place-items-center rounded-lg border p-6 text-center">
    <p class="theme-muted text-sm">{{ 'restaurantPos.floorLoading.empty' | transloco }}</p>
  </div>
} @else {
  <app-floor-plan
    (editElement)="openEditElementModal($event)"
    (elementDeleted)="handleFloorElementDeleted($event)"
    (elementMoved)="handleFloorElementMoved($event)"
    (resizeElement)="openResizeElementModal($event)"
    (selectedElementChange)="handleSelectedLayoutElementChange($event)"
  />
}
```

Also hide the layout status strip until loaded so it does not announce `1 × 1` or zero elements during loading.

- [ ] **Step 6: Run the focused layout tests**

Run:

```bash
pnpm test -- --watch=false src/app/features/restaurant-pos/pages/restaurant-pos-layout-page/restaurant-pos-layout-page.spec.ts src/app/features/restaurant-pos/state/restaurant-floor-loader.service.spec.ts
```

Expected: PASS; pending requests show only the spinner, failure offers retry, and success renders backend floor data.

- [ ] **Step 7: Commit the layout integration**

```bash
git add frontend/src/app/features/restaurant-pos/pages/restaurant-pos-layout-page/restaurant-pos-layout-page.ts frontend/src/app/features/restaurant-pos/pages/restaurant-pos-layout-page/restaurant-pos-layout-page.html frontend/src/app/features/restaurant-pos/pages/restaurant-pos-layout-page/restaurant-pos-layout-page.spec.ts frontend/public/i18n/es.json frontend/public/i18n/en.json frontend/public/i18n/ca.json frontend/src/app/shared/i18n/i18n-testing.ts
git commit -m "feat: show floor loading state in layout"
```

### Task 4: Service route consumes the shared floor state

**Files:**

- Modify: `frontend/src/app/features/restaurant-pos/pages/restaurant-pos-service-page/restaurant-pos-service-page.ts`
- Modify: `frontend/src/app/features/restaurant-pos/pages/restaurant-pos-service-page/restaurant-pos-service-page.html`
- Modify: `frontend/src/app/features/restaurant-pos/pages/restaurant-pos-service-page/restaurant-pos-service-page.spec.ts`

**Interfaces:**

- Consumes: `RestaurantFloorLoader.load(restaurantId)` and `retry(restaurantId)`
- Consumes: `store.floorLoadStatus()` and `store.floorLoadError()`
- Removes: page-local `serviceFloorLoaded` signal and direct initial service-floor subscription.

- [ ] **Step 1: Write failing service route tests**

Use a pending `Subject<ServiceFloorDto>` in `restaurant-pos-service-page.spec.ts`:

```ts
it('shows the shared floor spinner and no service points while loading', async () => {
  const response = new Subject<ServiceFloorDto>();
  const api = createRestaurantPosApiMock();
  api.getRestaurantServiceFloor = vi.fn(() => response);

  await renderServicePage(api);

  expect(screen.getByText('Cargando plano de mesas…')).toBeTruthy();
  expect(screen.getByTestId('floor-loading-state').getAttribute('aria-busy')).toBe('true');
  expect(screen.queryByLabelText('M1 mesa, Libre')).toBeNull();
});
```

Add failure/retry coverage matching the layout semantics, plus a success assertion proving the floor appears after the subject emits and an empty-result assertion proving no floor component renders. Keep dashboard statistics at neutral zero values while status is not `loaded` or `activeFloorId()` is null.

- [ ] **Step 2: Run the service spec and verify it fails**

Run:

```bash
pnpm test -- --watch=false src/app/features/restaurant-pos/pages/restaurant-pos-service-page/restaurant-pos-service-page.spec.ts
```

Expected: FAIL because the page owns `serviceFloorLoaded`, uses descriptive placeholder text instead of a spinner, and has no retry action.

- [ ] **Step 3: Replace local loading ownership in the service page**

Remove `mapServiceFloor` from the page import, remove `serviceFloorLoaded`, inject `RestaurantFloorLoader`, and replace the direct request:

```ts
private readonly floorLoader = inject(RestaurantFloorLoader);

effect(() => {
  const restaurant = this.restaurantContext.activeRestaurant();
  if (restaurant) this.floorLoader.load(restaurant.id);
});

protected retryFloorLoad(): void {
  const restaurant = this.restaurantContext.activeRestaurant();
  if (restaurant) this.floorLoader.retry(restaurant.id);
}
```

Change the dashboard guard to:

```ts
if (this.store.floorLoadStatus() !== 'loaded' || !this.store.activeFloorId()) {
  return [
    { id: 'occupied', value: '0', tone: 'neutral' as const },
    { id: 'kitchen', value: '0', tone: 'neutral' as const },
    { id: 'charge', value: '0', tone: 'neutral' as const },
    { id: 'sales', value: this.formatCurrency(0), tone: 'accent' as const },
  ];
}
```

- [ ] **Step 4: Render the same loading/error contract in service**

Inside the existing `service-floor-canvas`, use the same `data-testid`, spinner, minimum height, `aria-busy`, error `role="alert"`, retry button, and empty-floor message from Task 3. Render `<app-floor-plan>` only for `loaded` with a non-null `activeFloorId()`.

Keep the floor heading and legend outside the conditional. Disable or hide search/return-to-last-service-point actions until loaded so they cannot expose or act on an empty floor.

- [ ] **Step 5: Run both route specs**

Run:

```bash
pnpm test -- --watch=false src/app/features/restaurant-pos/pages/restaurant-pos-layout-page/restaurant-pos-layout-page.spec.ts src/app/features/restaurant-pos/pages/restaurant-pos-service-page/restaurant-pos-service-page.spec.ts
```

Expected: PASS with identical loading/error/retry behavior and route-specific successful floor rendering.

- [ ] **Step 6: Commit the service integration**

```bash
git add frontend/src/app/features/restaurant-pos/pages/restaurant-pos-service-page/restaurant-pos-service-page.ts frontend/src/app/features/restaurant-pos/pages/restaurant-pos-service-page/restaurant-pos-service-page.html frontend/src/app/features/restaurant-pos/pages/restaurant-pos-service-page/restaurant-pos-service-page.spec.ts
git commit -m "feat: share floor loading state with service"
```

### Task 5: Frontend quality verification

**Files:**

- Verify all files changed in Tasks 1-4.
- Update only directly affected files if verification exposes a defect.

**Interfaces:**

- Consumes: all completed behavior from Tasks 1-4.
- Produces: evidence that focused tests, the frontend suite, and production build pass.

- [ ] **Step 1: Run all restaurant POS state and route tests affected by the change**

```bash
pnpm test -- --watch=false src/app/features/restaurant-pos/state/restaurant-pos.store.spec.ts src/app/features/restaurant-pos/state/restaurant-floor-loader.service.spec.ts src/app/features/restaurant-pos/pages/restaurant-pos-layout-page/restaurant-pos-layout-page.spec.ts src/app/features/restaurant-pos/pages/restaurant-pos-service-page/restaurant-pos-service-page.spec.ts
```

Expected: PASS with no unhandled RxJS errors or pending timers.

- [ ] **Step 2: Run the complete frontend test suite**

```bash
pnpm test -- --watch=false
```

Expected: PASS. If a test intentionally depended on runtime mock floor defaults, hydrate its fixture explicitly rather than restoring production mocks.

- [ ] **Step 3: Build the Angular frontend**

```bash
pnpm build
```

Expected: exit code `0` with no Angular template, TypeScript, or localization errors.

- [ ] **Step 4: Inspect the final diff**

```bash
git diff --check
git status --short
```

Expected: no whitespace errors; only intended frontend files and the plan/spec documents are part of this feature. Existing unrelated backend, mobile, `.pnpm-store`, probe, and local Gradle changes remain untouched.

- [ ] **Step 5: Commit verification-only fixes if required**

If verification required code changes, stage only those exact files and commit:

```bash
git commit -m "fix: stabilize restaurant floor loading state"
```

If no fixes were needed, do not create an empty commit.
