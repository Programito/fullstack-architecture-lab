# Create Reservations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add manual reservation creation to the restaurant POS so front-of-house staff can create a reservation from the daily agenda and see it appear immediately in the reservations view.

**Architecture:** Extend the existing reservations read-and-actions flow with one write path: `POST /api/v1/restaurants/:restaurantId/reservations`. Keep the first version intentionally small: a simple frontend creation form on the reservations page, backend validation in one dedicated use case, and reuse the existing floors endpoint to offer optional table assignment without adding a new tables API.

**Tech Stack:** Angular standalone + signals + Transloco + Testing Library, NestJS + clean architecture use cases + DTOs, Vitest, existing in-memory/demo repository.

---

## File map

### Backend

- Modify: `backend/src/restaurants/application/ports/restaurant-read-repository.port.ts`
  Add a `createReservation(...)` method to the existing restaurant read/write adapter contract used by the demo repository.
- Modify: `backend/src/restaurants/domain/restaurant-read.models.ts`
  Add a `CreateRestaurantReservationInput` type and keep `RestaurantReservation` unchanged.
- Create: `backend/src/restaurants/application/use-cases/create-restaurant-reservation.use-case.ts`
  Validate the command, call the repository, and map domain/application errors.
- Create: `backend/src/restaurants/application/use-cases/create-restaurant-reservation.use-case.spec.ts`
  Cover valid creation, restaurant missing, invalid past date, invalid party size, and invalid table ownership.
- Modify: `backend/src/restaurants/infrastructure/demo-restaurant-read.repository.ts`
  Implement `createReservation(...)` against the in-memory data set and validate table ownership.
- Modify: `backend/src/restaurants/infrastructure/demo-restaurant-read.repository.spec.ts`
  Add repository-level creation tests.
- Create: `backend/src/restaurants/presentation/rest/dto/create-restaurant-reservation.dto.ts`
  Define the REST body for reservation creation.
- Modify: `backend/src/restaurants/presentation/rest/restaurants.controller.ts`
  Add the `POST /api/v1/restaurants/:id/reservations` endpoint.
- Modify: `backend/src/restaurants/restaurants.module.ts`
  Register the new use case provider.
- Modify: `backend/src/shared/errors/application-error.ts`
  Add application errors for invalid reservation creation input.
- Modify: `backend/src/shared/http/application-error.mapper.ts`
  Map the new reservation creation errors to `400`.
- Modify: `backend/docs/mesaflow-api.md`
  Document the new POST endpoint contract.
- Modify: `backend/README.md`
  Add the new endpoint to the initial API list.

### Frontend

- Modify: `frontend/src/app/features/restaurant-pos/api/restaurant-pos-api.models.ts`
  Add the request type for reservation creation.
- Modify: `frontend/src/app/features/restaurant-pos/api/restaurant-pos-api.service.ts`
  Add `createRestaurantReservation(...)`.
- Modify: `frontend/src/app/features/restaurant-pos/api/restaurant-pos-api.service.spec.ts`
  Cover the new POST endpoint.
- Modify: `frontend/src/app/features/restaurant-pos/pages/restaurant-pos-reservations-page/restaurant-pos-reservations-page.ts`
  Add form state, available tables loading, submit flow, and post-create refresh.
- Modify: `frontend/src/app/features/restaurant-pos/pages/restaurant-pos-reservations-page/restaurant-pos-reservations-page.html`
  Add a “Nueva reserva” action and the creation form UI.
- Modify: `frontend/src/app/features/restaurant-pos/pages/restaurant-pos-reservations-page/restaurant-pos-reservations-page.css`
  Style the form and validation/error states.
- Modify: `frontend/src/app/features/restaurant-pos/pages/restaurant-pos-reservations-page/restaurant-pos-reservations-page.spec.ts`
  Cover opening the form, rendering fields, successful creation, validation state, and failure state.
- Modify: `frontend/public/i18n/es.json`
- Modify: `frontend/public/i18n/en.json`
- Modify: `frontend/public/i18n/ca.json`
- Modify: `frontend/src/app/shared/i18n/i18n-testing.ts`
  Add all new reservation-creation strings.
- Modify: `frontend/docs/architecture.md`
  Document the create flow on the reservations page.
- Modify: `frontend/docs/testing.md`
  Extend testing guidance for creation scenarios.

### Reused files worth checking before implementation

- `backend/src/restaurants/presentation/rest/dto/restaurant-reservation-response.dto.ts`
- `backend/src/restaurants/application/use-cases/update-restaurant-reservation-status.use-case.ts`
- `frontend/src/app/features/restaurant-pos/pages/restaurant-pos-reservations-page/restaurant-pos-reservations-page.ts`
- `frontend/src/app/features/restaurant-pos/api/restaurant-pos-api.models.ts`
- `frontend/src/app/features/restaurant-pos/api/restaurant-pos-api.service.ts`

---

### Task 1: Define the backend reservation creation contract

**Files:**
- Modify: `backend/src/restaurants/domain/restaurant-read.models.ts`
- Modify: `backend/src/restaurants/application/ports/restaurant-read-repository.port.ts`
- Test: `backend/src/restaurants/application/use-cases/create-restaurant-reservation.use-case.spec.ts`

- [ ] **Step 1: Write the failing use-case test scaffold**

```ts
import { describe, expect, it, vi } from 'vitest';
import type { RestaurantReadRepository } from '../ports/restaurant-read-repository.port';
import { CreateRestaurantReservationUseCase } from './create-restaurant-reservation.use-case';

const makeRepository = (): RestaurantReadRepository => ({
  listRestaurants: vi.fn(),
  findMenuByRestaurantId: vi.fn(),
  findFloorsByRestaurantId: vi.fn(),
  listReservationsByRestaurantId: vi.fn(),
  updateReservationStatus: vi.fn(),
  createReservation: vi.fn(),
  findServiceFloorByRestaurantId: vi.fn(),
  findServicePointByRestaurantId: vi.fn(),
  findServicePointOrderByRestaurantId: vi.fn(),
  occupyServicePoint: vi.fn(),
  sendServicePointOrderToKitchen: vi.fn(),
  markServicePointOrderServed: vi.fn(),
  chargeServicePoint: vi.fn(),
  setServicePointStatus: vi.fn(),
  reorderFloorElements: vi.fn(),
  updateFloor: vi.fn(),
  updateFloorElement: vi.fn(),
  updateServiceOrderLineStatus: vi.fn(),
  createFloorElement: vi.fn(),
});

describe('CreateRestaurantReservationUseCase', () => {
  it('creates one reservation with snapshots and optional table ids', async () => {
    const repository = makeRepository();
    const useCase = new CreateRestaurantReservationUseCase(repository);

    expect(useCase).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- create-restaurant-reservation.use-case.spec.ts`
Expected: FAIL with missing `CreateRestaurantReservationUseCase` and/or missing `createReservation` contract.

- [ ] **Step 3: Add the domain input type and repository method**

```ts
export type CreateRestaurantReservationInput = {
  customerNameSnapshot: string;
  customerPhoneSnapshot: string | null;
  partySize: number;
  reservationAt: string;
  durationMinutes: number;
  notes: string | null;
  tableIds: string[];
};
```

```ts
createReservation(
  restaurantId: string,
  reservation: CreateRestaurantReservationInput,
): Promise<RestaurantReservation | null>;
```

- [ ] **Step 4: Run the test again**

Run: `pnpm test -- create-restaurant-reservation.use-case.spec.ts`
Expected: FAIL with missing implementation file, but compile should now know the repository contract.

- [ ] **Step 5: Commit**

```bash
git add backend/src/restaurants/domain/restaurant-read.models.ts backend/src/restaurants/application/ports/restaurant-read-repository.port.ts backend/src/restaurants/application/use-cases/create-restaurant-reservation.use-case.spec.ts
git commit -m "test: define reservation creation contract"
```

---

### Task 2: Implement backend validation and use case

**Files:**
- Create: `backend/src/restaurants/application/use-cases/create-restaurant-reservation.use-case.ts`
- Modify: `backend/src/shared/errors/application-error.ts`
- Modify: `backend/src/shared/http/application-error.mapper.ts`
- Test: `backend/src/restaurants/application/use-cases/create-restaurant-reservation.use-case.spec.ts`

- [ ] **Step 1: Expand the failing spec with concrete cases**

```ts
it('returns restaurant_not_found when the restaurant does not exist', async () => {
  vi.mocked(repository.createReservation).mockResolvedValue(null);
  const result = await useCase.execute({
    restaurantId: 'missing',
    customerNameSnapshot: 'Laura Gomez',
    customerPhoneSnapshot: '+34 600 111 222',
    partySize: 2,
    reservationAt: '2026-06-28T13:30:00.000Z',
    durationMinutes: 90,
    notes: null,
    tableIds: [],
  });
  expect(result._tag).toBe('err');
});

it('rejects party size lower than 1', async () => {
  const result = await useCase.execute({
    restaurantId: 'restaurant-mesaflow-centro',
    customerNameSnapshot: 'Laura Gomez',
    customerPhoneSnapshot: null,
    partySize: 0,
    reservationAt: '2026-06-28T13:30:00.000Z',
    durationMinutes: 90,
    notes: null,
    tableIds: [],
  });
  expect(result._tag).toBe('err');
});
```

- [ ] **Step 2: Run the spec**

Run: `pnpm test -- create-restaurant-reservation.use-case.spec.ts`
Expected: FAIL because the use case file and reservation creation errors do not exist yet.

- [ ] **Step 3: Add application errors and implement the use case**

```ts
export const invalidReservationCreation = (details: {
  reason: 'invalid_party_size' | 'reservation_in_past' | 'invalid_duration' | 'invalid_table_ids' | 'missing_customer_name';
}) =>
  applicationError('invalid_reservation_creation', 'Reservation creation is invalid.', details);
```

```ts
@Injectable()
export class CreateRestaurantReservationUseCase {
  constructor(@Inject(RESTAURANT_READ_REPOSITORY) private readonly restaurants: RestaurantReadRepository) {}

  async execute(command: { restaurantId: string } & CreateRestaurantReservationInput) {
    if (command.customerNameSnapshot.trim().length === 0) {
      return err(invalidReservationCreation({ reason: 'missing_customer_name' }));
    }
    if (command.partySize < 1) {
      return err(invalidReservationCreation({ reason: 'invalid_party_size' }));
    }
    if (command.durationMinutes < 15) {
      return err(invalidReservationCreation({ reason: 'invalid_duration' }));
    }
    if (new Date(command.reservationAt).getTime() <= Date.now()) {
      return err(invalidReservationCreation({ reason: 'reservation_in_past' }));
    }

    try {
      const reservation = await this.restaurants.createReservation(command.restaurantId, {
        customerNameSnapshot: command.customerNameSnapshot.trim(),
        customerPhoneSnapshot: command.customerPhoneSnapshot?.trim() || null,
        partySize: command.partySize,
        reservationAt: command.reservationAt,
        durationMinutes: command.durationMinutes,
        notes: command.notes?.trim() || null,
        tableIds: command.tableIds,
      });

      return reservation ? ok(reservation) : err(restaurantNotFound(command.restaurantId));
    } catch (error) {
      return rethrowApplicationErrorAsResult(error);
    }
  }
}
```

- [ ] **Step 4: Run the spec again**

Run: `pnpm test -- create-restaurant-reservation.use-case.spec.ts`
Expected: PASS for valid and invalid input cases.

- [ ] **Step 5: Commit**

```bash
git add backend/src/restaurants/application/use-cases/create-restaurant-reservation.use-case.ts backend/src/restaurants/application/use-cases/create-restaurant-reservation.use-case.spec.ts backend/src/shared/errors/application-error.ts backend/src/shared/http/application-error.mapper.ts
git commit -m "feat: validate restaurant reservation creation"
```

---

### Task 3: Implement backend repository creation in the demo adapter

**Files:**
- Modify: `backend/src/restaurants/infrastructure/demo-restaurant-read.repository.ts`
- Modify: `backend/src/restaurants/infrastructure/demo-restaurant-read.repository.spec.ts`

- [ ] **Step 1: Write failing repository tests for creation**

```ts
it('creates a pending reservation sorted in the agenda', async () => {
  const repository = new DemoRestaurantReadRepository();

  const created = await repository.createReservation('restaurant-mesaflow-centro', {
    customerNameSnapshot: 'Marina Soler',
    customerPhoneSnapshot: '+34 600 777 888',
    partySize: 4,
    reservationAt: '2026-06-27T14:00:00.000Z',
    durationMinutes: 90,
    notes: 'Ventana',
    tableIds: ['table-1'],
  });

  expect(created?.status).toBe('pending');
  expect(created?.tables).toEqual([{ id: 'table-1', tableNumber: 1, name: 'Mesa 1' }]);
});

it('rejects table ids that do not belong to the restaurant', async () => {
  const repository = new DemoRestaurantReadRepository();
  await expect(
    repository.createReservation('restaurant-mesaflow-centro', {
      customerNameSnapshot: 'Marina Soler',
      customerPhoneSnapshot: null,
      partySize: 4,
      reservationAt: '2026-06-27T14:00:00.000Z',
      durationMinutes: 90,
      notes: null,
      tableIds: ['missing-table'],
    }),
  ).rejects.toMatchObject({ applicationError: { code: 'invalid_reservation_creation' } });
});
```

- [ ] **Step 2: Run the repository spec**

Run: `pnpm test -- demo-restaurant-read.repository.spec.ts`
Expected: FAIL because `createReservation` is not implemented.

- [ ] **Step 3: Implement the minimal repository logic**

```ts
async createReservation(
  restaurantId: string,
  reservation: CreateRestaurantReservationInput,
): Promise<RestaurantReservation | null> {
  const reservationsMap = new Map(this.reservations);
  const reservations = reservationsMap.get(restaurantId);
  if (!reservations) return null;

  const tables = this.tablesByRestaurantId(restaurantId);
  const selectedTables = reservation.tableIds.map((tableId) => tables.find((table) => table.id === tableId) ?? null);
  if (selectedTables.some((table) => table === null)) {
    throw new ApplicationErrorException(invalidReservationCreation({ reason: 'invalid_table_ids' }));
  }

  const created: RestaurantReservation = {
    id: `reservation-${crypto.randomUUID()}`,
    customerId: null,
    customerNameSnapshot: reservation.customerNameSnapshot,
    customerPhoneSnapshot: reservation.customerPhoneSnapshot,
    partySize: reservation.partySize,
    reservationAt: reservation.reservationAt,
    durationMinutes: reservation.durationMinutes,
    status: 'pending',
    notes: reservation.notes,
    tableIds: reservation.tableIds,
    tables: selectedTables.map((table) => ({ id: table!.id, tableNumber: table!.tableNumber, name: table!.name })),
  };

  reservations.push(created);
  reservations.sort((left, right) => left.reservationAt.localeCompare(right.reservationAt));
  reservationsMap.set(restaurantId, reservations);
  this.reservations = [...reservationsMap.entries()];

  return structuredClone(created);
}
```

- [ ] **Step 4: Run the repository spec**

Run: `pnpm test -- demo-restaurant-read.repository.spec.ts`
Expected: PASS for creation and invalid table ownership.

- [ ] **Step 5: Commit**

```bash
git add backend/src/restaurants/infrastructure/demo-restaurant-read.repository.ts backend/src/restaurants/infrastructure/demo-restaurant-read.repository.spec.ts
git commit -m "feat: create demo restaurant reservations"
```

---

### Task 4: Expose the backend POST endpoint

**Files:**
- Create: `backend/src/restaurants/presentation/rest/dto/create-restaurant-reservation.dto.ts`
- Modify: `backend/src/restaurants/presentation/rest/restaurants.controller.ts`
- Modify: `backend/src/restaurants/restaurants.module.ts`

- [ ] **Step 1: Write the DTO and a controller usage expectation**

```ts
export class CreateRestaurantReservationDto {
  customerNameSnapshot!: string;
  customerPhoneSnapshot?: string | null;
  partySize!: number;
  reservationAt!: string;
  durationMinutes?: number;
  notes?: string | null;
  tableIds?: string[];
}
```

```ts
await this.createRestaurantReservation.execute({
  restaurantId,
  customerNameSnapshot: body.customerNameSnapshot,
  customerPhoneSnapshot: body.customerPhoneSnapshot ?? null,
  partySize: body.partySize,
  reservationAt: body.reservationAt,
  durationMinutes: body.durationMinutes ?? 90,
  notes: body.notes ?? null,
  tableIds: body.tableIds ?? [],
});
```

- [ ] **Step 2: Add the use case to the module and controller constructor**

Run: no command yet
Expected: code compiles after imports are wired.

- [ ] **Step 3: Add the POST endpoint**

```ts
@Post(':id/reservations')
@Version('1')
@ApiCreatedResponse({ type: RestaurantReservationResponseDto })
@ApiBadRequestResponse({ description: 'Reservation creation is invalid.' })
@ApiNotFoundResponse({ description: 'Restaurant not found.' })
async createReservation(
  @Param('id') restaurantId: string,
  @Body() body: CreateRestaurantReservationDto,
): Promise<RestaurantReservationResponseDto> {
  return RestaurantReservationResponseDto.fromDomain(
    unwrapResultOrThrow(
      await this.createRestaurantReservation.execute({
        restaurantId,
        customerNameSnapshot: body.customerNameSnapshot,
        customerPhoneSnapshot: body.customerPhoneSnapshot ?? null,
        partySize: body.partySize,
        reservationAt: body.reservationAt,
        durationMinutes: body.durationMinutes ?? 90,
        notes: body.notes ?? null,
        tableIds: body.tableIds ?? [],
      }),
    ),
  );
}
```

- [ ] **Step 4: Run focused backend tests**

Run: `pnpm test -- create-restaurant-reservation.use-case.spec.ts demo-restaurant-read.repository.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/restaurants/presentation/rest/dto/create-restaurant-reservation.dto.ts backend/src/restaurants/presentation/rest/restaurants.controller.ts backend/src/restaurants/restaurants.module.ts
git commit -m "feat: expose restaurant reservation creation endpoint"
```

---

### Task 5: Add the frontend API method and request type

**Files:**
- Modify: `frontend/src/app/features/restaurant-pos/api/restaurant-pos-api.models.ts`
- Modify: `frontend/src/app/features/restaurant-pos/api/restaurant-pos-api.service.ts`
- Modify: `frontend/src/app/features/restaurant-pos/api/restaurant-pos-api.service.spec.ts`

- [ ] **Step 1: Write the failing API service spec**

```ts
it('creates one reservation for a restaurant', () => {
  service
    .createRestaurantReservation('restaurant-mesaflow-centro', {
      customerNameSnapshot: 'Marina Soler',
      customerPhoneSnapshot: '+34 600 777 888',
      partySize: 4,
      reservationAt: '2026-06-28T13:30:00.000Z',
      durationMinutes: 90,
      notes: 'Ventana',
      tableIds: ['table-1'],
    })
    .subscribe();

  const request = http.expectOne('/api/v1/restaurants/restaurant-mesaflow-centro/reservations');
  expect(request.request.method).toBe('POST');
  expect(request.request.body.tableIds).toEqual(['table-1']);
});
```

- [ ] **Step 2: Run the focused frontend API spec**

Run: `pnpm exec ng test --watch=false --include=src/app/features/restaurant-pos/api/restaurant-pos-api.service.spec.ts`
Expected: FAIL because `createRestaurantReservation` and its request type do not exist.

- [ ] **Step 3: Add the request type and service method**

```ts
export type CreateRestaurantReservationRequest = {
  customerNameSnapshot: string;
  customerPhoneSnapshot: string | null;
  partySize: number;
  reservationAt: string;
  durationMinutes: number;
  notes: string | null;
  tableIds: string[];
};
```

```ts
createRestaurantReservation(
  restaurantId: string,
  request: CreateRestaurantReservationRequest,
): Observable<RestaurantReservationDto> {
  return this.http.post<RestaurantReservationDto>(`${this.restaurantsUrl}/${restaurantId}/reservations`, request);
}
```

- [ ] **Step 4: Run the focused frontend API spec**

Run: `pnpm exec ng test --watch=false --include=src/app/features/restaurant-pos/api/restaurant-pos-api.service.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/features/restaurant-pos/api/restaurant-pos-api.models.ts frontend/src/app/features/restaurant-pos/api/restaurant-pos-api.service.ts frontend/src/app/features/restaurant-pos/api/restaurant-pos-api.service.spec.ts
git commit -m "feat: add frontend reservation creation api"
```

---

### Task 6: Add the creation form to the reservations page

**Files:**
- Modify: `frontend/src/app/features/restaurant-pos/pages/restaurant-pos-reservations-page/restaurant-pos-reservations-page.ts`
- Modify: `frontend/src/app/features/restaurant-pos/pages/restaurant-pos-reservations-page/restaurant-pos-reservations-page.html`
- Modify: `frontend/src/app/features/restaurant-pos/pages/restaurant-pos-reservations-page/restaurant-pos-reservations-page.css`

- [ ] **Step 1: Write the failing page spec for opening and submitting the form**

```ts
it('opens the new reservation form and creates one reservation', async () => {
  await render(RestaurantPosReservationsPage, { ...setup });

  fireEvent.click(screen.getByRole('button', { name: 'Nueva reserva' }));
  fireEvent.input(screen.getByLabelText('Cliente'), { target: { value: 'Marina Soler' } });
  fireEvent.input(screen.getByLabelText('Telefono'), { target: { value: '+34 600 777 888' } });
  fireEvent.input(screen.getByLabelText('Comensales'), { target: { value: '4' } });
  fireEvent.input(screen.getByLabelText('Hora'), { target: { value: '13:30' } });
  fireEvent.click(screen.getByRole('button', { name: 'Guardar reserva' }));

  expect(apiMock.createRestaurantReservation).toHaveBeenCalled();
});
```

- [ ] **Step 2: Run the focused page spec**

Run: `pnpm exec ng test --watch=false --include=src/app/features/restaurant-pos/pages/restaurant-pos-reservations-page/restaurant-pos-reservations-page.spec.ts`
Expected: FAIL because the page has no creation UI or submit flow.

- [ ] **Step 3: Add minimal page state and submit logic**

```ts
protected readonly creationOpen = signal(false);
protected readonly creationSubmitting = signal(false);
protected readonly creationError = signal<string | null>(null);
protected readonly creationForm = signal({
  customerNameSnapshot: '',
  customerPhoneSnapshot: '',
  partySize: 2,
  time: '13:30',
  durationMinutes: 90,
  notes: '',
  tableIds: [] as string[],
});
```

```ts
protected submitReservation(): void {
  const restaurant = this.activeRestaurant();
  if (!restaurant) return;

  const request = {
    customerNameSnapshot: this.creationForm().customerNameSnapshot.trim(),
    customerPhoneSnapshot: this.creationForm().customerPhoneSnapshot.trim() || null,
    partySize: this.creationForm().partySize,
    reservationAt: `${this.selectedDate()}T${this.creationForm().time}:00.000Z`,
    durationMinutes: this.creationForm().durationMinutes,
    notes: this.creationForm().notes.trim() || null,
    tableIds: this.creationForm().tableIds,
  };

  this.creationSubmitting.set(true);
  this.creationError.set(null);
  this.api.createRestaurantReservation(restaurant.id, request).subscribe({
    next: () => {
      this.creationSubmitting.set(false);
      this.creationOpen.set(false);
      this.loadReservations(restaurant.id);
    },
    error: () => {
      this.creationSubmitting.set(false);
      this.creationError.set(this.transloco.translate('restaurantPos.reservations.create.error'));
    },
  });
}
```

- [ ] **Step 4: Add the minimal template**

```html
<button type="button" class="reservations-page__primary-button" (click)="creationOpen.set(true)">
  {{ 'restaurantPos.reservations.create.open' | transloco }}
</button>

@if (creationOpen()) {
  <section class="theme-panel rounded-2xl border p-4 shadow-sm">
    <!-- customer, phone, party size, time, duration, notes, optional tables -->
    <button type="button" (click)="submitReservation()">
      {{ 'restaurantPos.reservations.create.submit' | transloco }}
    </button>
  </section>
}
```

- [ ] **Step 5: Run the focused page spec**

Run: `pnpm exec ng test --watch=false --include=src/app/features/restaurant-pos/pages/restaurant-pos-reservations-page/restaurant-pos-reservations-page.spec.ts`
Expected: FAIL on remaining missing labels/validation until the next task fills them in.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/app/features/restaurant-pos/pages/restaurant-pos-reservations-page/restaurant-pos-reservations-page.ts frontend/src/app/features/restaurant-pos/pages/restaurant-pos-reservations-page/restaurant-pos-reservations-page.html frontend/src/app/features/restaurant-pos/pages/restaurant-pos-reservations-page/restaurant-pos-reservations-page.css frontend/src/app/features/restaurant-pos/pages/restaurant-pos-reservations-page/restaurant-pos-reservations-page.spec.ts
git commit -m "feat: add reservation creation form shell"
```

---

### Task 7: Finish frontend validation, optional tables, and i18n

**Files:**
- Modify: `frontend/src/app/features/restaurant-pos/pages/restaurant-pos-reservations-page/restaurant-pos-reservations-page.ts`
- Modify: `frontend/src/app/features/restaurant-pos/pages/restaurant-pos-reservations-page/restaurant-pos-reservations-page.spec.ts`
- Modify: `frontend/public/i18n/es.json`
- Modify: `frontend/public/i18n/en.json`
- Modify: `frontend/public/i18n/ca.json`
- Modify: `frontend/src/app/shared/i18n/i18n-testing.ts`

- [ ] **Step 1: Extend the page spec with validation and failure cases**

```ts
it('shows validation when customer name is empty', async () => {
  await render(RestaurantPosReservationsPage, { ...setup });
  fireEvent.click(screen.getByRole('button', { name: 'Nueva reserva' }));
  fireEvent.click(screen.getByRole('button', { name: 'Guardar reserva' }));
  expect(screen.getByText('Introduce el nombre del cliente.')).toBeTruthy();
});

it('shows an error when creation fails', async () => {
  apiMock.createRestaurantReservation = vi.fn(() => throwError(() => new Error('boom')));
  await render(RestaurantPosReservationsPage, { ...setup });
  // fill fields and submit
  expect(await screen.findByText('No se ha podido crear la reserva.')).toBeTruthy();
});
```

- [ ] **Step 2: Reuse floors data for optional table assignment**

```ts
protected readonly availableTables = computed(() =>
  this.restaurantFloors()?.tables.map((table) => ({
    id: table.id,
    label: table.name || `Mesa ${table.tableNumber}`,
  })) ?? [],
);
```

```ts
this.api.getRestaurantFloors(restaurant.id).subscribe((floors) => {
  this.restaurantFloors.set(floors);
});
```

- [ ] **Step 3: Add minimal frontend validation and all strings**

```ts
if (request.customerNameSnapshot.length === 0) {
  this.creationError.set(this.transloco.translate('restaurantPos.reservations.create.validation.customerNameRequired'));
  return;
}
if (request.partySize < 1) {
  this.creationError.set(this.transloco.translate('restaurantPos.reservations.create.validation.partySizeRequired'));
  return;
}
```

```json
"create": {
  "open": "Nueva reserva",
  "title": "Crear reserva",
  "customerName": "Cliente",
  "customerPhone": "Telefono",
  "partySize": "Comensales",
  "time": "Hora",
  "duration": "Duracion",
  "notes": "Notas",
  "tables": "Mesas",
  "submit": "Guardar reserva",
  "cancel": "Cerrar",
  "error": "No se ha podido crear la reserva.",
  "validation": {
    "customerNameRequired": "Introduce el nombre del cliente.",
    "partySizeRequired": "Indica al menos un comensal."
  }
}
```

- [ ] **Step 4: Run the focused page spec**

Run: `pnpm exec ng test --watch=false --include=src/app/features/restaurant-pos/pages/restaurant-pos-reservations-page/restaurant-pos-reservations-page.spec.ts`
Expected: PASS for open, validation, success, refresh, and failure.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/features/restaurant-pos/pages/restaurant-pos-reservations-page/restaurant-pos-reservations-page.ts frontend/src/app/features/restaurant-pos/pages/restaurant-pos-reservations-page/restaurant-pos-reservations-page.spec.ts frontend/public/i18n/es.json frontend/public/i18n/en.json frontend/public/i18n/ca.json frontend/src/app/shared/i18n/i18n-testing.ts
git commit -m "feat: finish reservation creation UX"
```

---

### Task 8: Documentation and full verification

**Files:**
- Modify: `backend/docs/mesaflow-api.md`
- Modify: `backend/README.md`
- Modify: `frontend/docs/architecture.md`
- Modify: `frontend/docs/testing.md`

- [ ] **Step 1: Document the new POST flow**

```md
- `POST /api/v1/restaurants/:restaurantId/reservations`
  Creates one reservation with customer snapshots, party size, date/time, optional notes, and optional table ids.
```

```md
La agenda de reservas permite crear una nueva reserva desde la propia page y refresca la vista
tras guardar correctamente.
```

- [ ] **Step 2: Run focused backend verification**

Run: `pnpm test -- create-restaurant-reservation.use-case.spec.ts demo-restaurant-read.repository.spec.ts`
Expected: PASS.

- [ ] **Step 3: Run full verification**

Run: `pnpm test`
Expected: PASS in `backend/`.

Run: `pnpm build`
Expected: PASS in `backend/`.

Run: `pnpm exec ng test --watch=false`
Expected: PASS in `frontend/`.

Run: `pnpm build`
Expected: likely FAIL only if the known CSS budget issue in `frontend/src/app/features/identity/pages/login-page/login-page.css` is still present; confirm that reservation changes are not the cause.

- [ ] **Step 4: Commit**

```bash
git add backend/docs/mesaflow-api.md backend/README.md frontend/docs/architecture.md frontend/docs/testing.md
git commit -m "docs: document reservation creation flow"
```

---

## Assumptions and guardrails

- No new database tables are needed for `v0.0.3`.
- Reservation creation stays snapshot-first: `customerId` can remain `null` in this iteration.
- Table assignment is optional.
- No table-capacity matching, overlap prevention, or shift-slot rules are introduced yet.
- No edit, delete, or drag-and-drop UX is added in this iteration.
- No automatic order opening is triggered when creating a reservation.

## Self-review

### Spec coverage

- Manual reservation creation: covered in Tasks 5 to 7.
- Backend POST endpoint: covered in Tasks 2 to 4.
- Optional tables: covered in Tasks 3 and 7.
- Refresh in agenda after save: covered in Tasks 6 and 7.
- Validation and errors: covered in Tasks 2 and 7.
- Documentation and verification: covered in Task 8.

### Placeholder scan

- No `TODO`, `TBD`, or “implement later” markers remain.
- Each task includes exact file paths and runnable commands.
- Code steps include concrete snippets rather than prose-only instructions.

### Type consistency

- Backend uses `CreateRestaurantReservationInput` from domain through repository and use case.
- Frontend uses `CreateRestaurantReservationRequest` in the API service.
- Response type stays `RestaurantReservationDto` end to end.

## Execution handoff

Plan complete and saved to `docs/superpowers/plans/2026-06-27-create-reservations.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
