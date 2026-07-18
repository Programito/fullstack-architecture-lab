# Stable Restaurant POS Line Grouping Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show one stable row for equivalent pending direct products and make rapid quantity changes converge on one backend line without changing the mobile ordering flow.

**Architecture:** Extend the service-point order read contract with the configuration signature already persisted by the backend. Preserve that identity in the Angular mapper, group only safe direct lines, and route grouped quantity controls through the existing desired-quantity synchronization queue so duplicate backend rows are consolidated.

**Tech Stack:** NestJS 11, Prisma 7, Angular 21, RxJS, Vitest 4, Testing Library, Kotlin 2.3, kotlinx.serialization, JUnit/Gradle.

## Global Constraints

- Group only equivalent `pending` direct lines with the same POS product identity, configuration signature, unit price and status.
- Never group lines with notes, modifiers, combo selections, platter components or different kitchen states.
- Keep individual backend line IDs and kitchen history; do not merge rows during reads and do not add a database migration.
- Keep the mobile request contract unchanged; mobile must continue adding and submitting products as before.
- Preserve unrelated changes in the dirty worktree and stage only files named by each task.

---

## File Map

- `backend/src/restaurants/domain/service-floor.models.ts`: declares the service-point read model.
- `backend/src/restaurants/infrastructure/persistence/prisma-restaurant-read.repository.ts`: maps persisted order lines into the service-point read model.
- `backend/src/restaurants/infrastructure/demo-restaurant-read.repository.ts`: provides the equivalent demo read model.
- `backend/src/restaurants/presentation/rest/dto/service-point-order-response.dto.ts`: documents and serializes the additive REST field.
- `backend/src/restaurants/infrastructure/persistence/prisma-restaurant-read.repository.spec.ts`: proves the stored signature reaches the read contract.
- `frontend/src/app/features/restaurant-pos/api/restaurant-pos-api.models.ts`: types the additive response field.
- `frontend/src/app/features/restaurant-pos/api/restaurant-pos-api.mappers.ts`: preserves the stable signature and supplies a legacy fallback.
- `frontend/src/app/features/restaurant-pos/api/restaurant-pos-api.mappers.spec.ts`: proves stable and fallback identities.
- `frontend/src/app/features/restaurant-pos/components/service-table-panel/service-table-panel.ts`: defines grouped-row action identity.
- `frontend/src/app/features/restaurant-pos/components/service-table-panel/service-table-panel.html`: emits grouped actions using that identity.
- `frontend/src/app/features/restaurant-pos/components/service-table-panel/service-table-panel.spec.ts`: proves rendering and action routing.
- `frontend/src/app/features/restaurant-pos/state/order-write.service.spec.ts`: proves rapid desired quantities and duplicate consolidation.
- `frontend/src/app/features/restaurant-pos/state/order-write.service.ts`: only changes if the RED synchronization test identifies a remaining mismatch.
- `mobile/app/src/test/kotlin/com/mesaflow/client/core/data/CartRepositoryTest.kt`, `OrderMappersTest.kt`, and `OrderRepositoryTest.kt`: existing compatibility checks; no mobile production change is planned.

---

### Task 1: Expose the persisted configuration signature in the service-point order contract

**Files:**
- Modify: `backend/src/restaurants/infrastructure/persistence/prisma-restaurant-read.repository.spec.ts`
- Modify: `backend/src/restaurants/domain/service-floor.models.ts`
- Modify: `backend/src/restaurants/infrastructure/persistence/prisma-restaurant-read.repository.ts`
- Modify: `backend/src/restaurants/infrastructure/demo-restaurant-read.repository.ts`
- Modify: `backend/src/restaurants/presentation/rest/dto/service-point-order-response.dto.ts`

**Interfaces:**
- Consumes: Prisma `OrderLine.configurationSignature: string`.
- Produces: `ServicePointOrderLineView.configurationSignature: string` and the same required property in the REST response.

- [ ] **Step 1: Write the failing repository contract assertion**

Add `configurationSignature: 'rp-burger|'` to the mocked Prisma line used by `findServicePointOrderByRestaurantId`, then require the returned line to preserve it:

```ts
expect(order?.lines[0]).toEqual(
  expect.objectContaining({
    id: 'line-burger',
    configurationSignature: 'rp-burger|',
  }),
);
```

- [ ] **Step 2: Run the focused backend test and verify RED**

Run from `backend/`:

```powershell
pnpm test -- src/restaurants/infrastructure/persistence/prisma-restaurant-read.repository.spec.ts
```

Expected: FAIL because `configurationSignature` is absent from the service-point line returned by the repository.

- [ ] **Step 3: Add the field to the domain and Prisma mapping**

Insert this required property immediately after `id` in `ServicePointOrderLineView`:

```ts
configurationSignature: string;
```

Insert this property immediately after `id: line.id` in the `order.lines.map` result in `PrismaRestaurantReadRepository`:

```ts
configurationSignature: line.configurationSignature,
```

- [ ] **Step 4: Keep the demo implementation contract-compatible**

The demo line type does not expose the persisted signature. Add a stable adapter fallback based on the product identity, using the line ID only for legacy demo rows without either product ID. Insert it immediately after `id: line.id` in the demo `activeOrder.lines.map` result:

```ts
configurationSignature: line.restaurantProductId ?? line.productId ?? line.id,
```

- [ ] **Step 5: Expose the additive REST property**

Add the property to `ServicePointOrderLineResponseDto`:

```ts
@ApiProperty({ example: 'rp-wine|', description: 'Stable identity of the product configuration.' })
configurationSignature!: string;
```

`ServicePointOrderResponseDto.fromDomain()` already spreads each line, so no additional serializer branch is needed.

- [ ] **Step 6: Run focused and broad backend verification**

Run from `backend/`:

```powershell
pnpm test -- src/restaurants/infrastructure/persistence/prisma-restaurant-read.repository.spec.ts
pnpm test
pnpm build
```

Expected: focused test PASS, full backend suite PASS, Nest build PASS.

- [ ] **Step 7: Commit only Task 1 files**

After confirming no active Git process owns `.git/index.lock`:

```powershell
git add -- backend/src/restaurants/domain/service-floor.models.ts backend/src/restaurants/infrastructure/persistence/prisma-restaurant-read.repository.ts backend/src/restaurants/infrastructure/demo-restaurant-read.repository.ts backend/src/restaurants/presentation/rest/dto/service-point-order-response.dto.ts backend/src/restaurants/infrastructure/persistence/prisma-restaurant-read.repository.spec.ts
git commit -m "feat: expose service line configuration signature"
```

---

### Task 2: Preserve stable configuration identity in the Angular mapper

**Files:**
- Modify: `frontend/src/app/features/restaurant-pos/api/restaurant-pos-api.models.ts`
- Modify: `frontend/src/app/features/restaurant-pos/api/restaurant-pos-api.mappers.spec.ts`
- Modify: `frontend/src/app/features/restaurant-pos/api/restaurant-pos-api.mappers.ts`

**Interfaces:**
- Consumes: `ServicePointOrderLineDto.configurationSignature?: string`.
- Produces: `OrderLine.configurationSignature` from the backend, or `service-config:<stableProductId>` for legacy direct lines.

- [ ] **Step 1: Write mapper tests for the persisted signature and legacy fallback**

Extend the existing `mapServicePointOrder` fixture with:

```ts
configurationSignature: 'rp-lemonade-1|',
```

Assert the exact value is retained:

```ts
expect(order?.lines[0]?.configurationSignature).toBe('rp-lemonade-1|');
```

Add a second line with the same `restaurantProductId` but a different backend `id` and no signature, then assert both legacy lines receive the same fallback:

```ts
expect(order?.lines.map((line) => line.configurationSignature)).toEqual([
  'service-config:rp-lemonade-1',
  'service-config:rp-lemonade-1',
]);
```

- [ ] **Step 2: Run the focused frontend mapper test and verify RED**

Run from `frontend/`:

```powershell
pnpm exec ng test --watch=false --include src/app/features/restaurant-pos/api/restaurant-pos-api.mappers.spec.ts
```

Expected: FAIL because the mapper currently emits `service-line:<lineId>` and the DTO lacks the field.

- [ ] **Step 3: Type and map the additive field**

Insert the optional field immediately after `id` in `ServicePointOrderLineDto` for rolling compatibility:

```ts
configurationSignature?: string;
```

Replace the per-line synthetic signature:

```ts
const configurationSignature = line.configurationSignature ?? `service-config:${stableProductId}`;

configurationSignature,
```

The panel's existing safety predicates prevent configurable, combo, platter or noted legacy lines from being grouped by this direct-product fallback.

- [ ] **Step 4: Run focused mapper verification**

```powershell
pnpm exec ng test --watch=false --include src/app/features/restaurant-pos/api/restaurant-pos-api.mappers.spec.ts
```

Expected: all mapper specs PASS.

- [ ] **Step 5: Commit only Task 2 files**

```powershell
git add -- frontend/src/app/features/restaurant-pos/api/restaurant-pos-api.models.ts frontend/src/app/features/restaurant-pos/api/restaurant-pos-api.mappers.ts frontend/src/app/features/restaurant-pos/api/restaurant-pos-api.mappers.spec.ts
git commit -m "fix: preserve POS line configuration identity"
```

---

### Task 3: Route grouped quantity controls through product-level synchronization

**Files:**
- Modify: `frontend/src/app/features/restaurant-pos/components/service-table-panel/service-table-panel.ts`
- Modify: `frontend/src/app/features/restaurant-pos/components/service-table-panel/service-table-panel.html`
- Modify: `frontend/src/app/features/restaurant-pos/components/service-table-panel/service-table-panel.spec.ts`
- Modify: `frontend/src/app/features/restaurant-pos/state/order-write.service.spec.ts`
- Modify only if required by RED: `frontend/src/app/features/restaurant-pos/state/order-write.service.ts`

**Interfaces:**
- Consumes: grouped `OrderLine.productId` as the catalog identity for safe direct lines.
- Produces: `GroupedOrderLine.actionId`, emitted by `increaseProduct` and `decreaseProduct`.

- [ ] **Step 1: Write the panel interaction test**

Expand the existing duplicated wine test to render two pending lines with the same product, signature and price but different backend IDs. Subscribe to both outputs and click the visible grouped controls:

```ts
const increase = vi.fn();
const decrease = vi.fn();

const { fixture } = await render(ServiceTablePanel, {
  imports: [...i18n.imports],
  providers: [...i18n.providers],
  inputs: {
    serviceInfo: createServiceInfo(table, duplicatedOrder),
    title: 'Mesa 1',
    errorMessage: null,
  },
  on: {
    increaseProduct: increase,
    decreaseProduct: decrease,
  },
});

await userEvent.click(screen.getByRole('button', { name: 'Aumentar cantidad de Vino tinto copa' }));
await userEvent.click(screen.getByRole('button', { name: 'Reducir cantidad de Vino tinto copa' }));

expect(screen.getByText('2 x Vino tinto copa')).toBeTruthy();
expect(increase).toHaveBeenCalledWith('wine-glass');
expect(decrease).toHaveBeenCalledWith('wine-glass');
fixture.destroy();
```

Keep or add a separate assertion proving a configured/non-groupable line still emits its individual `line.id`.

- [ ] **Step 2: Run the panel test and verify RED**

```powershell
pnpm exec ng test --watch=false --include src/app/features/restaurant-pos/components/service-table-panel/service-table-panel.spec.ts
```

Expected: FAIL because grouped controls currently emit `primaryLine.id`.

- [ ] **Step 3: Add an explicit grouped action identity**

Extend the private view model:

```ts
type GroupedOrderLine = {
  key: string;
  actionId: string;
  quantity: number;
  subtotal: number;
  lines: readonly OrderLine[];
  primaryLine: OrderLine;
};
```

When creating a group, use the product identity only for lines accepted by `canGroupOrderLine`:

```ts
groupedLines.set(key, {
  key,
  actionId: this.canGroupOrderLine(line) ? line.productId : line.id,
  quantity: line.quantity,
  subtotal: line.subtotal,
  lines: [line],
  primaryLine: line,
});
```

Emit that target from both quantity buttons:

```html
(click)="decreaseProduct.emit(groupedLine.actionId)"
(click)="increaseProduct.emit(groupedLine.actionId)"
```

Keep removal routed through `requestRemoveProduct(primaryLine)`: the page already resolves a remote direct line and delegates removal by `ctx.line.productId`, which removes the whole pending group.

- [ ] **Step 4: Run the panel test and verify GREEN**

```powershell
pnpm exec ng test --watch=false --include src/app/features/restaurant-pos/components/service-table-panel/service-table-panel.spec.ts
```

Expected: panel specs PASS.

- [ ] **Step 5: Write the rapid-click synchronization regression test**

In `order-write.service.spec.ts`, create two equivalent remote lines whose quantities sum to the starting local quantity. Call `increaseDirectProductQuantity('product-1')` three times before the debounce and return a backend snapshot containing both duplicates. Assert the final operation targets the total desired quantity and deletes the duplicate:

```ts
service.increaseDirectProductQuantity('product-1');
service.increaseDirectProductQuantity('product-1');
service.increaseDirectProductQuantity('product-1');
vi.runAllTimers();

expect(mockUpdateRestaurantOrderLine).toHaveBeenCalledWith(
  'r-1',
  ORDER_ID,
  'line-backend-beer',
  { quantity: expectedDesiredQuantity },
);
expect(mockDeleteRestaurantOrderLine).toHaveBeenCalledWith(
  'r-1',
  ORDER_ID,
  'line-backend-beer-duplicate',
);
```

Derive `expectedDesiredQuantity` from the fixture's starting local total plus three; do not hardcode a value disconnected from the fixture.

- [ ] **Step 6: Run the synchronization test and verify its result**

```powershell
pnpm exec ng test --watch=false --include src/app/features/restaurant-pos/state/order-write.service.spec.ts
```

Expected: PASS if the existing desired-quantity queue already satisfies the scenario. If it fails, it must fail on aggregate quantity or duplicate cleanup, not on fixture setup.

- [ ] **Step 7: Make the minimal synchronization correction only if Step 6 is RED**

Keep matching based on either POS catalog identity or `restaurantProductId`, and calculate backend quantity as a sum:

```ts
const matchingLines = backendLines.filter((line) => this.matchesDirectProductLine(line, productId));
const backendQuantity = matchingLines.reduce((sum, line) => sum + line.quantity, 0);
```

Use the first matching line as primary, update it to the latest desired quantity, and delete every remaining matching line. Do not add a second queue or a template-only debounce.

- [ ] **Step 8: Run the combined focused frontend tests**

```powershell
pnpm exec ng test --watch=false --include src/app/features/restaurant-pos/api/restaurant-pos-api.mappers.spec.ts --include src/app/features/restaurant-pos/components/service-table-panel/service-table-panel.spec.ts --include src/app/features/restaurant-pos/state/order-write.service.spec.ts --include src/app/features/restaurant-pos/pages/restaurant-pos-service-page/restaurant-pos-service-page.spec.ts
```

Expected: all included specs PASS.

- [ ] **Step 9: Commit only Task 3 files**

```powershell
git add -- frontend/src/app/features/restaurant-pos/components/service-table-panel/service-table-panel.ts frontend/src/app/features/restaurant-pos/components/service-table-panel/service-table-panel.html frontend/src/app/features/restaurant-pos/components/service-table-panel/service-table-panel.spec.ts frontend/src/app/features/restaurant-pos/state/order-write.service.spec.ts frontend/src/app/features/restaurant-pos/state/order-write.service.ts
git commit -m "fix: stabilize grouped POS quantity controls"
```

If `order-write.service.ts` did not change, omit it from `git add`.

---

### Task 4: Verify mobile compatibility and complete cross-project quality checks

**Files:**
- Verify only: `mobile/app/src/test/kotlin/com/mesaflow/client/core/data/CartRepositoryTest.kt`
- Verify only: `mobile/app/src/test/kotlin/com/mesaflow/client/core/data/OrderMappersTest.kt`
- Verify only: `mobile/app/src/test/kotlin/com/mesaflow/client/core/data/OrderRepositoryTest.kt`
- Verify only: all backend and frontend files changed above.

**Interfaces:**
- Consumes: additive backend response field ignored by kotlinx.serialization.
- Produces: evidence that backend, POS frontend and mobile request flow remain compatible.

- [ ] **Step 1: Run focused mobile ordering tests**

Run from `mobile/` on Windows:

```powershell
.\gradlew.bat :app:testDebugUnitTest --tests "com.mesaflow.client.core.data.CartRepositoryTest" --tests "com.mesaflow.client.core.data.OrderMappersTest" --tests "com.mesaflow.client.core.data.OrderRepositoryTest"
```

Expected: BUILD SUCCESSFUL and all three classes PASS. No mobile production file should be modified.

- [ ] **Step 2: Run the complete frontend suite and build**

Run from `frontend/`:

```powershell
pnpm exec ng test --watch=false
pnpm build
```

Expected: full Angular/Vitest suite PASS and production build PASS. Record existing budget/CommonJS warnings separately; do not claim they were introduced by this change without a clean comparison.

- [ ] **Step 3: Run the complete backend suite and build again after frontend integration**

Run from `backend/`:

```powershell
pnpm test
pnpm build
```

Expected: full backend suite PASS and Nest build PASS.

- [ ] **Step 4: Inspect the final scoped diff**

From the repository root:

```powershell
git diff --check
git diff -- backend/src/restaurants/domain/service-floor.models.ts backend/src/restaurants/infrastructure/persistence/prisma-restaurant-read.repository.ts backend/src/restaurants/infrastructure/demo-restaurant-read.repository.ts backend/src/restaurants/presentation/rest/dto/service-point-order-response.dto.ts backend/src/restaurants/infrastructure/persistence/prisma-restaurant-read.repository.spec.ts frontend/src/app/features/restaurant-pos/api/restaurant-pos-api.models.ts frontend/src/app/features/restaurant-pos/api/restaurant-pos-api.mappers.ts frontend/src/app/features/restaurant-pos/api/restaurant-pos-api.mappers.spec.ts frontend/src/app/features/restaurant-pos/components/service-table-panel/service-table-panel.ts frontend/src/app/features/restaurant-pos/components/service-table-panel/service-table-panel.html frontend/src/app/features/restaurant-pos/components/service-table-panel/service-table-panel.spec.ts frontend/src/app/features/restaurant-pos/state/order-write.service.ts frontend/src/app/features/restaurant-pos/state/order-write.service.spec.ts
```

Expected: no whitespace errors and no unrelated files in the scoped implementation diff.

- [ ] **Step 5: Record final evidence**

Report:

```text
Backend focused/full/build: PASS with counts
Frontend focused/full/build: PASS with counts
Mobile ordering regression classes: PASS with counts
Production mobile changes: none
Known pre-existing warnings: list exact warnings
```

Do not state the issue is fixed unless the rapid-click regression test, full frontend suite, backend suite, both builds and focused mobile checks have fresh passing output.
