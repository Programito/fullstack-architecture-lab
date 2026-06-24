# Restaurant POS Layout API Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connect `frontend` route `/restaurant-pos/layout` to the MesaFlow backend using an automatic restaurant context plus real layout read and write endpoints.

**Architecture:** Add a dedicated frontend restaurants API service and a small restaurant context store that automatically selects the only available restaurant. Update the layout page and `RestaurantPosStore` to hydrate and mutate floor-plan state from backend responses while preserving the current UI interactions.

**Tech Stack:** Angular standalone APIs, signals, HttpClient, Testing Library Angular, Vitest, NestJS backend endpoints already available under `/api/v1/restaurants`.

---

## File Structure

**Create:**

- `frontend/src/app/features/restaurant-pos/api/restaurant-pos-api.models.ts`
- `frontend/src/app/features/restaurant-pos/api/restaurant-pos-api.service.ts`
- `frontend/src/app/features/restaurant-pos/api/restaurant-pos-api.service.spec.ts`
- `frontend/src/app/features/restaurant-pos/state/restaurant-context.store.ts`
- `frontend/src/app/features/restaurant-pos/state/restaurant-context.store.spec.ts`
- `docs/superpowers/plans/2026-06-21-restaurant-pos-layout-api-integration.md`

**Modify:**

- `frontend/src/app/features/restaurant-pos/pages/restaurant-pos-layout-page/restaurant-pos-layout-page.ts`
- `frontend/src/app/features/restaurant-pos/pages/restaurant-pos-layout-page/restaurant-pos-layout-page.spec.ts`
- `frontend/src/app/features/restaurant-pos/state/restaurant-pos.store.ts`
- `frontend/src/app/features/restaurant-pos/models/restaurant-pos.models.ts`
- `frontend/src/app/app.config.ts` only if explicit provider wiring is needed

**Reference:**

- `frontend/src/app/core/api/api.config.ts`
- `frontend/src/app/features/identity/api/identity-api.service.ts`
- `frontend/src/app/features/restaurant-pos/state/restaurant-pos.mock-data.ts`
- `backend/docs/mesaflow-api.md`

---

### Task 1: Add restaurant API models and service

**Files:**

- Create: `frontend/src/app/features/restaurant-pos/api/restaurant-pos-api.models.ts`
- Create: `frontend/src/app/features/restaurant-pos/api/restaurant-pos-api.service.ts`
- Create: `frontend/src/app/features/restaurant-pos/api/restaurant-pos-api.service.spec.ts`
- Reference: `frontend/src/app/core/api/api.config.ts`
- Reference: `frontend/src/app/features/identity/api/identity-api.service.ts`

- [ ] **Step 1: Write the failing service test for restaurant list and floors mapping**

```ts
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { RestaurantPosApiService } from './restaurant-pos-api.service';

describe('RestaurantPosApiService', () => {
  const setup = () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    return {
      service: TestBed.inject(RestaurantPosApiService),
      http: TestBed.inject(HttpTestingController),
    };
  };

  it('lists restaurants and maps the backend response', () => {
    const { service, http } = setup();
    let result: unknown;

    service.listRestaurants().subscribe((value) => {
      result = value;
    });

    const request = http.expectOne('/api/v1/restaurants');
    expect(request.request.method).toBe('GET');
    request.flush([
      {
        id: 'restaurant-mesaflow-centro',
        name: 'MesaFlow Centro',
        displayName: 'MesaFlow Centro',
        timezone: 'Europe/Madrid',
        currency: 'EUR',
        isActive: true,
      },
    ]);

    expect(result).toEqual([
      expect.objectContaining({
        id: 'restaurant-mesaflow-centro',
        name: 'MesaFlow Centro',
        currency: 'EUR',
      }),
    ]);
    http.verify();
  });

  it('loads floor data for one restaurant', () => {
    const { service, http } = setup();
    let result: unknown;

    service.getRestaurantFloors('restaurant-mesaflow-centro').subscribe((value) => {
      result = value;
    });

    const request = http.expectOne('/api/v1/restaurants/restaurant-mesaflow-centro/floors');
    expect(request.request.method).toBe('GET');
    request.flush({
      restaurantId: 'restaurant-mesaflow-centro',
      tables: [{ id: 'table-1', tableNumber: 1, name: 'Mesa 1', capacity: 2, isActive: true }],
      floors: [
        {
          id: 'floor-main',
          name: 'Sala principal',
          rows: 12,
          columns: 16,
          elements: [{ id: 'floor-element-1', type: 'table', label: 'M1', x: 1, y: 1, width: 2, height: 2, tableId: 'table-1', shape: 'square', sortOrder: 1 }],
        },
      ],
    });

    expect(result).toEqual(
      expect.objectContaining({
        restaurantId: 'restaurant-mesaflow-centro',
        floors: [expect.objectContaining({ id: 'floor-main', rows: 12, columns: 16 })],
      }),
    );
    http.verify();
  });
});
```

- [ ] **Step 2: Run the focused service test to verify it fails**

Run:

```bash
pnpm test -- --watch=false frontend/src/app/features/restaurant-pos/api/restaurant-pos-api.service.spec.ts
```

Expected: FAIL because `RestaurantPosApiService` and its models do not exist yet.

- [ ] **Step 3: Implement the API models**

```ts
export type RestaurantSummaryDto = {
  id: string;
  name: string;
  displayName: string | null;
  timezone: string;
  currency: string;
  isActive: boolean;
};

export type RestaurantSummary = {
  id: string;
  name: string;
  displayName: string | null;
  timezone: string;
  currency: string;
  isActive: boolean;
};

export type RestaurantFloorElementDto = {
  id: string;
  type: 'table' | 'bar' | 'kitchen' | 'bathroom' | 'entrance' | 'blocked' | 'stool';
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  tableId: string | null;
  shape: 'round' | 'square' | 'rectangle' | 'long' | null;
  sortOrder: number;
};

export type RestaurantFloorDto = {
  id: string;
  name: string;
  rows: number;
  columns: number;
  elements: RestaurantFloorElementDto[];
};

export type RestaurantTableDto = {
  id: string;
  tableNumber: number;
  name: string | null;
  capacity: number;
  isActive: boolean;
};

export type RestaurantFloorsDto = {
  restaurantId: string;
  tables: RestaurantTableDto[];
  floors: RestaurantFloorDto[];
};
```

- [ ] **Step 4: Implement the API service**

```ts
import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../../../core/api/api.config';
import type { RestaurantFloorsDto, RestaurantSummaryDto } from './restaurant-pos-api.models';

@Injectable({
  providedIn: 'root',
})
export class RestaurantPosApiService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);
  private readonly restaurantsUrl = `${this.apiBaseUrl}/restaurants`;

  listRestaurants(): Observable<RestaurantSummaryDto[]> {
    return this.http.get<RestaurantSummaryDto[]>(this.restaurantsUrl);
  }

  getRestaurantFloors(restaurantId: string): Observable<RestaurantFloorsDto> {
    return this.http.get<RestaurantFloorsDto>(`${this.restaurantsUrl}/${restaurantId}/floors`);
  }

  createFloorElement(restaurantId: string, floorId: string, body: object): Observable<RestaurantFloorsDto> {
    return this.http.post<RestaurantFloorsDto>(`${this.restaurantsUrl}/${restaurantId}/floors/${floorId}/elements`, body);
  }

  updateFloor(restaurantId: string, floorId: string, body: object): Observable<RestaurantFloorsDto> {
    return this.http.patch<RestaurantFloorsDto>(`${this.restaurantsUrl}/${restaurantId}/floors/${floorId}`, body);
  }

  reorderFloorElements(restaurantId: string, floorId: string, body: object): Observable<RestaurantFloorsDto> {
    return this.http.put<RestaurantFloorsDto>(`${this.restaurantsUrl}/${restaurantId}/floors/${floorId}/elements/reorder`, body);
  }
}
```

- [ ] **Step 5: Expand the service spec for `POST`, `PATCH`, and `PUT`**

```ts
it('posts a new floor element', () => {
  const { service, http } = setup();

  service.createFloorElement('restaurant-mesaflow-centro', 'floor-main', {
    type: 'blocked',
    label: 'Zona temporal',
    x: 10,
    y: 9,
    width: 2,
    height: 1,
    sortOrder: 8,
    tableId: null,
    shape: null,
  }).subscribe();

  const request = http.expectOne('/api/v1/restaurants/restaurant-mesaflow-centro/floors/floor-main/elements');
  expect(request.request.method).toBe('POST');
  request.flush({ restaurantId: 'restaurant-mesaflow-centro', tables: [], floors: [] });
  http.verify();
});
```

- [ ] **Step 6: Run the focused service test to verify it passes**

Run:

```bash
pnpm test -- --watch=false frontend/src/app/features/restaurant-pos/api/restaurant-pos-api.service.spec.ts
```

Expected: PASS with the new HTTP service and request mapping in place.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/app/features/restaurant-pos/api/restaurant-pos-api.models.ts frontend/src/app/features/restaurant-pos/api/restaurant-pos-api.service.ts frontend/src/app/features/restaurant-pos/api/restaurant-pos-api.service.spec.ts
git commit -m "feat: add restaurant pos api service"
```

### Task 2: Add automatic restaurant context resolution

**Files:**

- Create: `frontend/src/app/features/restaurant-pos/state/restaurant-context.store.ts`
- Create: `frontend/src/app/features/restaurant-pos/state/restaurant-context.store.spec.ts`
- Reference: `frontend/src/app/features/identity/identity-session.store.spec.ts`
- Reference: `frontend/src/app/features/restaurant-pos/api/restaurant-pos-api.service.ts`

- [ ] **Step 1: Write the failing context store test**

```ts
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { RestaurantPosApiService } from '../api/restaurant-pos-api.service';
import { RestaurantContextStore } from './restaurant-context.store';

describe('RestaurantContextStore', () => {
  it('selects the only available restaurant automatically', () => {
    TestBed.configureTestingModule({
      providers: [
        RestaurantContextStore,
        {
          provide: RestaurantPosApiService,
          useValue: {
            listRestaurants: () =>
              of([
                {
                  id: 'restaurant-mesaflow-centro',
                  name: 'MesaFlow Centro',
                  displayName: 'MesaFlow Centro',
                  timezone: 'Europe/Madrid',
                  currency: 'EUR',
                  isActive: true,
                },
              ]),
          },
        },
      ],
    });

    const store = TestBed.inject(RestaurantContextStore);
    store.load();

    expect(store.activeRestaurant()?.id).toBe('restaurant-mesaflow-centro');
    expect(store.multipleRestaurants()).toBe(false);
    expect(store.isLoading()).toBe(false);
  });
});
```

- [ ] **Step 2: Run the focused context store test to verify it fails**

Run:

```bash
pnpm test -- --watch=false frontend/src/app/features/restaurant-pos/state/restaurant-context.store.spec.ts
```

Expected: FAIL because `RestaurantContextStore` does not exist yet.

- [ ] **Step 3: Implement the context store**

```ts
import { computed, inject, Injectable, signal } from '@angular/core';

import { RestaurantPosApiService } from '../api/restaurant-pos-api.service';
import type { RestaurantSummaryDto } from '../api/restaurant-pos-api.models';

@Injectable({
  providedIn: 'root',
})
export class RestaurantContextStore {
  private readonly api = inject(RestaurantPosApiService);
  private readonly _restaurants = signal<RestaurantSummaryDto[]>([]);
  private readonly _activeRestaurantId = signal<string | null>(null);
  private readonly _isLoading = signal(false);
  private readonly _loadError = signal<string | null>(null);

  readonly restaurants = this._restaurants.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly loadError = this._loadError.asReadonly();
  readonly activeRestaurant = computed(
    () => this._restaurants().find((restaurant) => restaurant.id === this._activeRestaurantId()) ?? null,
  );
  readonly multipleRestaurants = computed(() => this._restaurants().length > 1);
  readonly hasNoRestaurants = computed(() => !this._isLoading() && this._restaurants().length === 0 && !this._loadError());

  load(): void {
    if (this._isLoading()) {
      return;
    }

    this._isLoading.set(true);
    this._loadError.set(null);

    this.api.listRestaurants().subscribe({
      next: (restaurants) => {
        this._restaurants.set(restaurants);
        this._activeRestaurantId.set(restaurants.length === 1 ? restaurants[0]!.id : null);
        this._isLoading.set(false);
      },
      error: () => {
        this._loadError.set('restaurantPos.layout.errors.loadRestaurants');
        this._isLoading.set(false);
      },
    });
  }
}
```

- [ ] **Step 4: Add tests for zero restaurants and multiple restaurants**

```ts
it('keeps active restaurant null when multiple restaurants are returned', () => {
  TestBed.configureTestingModule({
    providers: [
      RestaurantContextStore,
      {
        provide: RestaurantPosApiService,
        useValue: {
          listRestaurants: () =>
            of([
              { id: 'restaurant-1', name: 'Centro', displayName: 'Centro', timezone: 'Europe/Madrid', currency: 'EUR', isActive: true },
              { id: 'restaurant-2', name: 'Norte', displayName: 'Norte', timezone: 'Europe/Madrid', currency: 'EUR', isActive: true },
            ]),
        },
      },
    ],
  });

  const store = TestBed.inject(RestaurantContextStore);
  store.load();

  expect(store.activeRestaurant()).toBeNull();
  expect(store.multipleRestaurants()).toBe(true);
});
```

- [ ] **Step 5: Run the focused context store test to verify it passes**

Run:

```bash
pnpm test -- --watch=false frontend/src/app/features/restaurant-pos/state/restaurant-context.store.spec.ts
```

Expected: PASS with automatic single-restaurant resolution and explicit multi-restaurant state.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/app/features/restaurant-pos/state/restaurant-context.store.ts frontend/src/app/features/restaurant-pos/state/restaurant-context.store.spec.ts
git commit -m "feat: add restaurant context store"
```

### Task 3: Hydrate `RestaurantPosStore` from backend floors

**Files:**

- Modify: `frontend/src/app/features/restaurant-pos/state/restaurant-pos.store.ts`
- Modify: `frontend/src/app/features/restaurant-pos/models/restaurant-pos.models.ts`
- Modify: `frontend/src/app/features/restaurant-pos/pages/restaurant-pos-layout-page/restaurant-pos-layout-page.spec.ts`
- Reference: `frontend/src/app/features/restaurant-pos/state/restaurant-pos.mock-data.ts`

- [ ] **Step 1: Write the failing layout page test for backend hydration**

```ts
it('loads the floor plan for the active restaurant', async () => {
  const { fixture } = await render(RestaurantPosLayoutPage, {
    imports: [...provideI18nTesting().imports],
    providers: [
      ...provideI18nTesting().providers,
      {
        provide: RestaurantContextStore,
        useValue: {
          activeRestaurant: () => ({
            id: 'restaurant-mesaflow-centro',
            name: 'MesaFlow Centro',
            displayName: 'MesaFlow Centro',
            timezone: 'Europe/Madrid',
            currency: 'EUR',
            isActive: true,
          }),
          load: vi.fn(),
          isLoading: () => false,
          loadError: () => null,
          multipleRestaurants: () => false,
          hasNoRestaurants: () => false,
        },
      },
      {
        provide: RestaurantPosApiService,
        useValue: {
          getRestaurantFloors: () =>
            of({
              restaurantId: 'restaurant-mesaflow-centro',
              tables: [{ id: 'table-api-1', tableNumber: 11, name: 'Mesa 11', capacity: 4, isActive: true }],
              floors: [
                {
                  id: 'floor-main',
                  name: 'Sala principal',
                  rows: 12,
                  columns: 16,
                  elements: [{ id: 'floor-element-api-1', type: 'table', label: 'M11', x: 4, y: 4, width: 2, height: 2, tableId: 'table-api-1', shape: 'square', sortOrder: 1 }],
                },
              ],
            }),
        },
      },
    ],
  });

  const store = fixture.debugElement.injector.get(RestaurantPosStore);
  expect(store.gridRows()).toBe(12);
  expect(store.gridColumns()).toBe(16);
  expect(store.floorElements()[0]?.label).toBe('M11');
});
```

- [ ] **Step 2: Run the focused layout page test to verify it fails**

Run:

```bash
pnpm test -- --watch=false frontend/src/app/features/restaurant-pos/pages/restaurant-pos-layout-page/restaurant-pos-layout-page.spec.ts
```

Expected: FAIL because the page and store still use only mock data.

- [ ] **Step 3: Add a floor hydration method to `RestaurantPosStore`**

```ts
hydrateLayout(input: {
  rows: number;
  columns: number;
  floorElements: FloorElement[];
  restaurantTables: RestaurantTable[];
}): void {
  this._gridRows.set(input.rows);
  this._gridColumns.set(input.columns);
  this._floorElements.set(structuredClone(input.floorElements));
  this._restaurantTables.set(structuredClone(input.restaurantTables));
  this.clearError();
}
```

- [ ] **Step 4: Add the backend-to-store mapping in the layout page**

```ts
private readonly restaurantContext = inject(RestaurantContextStore);
private readonly api = inject(RestaurantPosApiService);

constructor() {
  this.restaurantContext.load();

  effect(() => {
    const restaurant = this.restaurantContext.activeRestaurant();
    if (!restaurant) {
      return;
    }

    this.api.getRestaurantFloors(restaurant.id).subscribe((floors) => {
      const firstFloor = floors.floors[0];
      if (!firstFloor) {
        return;
      }

      this.store.hydrateLayout({
        rows: firstFloor.rows,
        columns: firstFloor.columns,
        floorElements: firstFloor.elements.map((element) => ({
          id: element.id,
          type: element.type,
          label: element.label,
          x: element.x,
          y: element.y,
          width: element.width,
          height: element.height,
          tableId: element.tableId ?? undefined,
          shape: element.shape ?? undefined,
        })),
        restaurantTables: floors.tables.map((table) => ({
          id: table.id,
          number: table.tableNumber,
          capacity: table.capacity,
          status: 'free',
          total: 0,
          openDuration: '0m',
        })),
      });
    });
  });
}
```

- [ ] **Step 5: Run the focused layout page test to verify it passes**

Run:

```bash
pnpm test -- --watch=false frontend/src/app/features/restaurant-pos/pages/restaurant-pos-layout-page/restaurant-pos-layout-page.spec.ts
```

Expected: PASS for the new hydration test and existing layout tests still green or ready for the next task’s adjustments.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/app/features/restaurant-pos/state/restaurant-pos.store.ts frontend/src/app/features/restaurant-pos/models/restaurant-pos.models.ts frontend/src/app/features/restaurant-pos/pages/restaurant-pos-layout-page/restaurant-pos-layout-page.ts frontend/src/app/features/restaurant-pos/pages/restaurant-pos-layout-page/restaurant-pos-layout-page.spec.ts
git commit -m "feat: load pos layout from backend"
```

### Task 4: Connect add, resize, and reorder mutations to backend

**Files:**

- Modify: `frontend/src/app/features/restaurant-pos/pages/restaurant-pos-layout-page/restaurant-pos-layout-page.ts`
- Modify: `frontend/src/app/features/restaurant-pos/pages/restaurant-pos-layout-page/restaurant-pos-layout-page.spec.ts`
- Modify: `frontend/src/app/features/restaurant-pos/state/restaurant-pos.store.ts`
- Reference: `backend/docs/mesaflow-api.md`

- [ ] **Step 1: Write the failing add-element mutation test**

```ts
it('posts a new element and refreshes the layout from the backend response', async () => {
  const createFloorElement = vi.fn(() =>
    of({
      restaurantId: 'restaurant-mesaflow-centro',
      tables: [{ id: 'table-api-1', tableNumber: 11, name: 'Mesa 11', capacity: 4, isActive: true }],
      floors: [
        {
          id: 'floor-main',
          name: 'Sala principal',
          rows: 12,
          columns: 16,
          elements: [{ id: 'floor-element-api-99', type: 'blocked', label: 'Zona temporal', x: 10, y: 9, width: 2, height: 1, tableId: null, shape: null, sortOrder: 8 }],
        },
      ],
    }),
  );

  await renderLayoutPageWithApi({ createFloorElement });

  fireEvent.click(screen.getByRole('button', { name: 'Añadir elemento' }));
  fireEvent.change(screen.getByLabelText('Tipo de elemento'), { target: { value: 'blocked-area' } });
  fireEvent.click(screen.getByRole('button', { name: 'Colocar en columna 11 fila 10' }));
  fireEvent.click(screen.getByRole('button', { name: /Añadir/i }));

  expect(createFloorElement).toHaveBeenCalledWith(
    'restaurant-mesaflow-centro',
    'floor-main',
    expect.objectContaining({ type: 'blocked', label: expect.any(String) }),
  );
  expect(screen.getByLabelText('Zona temporal elemento del plano')).toBeTruthy();
});
```

- [ ] **Step 2: Run the focused layout page test to verify it fails**

Run:

```bash
pnpm test -- --watch=false frontend/src/app/features/restaurant-pos/pages/restaurant-pos-layout-page/restaurant-pos-layout-page.spec.ts
```

Expected: FAIL because mutations still only update local mock state.

- [ ] **Step 3: Add a shared helper in the layout page to apply backend floor payloads**

```ts
private applyFloorsResponse(floors: RestaurantFloorsDto): void {
  const floor = floors.floors[0];
  if (!floor) {
    return;
  }

  this.store.hydrateLayout({
    rows: floor.rows,
    columns: floor.columns,
    floorElements: floor.elements.map((element) => ({
      id: element.id,
      type: element.type,
      label: element.label,
      x: element.x,
      y: element.y,
      width: element.width,
      height: element.height,
      tableId: element.tableId ?? undefined,
      shape: element.shape ?? undefined,
    })),
    restaurantTables: floors.tables.map((table) => ({
      id: table.id,
      number: table.tableNumber,
      capacity: table.capacity,
      status: 'free',
      total: 0,
      openDuration: '0m',
    })),
  });
}
```

- [ ] **Step 4: Replace local add-element mutation with backend `POST`**

```ts
protected addSelectedElement(): void {
  const placement = this.selectedPlacement();
  const restaurant = this.restaurantContext.activeRestaurant();
  const floorId = this.store.activeFloorId();

  if (!placement || !restaurant || !floorId) {
    return;
  }

  this.api.createFloorElement(restaurant.id, floorId, {
    type: placement.type,
    label: placement.label,
    x: placement.x,
    y: placement.y,
    width: placement.width,
    height: placement.height,
    tableId: null,
    shape: placement.shape ?? null,
    sortOrder: this.store.nextFloorElementSortOrder(),
  }).subscribe((floors) => {
    this.applyFloorsResponse(floors);
    this.closeAddElementModal();
  });
}
```

- [ ] **Step 5: Replace resize and reorder flows with backend `PATCH` and `PUT`**

```ts
protected applyResize(): void {
  const restaurant = this.restaurantContext.activeRestaurant();
  const floorId = this.store.activeFloorId();

  if (!restaurant || !floorId) {
    return;
  }

  this.api.updateFloor(restaurant.id, floorId, {
    name: this.store.activeFloorName(),
    rows: this.resizeRowsInput(),
    columns: this.resizeColumnsInput(),
  }).subscribe((floors) => {
    this.applyFloorsResponse(floors);
    this.closeResizeModal();
  });
}

protected persistElementReorder(): void {
  const restaurant = this.restaurantContext.activeRestaurant();
  const floorId = this.store.activeFloorId();

  if (!restaurant || !floorId) {
    return;
  }

  this.api.reorderFloorElements(restaurant.id, floorId, {
    elements: this.store.floorElements().map((element, index) => ({
      id: element.id,
      x: element.x,
      y: element.y,
      width: element.width,
      height: element.height,
      sortOrder: index + 1,
    })),
  }).subscribe((floors) => {
    this.applyFloorsResponse(floors);
  });
}
```

- [ ] **Step 6: Add and adjust page tests for `PATCH` and `PUT`**

```ts
it('patches the floor dimensions and refreshes the layout', async () => {
  const updateFloor = vi.fn(() =>
    of({
      restaurantId: 'restaurant-mesaflow-centro',
      tables: [],
      floors: [{ id: 'floor-main', name: 'Sala principal', rows: 9, columns: 10, elements: [] }],
    }),
  );

  await renderLayoutPageWithApi({ updateFloor });
  fireEvent.click(screen.getByRole('button', { name: 'Redimensionar plano' }));
  fireEvent.input(screen.getByLabelText('Filas'), { target: { value: '9' } });
  fireEvent.input(screen.getByLabelText('Columnas'), { target: { value: '10' } });
  fireEvent.click(screen.getByRole('button', { name: 'Aplicar tamaño del plano' }));

  expect(updateFloor).toHaveBeenCalledWith(
    'restaurant-mesaflow-centro',
    'floor-main',
    expect.objectContaining({ rows: 9, columns: 10 }),
  );
});
```

- [ ] **Step 7: Run the layout page test suite to verify it passes**

Run:

```bash
pnpm test -- --watch=false frontend/src/app/features/restaurant-pos/pages/restaurant-pos-layout-page/restaurant-pos-layout-page.spec.ts
```

Expected: PASS with backend-backed add, resize, and reorder flows.

- [ ] **Step 8: Run broader frontend verification**

Run:

```bash
pnpm test -- --watch=false
pnpm build
```

Expected: PASS for the touched frontend feature and a successful production build.

- [ ] **Step 9: Run backend verification only if backend files changed while integrating**

Run only if needed:

```bash
pnpm test:e2e -- test/app.e2e-spec.ts
pnpm test
pnpm build
```

Expected: PASS only if frontend integration required backend contract adjustments.

- [ ] **Step 10: Commit**

```bash
git add frontend/src/app/features/restaurant-pos/pages/restaurant-pos-layout-page/restaurant-pos-layout-page.ts frontend/src/app/features/restaurant-pos/pages/restaurant-pos-layout-page/restaurant-pos-layout-page.spec.ts frontend/src/app/features/restaurant-pos/state/restaurant-pos.store.ts frontend/src/app/features/restaurant-pos/models/restaurant-pos.models.ts
git commit -m "feat: connect pos layout to restaurant api"
```

## Self-Review

### Spec coverage

- Automatic single-restaurant resolution: covered in Task 2.
- Layout route hydration from backend floors: covered in Task 3.
- Real `POST`, `PATCH`, and `PUT` layout mutations: covered in Task 4.
- Focused frontend testing: covered in Tasks 1, 2, 3, and 4.
- No selector UI and no delete endpoint: respected by scope throughout the plan.

### Placeholder scan

- No `TODO`, `TBD`, or “similar to above” placeholders remain.
- Each task includes concrete files, code, commands, and expected outcomes.

### Type consistency

- `RestaurantPosApiService` owns `/restaurants` HTTP calls in every task.
- `RestaurantContextStore` owns restaurant resolution in every task.
- `RestaurantPosStore.hydrateLayout()` is reused consistently for backend payload application.
- Layout page reads the active restaurant from context rather than hardcoding ids.

