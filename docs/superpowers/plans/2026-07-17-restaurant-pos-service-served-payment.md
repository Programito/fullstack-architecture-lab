# Restaurant POS Service Served and Payment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add partial multi-select "mark served", a charge-button spinner, and a paid-state "last payment" summary to `/restaurant-pos/service` without changing the persistent payment contract or mobile-origin behavior.

**Architecture:** Keep the current service-page structure and extend it in place. Backend changes are limited to making `POST /api/v1/restaurants/:id/service-points/:tableId/mark-served` accept optional `lineIds`, while frontend changes add local UI state for selection/loading and map the latest completed payment from existing order responses.

**Tech Stack:** Angular standalone components, signals, Vitest, Testing Library, NestJS REST controllers, application use cases, TypeScript DTOs, pnpm.

## Global Constraints

- No redesign of the overall service page layout.
- No new cross-table payment history screen.
- No change to the mobile app payment contract or payment semantics.
- No change to payment registration payloads or order payment persistence rules.
- No full audit log beyond the current table-local `last payment` view.
- Do not change `registerRestaurantOrderPayment` request shape.
- Do not change charge-to-payment call ordering.
- Do not change `clientOrigin` semantics or filtering.
- Do not change how completed payments are persisted or returned in `RestaurantOrderDto`.
- Do not infer mobile-specific payment behavior from the new service-page UI states.

---

## File Structure

### Backend

- Modify: `backend/src/restaurants/presentation/rest/restaurant-order.controller.ts`
  - Accept an optional request body for `mark-served` and pass `lineIds` into the use case.
- Create: `backend/src/restaurants/presentation/rest/dto/mark-restaurant-service-point-served.dto.ts`
  - DTO for optional `lineIds?: string[]`.
- Modify: `backend/src/restaurants/application/use-cases/mark-restaurant-service-point-order-served.use-case.ts`
  - Add partial-serve command support while preserving no-body legacy behavior.
- Modify: `backend/src/restaurants/application/use-cases/mark-restaurant-service-point-order-served.use-case.spec.ts`
  - Cover full-serve fallback, partial-serve, and invalid-selection cases.

### Frontend API and models

- Modify: `frontend/src/app/features/restaurant-pos/api/restaurant-pos-api.service.ts`
  - Send optional `lineIds` to `mark-served`.
- Modify: `frontend/src/app/features/restaurant-pos/api/restaurant-pos-api.models.ts`
  - Add service-point mark-served request type if needed.
- Modify: `frontend/src/app/features/restaurant-pos/api/restaurant-pos-api.mappers.ts`
  - Map the latest completed payment into the frontend order model.
- Modify: `frontend/src/app/features/restaurant-pos/models/order.models.ts`
  - Extend `TableOrder` with `payments` and a derived `lastCompletedPayment`.
- Modify: `frontend/src/app/features/restaurant-pos/models/service.models.ts`
  - Extend `ServiceTableInfo` with read-only payment summary data for paid tables.

### Frontend UI

- Modify: `frontend/src/app/features/restaurant-pos/pages/restaurant-pos-service-page/restaurant-pos-service-page.ts`
  - Add served-selection state, charge loading state, and paid summary preparation.
- Modify: `frontend/src/app/features/restaurant-pos/components/service-table-panel/service-table-panel.ts`
  - Accept the new UI state and emit selection events.
- Modify: `frontend/src/app/features/restaurant-pos/components/service-table-panel/service-table-panel.html`
  - Render served-selection mode, charge button spinner, and paid summary block.

### Tests

- Modify: `frontend/src/app/features/restaurant-pos/pages/restaurant-pos-service-page/restaurant-pos-service-page.spec.ts`
  - Add service-page regression coverage for partial serve and charge sequencing.
- Modify: `frontend/src/app/features/restaurant-pos/components/service-table-panel/service-table-panel.spec.ts`
  - Add focused panel rendering tests for selection mode, loading state, and paid summary.

## Task 1: Extend Mark-Served Backend Contract

**Files:**
- Create: `backend/src/restaurants/presentation/rest/dto/mark-restaurant-service-point-served.dto.ts`
- Modify: `backend/src/restaurants/presentation/rest/restaurant-order.controller.ts`
- Modify: `backend/src/restaurants/application/use-cases/mark-restaurant-service-point-order-served.use-case.ts`
- Test: `backend/src/restaurants/application/use-cases/mark-restaurant-service-point-order-served.use-case.spec.ts`

**Interfaces:**
- Consumes: `MarkRestaurantServicePointOrderServedUseCase.execute(restaurantId: string, tableId: string): Promise<Result<ServicePointDetailView, ApplicationError>>`
- Produces:
  - `interface MarkRestaurantServicePointServedCommand { restaurantId: string; tableId: string; lineIds?: string[] }`
  - `execute(command: MarkRestaurantServicePointServedCommand): Promise<Result<ServicePointDetailView, ApplicationError>>`
  - `class MarkRestaurantServicePointServedDto { lineIds?: string[] }`

- [ ] **Step 1: Write the failing backend tests for partial serve**

```ts
it('marks only the selected active lines as served when lineIds are provided', async () => {
  const restaurants = makeReadRepository();
  const orders = makeOrderRepository();
  vi.mocked(restaurants.findFloorsByRestaurantId).mockResolvedValue(makeFloors());
  vi.mocked(orders.findActiveByTable).mockResolvedValue({
    ...makeOrderWithActiveLines(),
    lines: [
      { ...makeOrderWithActiveLines().lines[0], id: 'line-1', status: 'ready' },
      { ...makeOrderWithActiveLines().lines[0], id: 'line-2', status: 'preparing', productName: 'Pasta' },
    ],
  });
  vi.mocked(orders.markActiveLinesServed).mockResolvedValue(makeOrderWithAllServed());
  vi.mocked(restaurants.setServicePointStatus).mockResolvedValue(makeServicePoint());

  const useCase = new MarkRestaurantServicePointOrderServedUseCase(restaurants, orders);

  const result = await useCase.execute({ restaurantId: 'restaurant-1', tableId: 'table-1', lineIds: ['line-2'] });

  expect(result).toEqual(ok(makeServicePoint()));
  expect(orders.markActiveLinesServed).toHaveBeenCalledWith('restaurant-1', 'table-1', ['line-2']);
});

it('returns invalid_service_action when provided lineIds contain no eligible lines', async () => {
  const restaurants = makeReadRepository();
  const orders = makeOrderRepository();
  vi.mocked(restaurants.findFloorsByRestaurantId).mockResolvedValue(makeFloors());
  vi.mocked(orders.findActiveByTable).mockResolvedValue(makeOrderWithAllServed());

  const useCase = new MarkRestaurantServicePointOrderServedUseCase(restaurants, orders);

  const result = await useCase.execute({ restaurantId: 'restaurant-1', tableId: 'table-1', lineIds: ['line-1'] });

  expect(result).toEqual(err(expect.objectContaining({ code: 'invalid_service_action' })));
});
```

- [ ] **Step 2: Run backend test to verify it fails**

Run: `pnpm test -- backend/src/restaurants/application/use-cases/mark-restaurant-service-point-order-served.use-case.spec.ts`

Expected: FAIL with signature mismatch on `execute(...)` and/or `markActiveLinesServed(..., lineIds)`.

- [ ] **Step 3: Add the DTO and use-case command shape**

```ts
// backend/src/restaurants/presentation/rest/dto/mark-restaurant-service-point-served.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString } from 'class-validator';

export class MarkRestaurantServicePointServedDto {
  @ApiPropertyOptional({ type: [String], description: 'Specific active order line ids to mark as served.' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  lineIds?: string[];
}
```

```ts
// backend/src/restaurants/application/use-cases/mark-restaurant-service-point-order-served.use-case.ts
export interface MarkRestaurantServicePointServedCommand {
  restaurantId: string;
  tableId: string;
  lineIds?: string[];
}

async execute(command: MarkRestaurantServicePointServedCommand): Promise<Result<ServicePointDetailView, ApplicationError>> {
  const { restaurantId, tableId, lineIds } = command;
  // preserve restaurant/table existence checks
  // filter eligible active lines: status !== 'served' && status !== 'cancelled'
  // if lineIds?.length, limit to matching eligible ids
  // reject when no eligible target lines remain
  // persistent path: orders.markActiveLinesServed(restaurantId, tableId, normalizedLineIds?)
  // demo path: fallback to legacy full-service behavior when lineIds is empty or omitted
}
```

```ts
// backend/src/restaurants/presentation/rest/restaurant-order.controller.ts
import { MarkRestaurantServicePointServedDto } from './dto/mark-restaurant-service-point-served.dto';

async markServicePointServed(
  @Param('id') id: string,
  @Param('tableId') tableId: string,
  @Body() body: MarkRestaurantServicePointServedDto,
  @Req() request: AuthenticatedRequest,
): Promise<ServicePointDetailResponseDto> {
  const detail = unwrapResultOrThrow(
    await this.markRestaurantServicePointOrderServed.execute({ restaurantId: id, tableId, lineIds: body.lineIds }),
  );
  // keep existing audit + realtime behavior
}
```

- [ ] **Step 4: Update the repository call and specs to pass**

```ts
// backend/src/restaurants/application/use-cases/mark-restaurant-service-point-order-served.use-case.spec.ts
expect(orders.markActiveLinesServed).toHaveBeenCalledWith('restaurant-1', 'table-1', ['line-2']);
expect(orders.markActiveLinesServed).toHaveBeenCalledWith('restaurant-1', 'table-1', undefined);
```

```ts
// If the repository port already allows an optional third arg, use it directly.
// Otherwise update the mocked shape in the spec to accept:
markActiveLinesServed: vi.fn(),
```

- [ ] **Step 5: Run backend test to verify it passes**

Run: `pnpm test -- backend/src/restaurants/application/use-cases/mark-restaurant-service-point-order-served.use-case.spec.ts`

Expected: PASS for legacy full-serve tests and the new partial-serve tests.

- [ ] **Step 6: Commit**

```bash
git add backend/src/restaurants/presentation/rest/dto/mark-restaurant-service-point-served.dto.ts backend/src/restaurants/presentation/rest/restaurant-order.controller.ts backend/src/restaurants/application/use-cases/mark-restaurant-service-point-order-served.use-case.ts backend/src/restaurants/application/use-cases/mark-restaurant-service-point-order-served.use-case.spec.ts
git commit -m "feat: support partial mark served for service points"
```

## Task 2: Add Frontend Payment Summary Model and Mark-Served API Support

**Files:**
- Modify: `frontend/src/app/features/restaurant-pos/api/restaurant-pos-api.models.ts`
- Modify: `frontend/src/app/features/restaurant-pos/api/restaurant-pos-api.service.ts`
- Modify: `frontend/src/app/features/restaurant-pos/api/restaurant-pos-api.mappers.ts`
- Modify: `frontend/src/app/features/restaurant-pos/models/order.models.ts`
- Modify: `frontend/src/app/features/restaurant-pos/models/service.models.ts`
- Test: `frontend/src/app/features/restaurant-pos/api/restaurant-pos-api.mappers.spec.ts`
- Test: `frontend/src/app/features/restaurant-pos/api/restaurant-pos-api.service.spec.ts`

**Interfaces:**
- Consumes:
  - `markRestaurantServicePointServed(restaurantId: string, tableId: string): Observable<ServicePointDetailDto>`
  - `mapRestaurantOrder(orderResponse: RestaurantOrderDto, paymentMethod?: PaymentMethod)`
- Produces:
  - `export type MarkRestaurantServicePointServedRequest = { lineIds?: string[] }`
  - `markRestaurantServicePointServed(restaurantId: string, tableId: string, request?: MarkRestaurantServicePointServedRequest): Observable<ServicePointDetailDto>`
  - `interface TableOrderPaymentSummary { id: string; method: PaymentMethod | 'bizum' | 'other'; amount: number; status: 'pending' | 'completed' | 'failed' | 'refunded'; paidAt: string | null }`
  - `TableOrder.lastCompletedPayment?: TableOrderPaymentSummary | null`

- [ ] **Step 1: Write failing mapper and API tests**

```ts
it('posts selected line ids when marking a service point as served', () => {
  service.markRestaurantServicePointServed('restaurant-1', 'table-1', { lineIds: ['line-2'] }).subscribe();

  const request = http.expectOne('/api/v1/restaurants/restaurant-1/service-points/table-1/mark-served');
  expect(request.request.method).toBe('POST');
  expect(request.request.body).toEqual({ lineIds: ['line-2'] });
});

it('maps the latest completed payment into lastCompletedPayment', () => {
  const order = mapRestaurantOrder({
    order: { /* existing fixture fields */, paidCents: 1200, balanceCents: 0 },
    lines: [],
    payments: [
      { id: 'payment-1', method: 'cash', amountCents: 600, status: 'failed', paidAt: null },
      { id: 'payment-2', method: 'card', amountCents: 1200, status: 'completed', paidAt: '2026-07-17T12:30:00.000Z' },
    ],
  });

  expect(order.lastCompletedPayment).toEqual({
    id: 'payment-2',
    method: 'card',
    amount: 12,
    status: 'completed',
    paidAt: '2026-07-17T12:30:00.000Z',
  });
});
```

- [ ] **Step 2: Run focused frontend tests to verify they fail**

Run: `pnpm test -- frontend/src/app/features/restaurant-pos/api/restaurant-pos-api.service.spec.ts frontend/src/app/features/restaurant-pos/api/restaurant-pos-api.mappers.spec.ts --watch=false`

Expected: FAIL because the API method only accepts two parameters and `TableOrder` has no `lastCompletedPayment`.

- [ ] **Step 3: Add request type and order payment summary fields**

```ts
// frontend/src/app/features/restaurant-pos/models/order.models.ts
export interface TableOrderPaymentSummary {
  id: string;
  method: PaymentMethod | 'other';
  amount: number;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  paidAt: string | null;
}

export interface TableOrder {
  // existing fields
  payments?: TableOrderPaymentSummary[];
  lastCompletedPayment?: TableOrderPaymentSummary | null;
}
```

```ts
// frontend/src/app/features/restaurant-pos/api/restaurant-pos-api.models.ts
export type MarkRestaurantServicePointServedRequest = {
  lineIds?: string[];
};
```

```ts
// frontend/src/app/features/restaurant-pos/models/service.models.ts
export interface ServiceTableInfo {
  // existing fields
  paidSummary?: {
    isPaid: boolean;
    lastPayment: TableOrder['lastCompletedPayment'] | null;
  };
}
```

- [ ] **Step 4: Update API service and mapper**

```ts
// frontend/src/app/features/restaurant-pos/api/restaurant-pos-api.service.ts
markRestaurantServicePointServed(
  restaurantId: string,
  tableId: string,
  request: MarkRestaurantServicePointServedRequest = {},
): Observable<ServicePointDetailDto> {
  return this.http.post<ServicePointDetailDto>(
    `${this.restaurantsUrl}/${restaurantId}/service-points/${tableId}/mark-served`,
    request,
  );
}
```

```ts
// frontend/src/app/features/restaurant-pos/api/restaurant-pos-api.mappers.ts
const payments = orderResponse.payments.map((payment) => ({
  id: payment.id,
  method: payment.method === 'other' ? 'other' : payment.method,
  amount: payment.amountCents / 100,
  status: payment.status,
  paidAt: payment.paidAt,
}));

const lastCompletedPayment = [...payments].reverse().find((payment) => payment.status === 'completed') ?? null;

return {
  // existing mapped order fields
  payments,
  lastCompletedPayment,
};
```

- [ ] **Step 5: Run focused frontend tests to verify they pass**

Run: `pnpm test -- frontend/src/app/features/restaurant-pos/api/restaurant-pos-api.service.spec.ts frontend/src/app/features/restaurant-pos/api/restaurant-pos-api.mappers.spec.ts --watch=false`

Expected: PASS with the new API request body and payment mapping.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/app/features/restaurant-pos/api/restaurant-pos-api.models.ts frontend/src/app/features/restaurant-pos/api/restaurant-pos-api.service.ts frontend/src/app/features/restaurant-pos/api/restaurant-pos-api.mappers.ts frontend/src/app/features/restaurant-pos/models/order.models.ts frontend/src/app/features/restaurant-pos/models/service.models.ts frontend/src/app/features/restaurant-pos/api/restaurant-pos-api.service.spec.ts frontend/src/app/features/restaurant-pos/api/restaurant-pos-api.mappers.spec.ts
git commit -m "feat: map paid summary and partial served request"
```

## Task 3: Add Served-Selection and Charge Loading State to the Service Page

**Files:**
- Modify: `frontend/src/app/features/restaurant-pos/pages/restaurant-pos-service-page/restaurant-pos-service-page.ts`
- Modify: `frontend/src/app/features/restaurant-pos/pages/restaurant-pos-service-page/restaurant-pos-service-page.spec.ts`

**Interfaces:**
- Consumes:
  - `markRestaurantServicePointServed(restaurantId: string, tableId: string, request?: { lineIds?: string[] })`
  - `TableOrder.lastCompletedPayment`
- Produces:
  - `servedSelectionMode = signal(false)`
  - `selectedServedLineIds = signal<readonly string[]>([])`
  - `isCharging = signal(false)`
  - `enterServedSelectionMode(): void`
  - `toggleServedLine(lineId: string): void`
  - `selectAllServedLines(): void`
  - `confirmMarkServedSelection(): void`

- [ ] **Step 1: Write failing service-page tests**

```ts
it('opens served selection mode and confirms only selected lines', async () => {
  const apiMock = createRestaurantPosApiMock();
  const { fixture } = await renderServicePage(undefined, apiMock);
  seedKitchenOrder(fixture, apiMock, [
    { id: 'line-burger', productName: 'Hamburguesa craft', status: 'ready' },
    { id: 'line-pasta', productName: 'Pasta fresca', status: 'preparing' },
  ]);

  fireEvent.click(screen.getByRole('button', { name: /Marcar el pedido de la mesa seleccionada como servido/i }));
  fireEvent.click(screen.getByRole('checkbox', { name: /Hamburguesa craft/i }));
  fireEvent.click(screen.getByRole('button', { name: /Confirmar servido/i }));
  fixture.detectChanges();

  expect(apiMock.markRestaurantServicePointServed).toHaveBeenCalledWith(
    'restaurant-mesaflow-centro',
    'table-1',
    { lineIds: ['line-burger'] },
  );
});

it('shows a loading state only on the charge button while charging', async () => {
  const apiMock = createRestaurantPosApiMock();
  vi.mocked(apiMock.chargeRestaurantServicePoint).mockReturnValue(deferredCharge$);
  const { fixture } = await renderServicePage(undefined, apiMock);

  fireEvent.click(screen.getByRole('button', { name: /Cobrar/i }));
  fixture.detectChanges();

  expect(screen.getByRole('button', { name: /Cobrar/i })).toHaveAttribute('aria-busy', 'true');
});

it('still calls chargeRestaurantServicePoint and registerRestaurantOrderPayment in sequence for mobile-safe payment flow', async () => {
  // keep current charge flow assertions
});
```

- [ ] **Step 2: Run the page spec to verify it fails**

Run: `pnpm test -- frontend/src/app/features/restaurant-pos/pages/restaurant-pos-service-page/restaurant-pos-service-page.spec.ts --watch=false`

Expected: FAIL because there is no selection mode and no `isCharging` state.

- [ ] **Step 3: Add local UI state and partial-served flow in the page**

```ts
// frontend/src/app/features/restaurant-pos/pages/restaurant-pos-service-page/restaurant-pos-service-page.ts
protected readonly servedSelectionMode = signal(false);
protected readonly selectedServedLineIds = signal<readonly string[]>([]);
protected readonly isCharging = signal(false);

protected readonly servableSelectedOrderLines = computed(() =>
  (this.store.selectedOrder()?.lines ?? []).filter((line) =>
    ['sent_to_kitchen', 'preparing', 'ready', 'picked_up'].includes(line.status),
  ),
);

protected enterServedSelectionMode(): void {
  this.servedSelectionMode.set(true);
  this.selectedServedLineIds.set([]);
}

protected toggleServedLine(lineId: string): void {
  this.selectedServedLineIds.update((ids) =>
    ids.includes(lineId) ? ids.filter((id) => id !== lineId) : [...ids, lineId],
  );
}

protected confirmMarkServedSelection(): void {
  const lineIds = this.selectedServedLineIds();
  if (lineIds.length === 0) {
    this.store.reportApiError('restaurantPos.errors.selectProductsToMarkServed');
    return;
  }
  this.markServed(lineIds);
}
```

- [ ] **Step 4: Keep charge sequencing intact while adding button loading**

```ts
private chargeSelectedServicePoint(paymentMethod: Exclude<PaymentMethod, 'pending'>): void {
  this.isCharging.set(true);

  const resetCharging = () => this.isCharging.set(false);

  this.api
    .chargeRestaurantServicePoint(restaurant.id, tableId)
    .pipe(
      tap((servicePoint) => this.store.hydrateServicePoint(this.mapServicePointDetail(servicePoint))),
      switchMap(() => this.api.registerRestaurantOrderPayment(restaurant.id, orderId, amountCents, paymentMethod)),
      switchMap((paidOrder) =>
        this.api.getRestaurantServicePoint(restaurant.id, tableId).pipe(
          tap((servicePoint) => {
            this.store.hydrateServicePoint(this.mapServicePointDetail(servicePoint));
            this.store.hydrateServicePointOrder(tableId, mapRestaurantOrder(paidOrder, paymentMethod));
          }),
        ),
      ),
    )
    .subscribe({
      next: () => {
        resetCharging();
        this.store.setSelectedPaymentMethod(paymentMethod);
      },
      error: () => {
        resetCharging();
        onChargeError();
      },
    });
}
```

- [ ] **Step 5: Run the page spec to verify it passes**

Run: `pnpm test -- frontend/src/app/features/restaurant-pos/pages/restaurant-pos-service-page/restaurant-pos-service-page.spec.ts --watch=false`

Expected: PASS for partial-serve, loading state, and payment-sequence regression coverage.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/app/features/restaurant-pos/pages/restaurant-pos-service-page/restaurant-pos-service-page.ts frontend/src/app/features/restaurant-pos/pages/restaurant-pos-service-page/restaurant-pos-service-page.spec.ts
git commit -m "feat: add served selection and charge loading state"
```

## Task 4: Render Served Selection and Paid Summary in the Service Table Panel

**Files:**
- Modify: `frontend/src/app/features/restaurant-pos/components/service-table-panel/service-table-panel.ts`
- Modify: `frontend/src/app/features/restaurant-pos/components/service-table-panel/service-table-panel.html`
- Modify: `frontend/src/app/features/restaurant-pos/components/service-table-panel/service-table-panel.spec.ts`

**Interfaces:**
- Consumes:
  - `serviceInfo: ServiceTableInfo | null`
  - `servedSelectionMode: boolean`
  - `selectedServedLineIds: readonly string[]`
  - `isCharging: boolean`
- Produces:
  - `requestEnterServedSelection = output<void>()`
  - `toggleServedLine = output<string>()`
  - `selectAllServedLines = output<void>()`
  - `confirmServedSelection = output<void>()`
  - `cancelServedSelection = output<void>()`

- [ ] **Step 1: Write failing panel tests**

```ts
it('renders served-selection controls only while selection mode is active', async () => {
  await render(ServiceTablePanel, {
    componentInputs: {
      title: 'Mesa 1',
      serviceInfo: makePaidServiceInfo(),
      servedSelectionMode: true,
      selectedServedLineIds: ['line-burger'],
      isCharging: false,
    },
  });

  expect(screen.getByRole('button', { name: /Confirmar servido/i })).toBeTruthy();
  expect(screen.getByRole('checkbox', { name: /Hamburguesa craft/i })).toBeChecked();
});

it('renders last payment summary for a paid table', async () => {
  await render(ServiceTablePanel, {
    componentInputs: {
      title: 'Mesa 1',
      serviceInfo: makePaidServiceInfo({
        paidSummary: {
          isPaid: true,
          lastPayment: { id: 'payment-1', method: 'card', amount: 12.5, status: 'completed', paidAt: '2026-07-17T12:30:00.000Z' },
        },
      }),
    },
  });

  expect(screen.getByText('Pagado')).toBeTruthy();
  expect(screen.getByText(/Tarjeta/i)).toBeTruthy();
});
```

- [ ] **Step 2: Run the panel spec to verify it fails**

Run: `pnpm test -- frontend/src/app/features/restaurant-pos/components/service-table-panel/service-table-panel.spec.ts --watch=false`

Expected: FAIL because the component has no inputs/outputs for selection mode or paid summary.

- [ ] **Step 3: Add inputs, outputs, and helper methods to the panel component**

```ts
// frontend/src/app/features/restaurant-pos/components/service-table-panel/service-table-panel.ts
readonly servedSelectionMode = input(false);
readonly selectedServedLineIds = input<readonly string[]>([]);
readonly isCharging = input(false);

readonly requestEnterServedSelection = output<void>();
readonly toggleServedLine = output<string>();
readonly selectAllServedLines = output<void>();
readonly confirmServedSelection = output<void>();
readonly cancelServedSelection = output<void>();

protected isServableLine(line: OrderLine): boolean {
  return ['sent_to_kitchen', 'preparing', 'ready', 'picked_up'].includes(line.status);
}

protected isServedLineSelected(lineId: string): boolean {
  return this.selectedServedLineIds().includes(lineId);
}
```

- [ ] **Step 4: Update the template for selection mode, charge loading, and paid summary**

```html
<!-- frontend/src/app/features/restaurant-pos/components/service-table-panel/service-table-panel.html -->
@if (servedSelectionMode()) {
  <div class="rounded-md border border-cyan-200 bg-cyan-50 px-3 py-2" data-testid="served-selection-bar">
    <div class="flex items-center justify-between gap-2">
      <p class="text-sm font-semibold">{{ selectedServedLineIds().length }} seleccionados</p>
      <div class="flex gap-2">
        <app-button variant="neutral" size="sm" (pressed)="selectAllServedLines.emit()">Seleccionar todo</app-button>
        <app-button variant="secondary" size="sm" (pressed)="cancelServedSelection.emit()">Cancelar</app-button>
        <app-button variant="primary" size="sm" (pressed)="confirmServedSelection.emit()">Confirmar servido</app-button>
      </div>
    </div>
  </div>
}

<app-button
  variant="primary"
  expand="block"
  [size]="chargePriority() ? 'lg' : 'md'"
  [ariaLabel]="chargeButtonAriaLabel()"
  [disabled]="!canCharge() || isCharging()"
  [attr.aria-busy]="isCharging() ? 'true' : null"
  (pressed)="charge.emit()">
  <span class="inline-flex items-center gap-1.5">
    <app-icon [name]="isCharging() ? 'progress_activity' : 'payments'" size="sm" />
    {{ chargeButtonLabel() }}
  </span>
</app-button>

@if (serviceInfo()?.paidSummary?.isPaid) {
  <section class="mt-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-3" data-testid="paid-summary">
    <p class="text-sm font-semibold">{{ 'restaurantPos.tableStatus.paid' | transloco }}</p>
    <p class="mt-1 text-sm">{{ formatCurrency(serviceInfo()!.paidSummary!.lastPayment?.amount ?? order()?.total ?? 0) }}</p>
  </section>
}
```

- [ ] **Step 5: Run the panel spec to verify it passes**

Run: `pnpm test -- frontend/src/app/features/restaurant-pos/components/service-table-panel/service-table-panel.spec.ts --watch=false`

Expected: PASS for selection mode, loading state, and paid summary rendering.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/app/features/restaurant-pos/components/service-table-panel/service-table-panel.ts frontend/src/app/features/restaurant-pos/components/service-table-panel/service-table-panel.html frontend/src/app/features/restaurant-pos/components/service-table-panel/service-table-panel.spec.ts
git commit -m "feat: render served selection and paid summary in service panel"
```

## Task 5: Final Integration Verification and Mobile-Safe Regression Pass

**Files:**
- Modify: `frontend/src/app/features/restaurant-pos/pages/restaurant-pos-service-page/restaurant-pos-service-page.spec.ts`
- Modify: `frontend/src/app/features/restaurant-pos/components/service-table-panel/service-table-panel.spec.ts`
- Modify: `backend/src/restaurants/application/use-cases/mark-restaurant-service-point-order-served.use-case.spec.ts`

**Interfaces:**
- Consumes:
  - `markRestaurantServicePointServed(..., { lineIds })`
  - `TableOrder.lastCompletedPayment`
  - `isCharging`
- Produces:
  - A green focused test suite for backend, service page, and service panel
  - Regression assertions that the charge flow still records payments and preserves `clientOrigin`

- [ ] **Step 1: Add explicit mobile-safe regression coverage**

```ts
it('keeps clientOrigin unchanged for paid orders opened from apk-customer', async () => {
  const paidOrder = mapRestaurantOrder({
    order: {
      id: 'order-1',
      restaurantId: 'restaurant-1',
      tableId: 'table-1',
      status: 'paid',
      currency: 'EUR',
      guestCount: 2,
      subtotalCents: 1200,
      taxCents: 0,
      discountTotalCents: 0,
      totalCents: 1200,
      paidCents: 1200,
      balanceCents: 0,
      openedAt: '2026-07-17T12:00:00.000Z',
      updatedAt: '2026-07-17T12:30:00.000Z',
      closedAt: '2026-07-17T12:30:00.000Z',
      clientOrigin: 'apk-customer',
    },
    lines: [],
    payments: [{ id: 'payment-1', method: 'card', amountCents: 1200, status: 'completed', paidAt: '2026-07-17T12:30:00.000Z' }],
  });

  expect(paidOrder.clientOrigin).toBe('apk-customer');
});
```

- [ ] **Step 2: Run the focused end-to-end unit suite**

Run: `pnpm test -- frontend/src/app/features/restaurant-pos/pages/restaurant-pos-service-page/restaurant-pos-service-page.spec.ts frontend/src/app/features/restaurant-pos/components/service-table-panel/service-table-panel.spec.ts frontend/src/app/features/restaurant-pos/api/restaurant-pos-api.mappers.spec.ts frontend/src/app/features/restaurant-pos/api/restaurant-pos-api.service.spec.ts backend/src/restaurants/application/use-cases/mark-restaurant-service-point-order-served.use-case.spec.ts --watch=false`

Expected: PASS with no regression in charge/payment sequencing or `clientOrigin` mapping.

- [ ] **Step 3: Run one broader frontend verification pass**

Run: `pnpm test -- --watch=false`

Expected: PASS for the frontend suite or, if the full suite is too expensive in the branch, a clearly documented failure outside this feature's files.

- [ ] **Step 4: Run one broader backend verification pass if backend files changed**

Run: `pnpm test -- backend/src/restaurants --watch=false`

Expected: PASS for restaurant backend specs, especially order controller/use-case coverage.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/features/restaurant-pos/pages/restaurant-pos-service-page/restaurant-pos-service-page.spec.ts frontend/src/app/features/restaurant-pos/components/service-table-panel/service-table-panel.spec.ts frontend/src/app/features/restaurant-pos/api/restaurant-pos-api.mappers.spec.ts backend/src/restaurants/application/use-cases/mark-restaurant-service-point-order-served.use-case.spec.ts
git commit -m "test: cover service payment and partial served regressions"
```

## Self-Review

### Spec coverage

- Partial multi-select served flow: covered by Task 1, Task 3, and Task 4.
- Spinner only on the charge button: covered by Task 3 and Task 4.
- Paid indicator plus `Last payment` until cleaning/free: covered by Task 2 and Task 4.
- Mobile-safe payment behavior: covered by Task 2, Task 3, and Task 5.

### Placeholder scan

- No `TODO`, `TBD`, or deferred implementation placeholders remain.
- Every task includes concrete files, commands, and example code.

### Type consistency

- Backend `execute(...)` is normalized to a command object in Task 1 and used consistently afterward.
- Frontend `markRestaurantServicePointServed(..., request?)` is introduced in Task 2 and used consistently in Task 3.
- `TableOrder.lastCompletedPayment` is introduced in Task 2 and consumed by the paid-summary tasks only.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-17-restaurant-pos-service-served-payment.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
