# Restaurant POS Product Images and Delete Confirmation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mostrar imágenes con skeleton en el pedido y el buscador, y confirmar el borrado completo de grupos con más de una unidad sin romper el flujo phone.

**Architecture:** El backend añade `imageUrl` de forma aditiva a las vistas de línea consultando `RestaurantProduct.imageUrl`, sin migración. El frontend conserva la URL en `OrderLineProductSnapshot` y la representa mediante un componente feature-local reutilizable que encapsula `loading`, `load`, `error` y fallback. El panel decide la confirmación usando la cantidad del grupo visual, pero sigue emitiendo el ID primario para reutilizar la cola de eliminación segura existente.

**Tech Stack:** Angular signals, Angular templates, Tailwind, Transloco, Testing Library/Vitest, NestJS, Prisma, Swagger DTOs, pnpm.

## Global Constraints

- `−` reduce una unidad; `Eliminar` borra el grupo completo.
- Una línea pendiente con una unidad se elimina directamente.
- Una línea pendiente con más de una unidad abre confirmación.
- Una línea no pendiente conserva la confirmación existente.
- No se crea migración ni snapshot persistente de imagen.
- Las respuestas sin `imageUrl` siguen siendo válidas y muestran fallback.
- Los textos visibles se mantienen en `es`, `en` y `ca`.
- El layout phone no tendrá scroll horizontal ni controles recortados.
- No se revierten ni se incluyen en commits cambios previos del usuario.

---

### Task 1: Contrato backend de imagen de línea

**Files:**
- Modify: `backend/src/restaurants/domain/restaurant-order.models.ts`
- Modify: `backend/src/restaurants/domain/service-floor.models.ts`
- Modify: `backend/src/restaurants/infrastructure/persistence/prisma-restaurant-order.repository.ts`
- Modify: `backend/src/restaurants/infrastructure/persistence/prisma-restaurant-read.repository.ts`
- Modify: `backend/src/restaurants/infrastructure/demo-restaurant-read.repository.ts`
- Modify: `backend/src/restaurants/presentation/rest/dto/restaurant-order-response.dto.ts`
- Modify: `backend/src/restaurants/presentation/rest/dto/service-point-order-response.dto.ts`
- Test: `backend/src/restaurants/infrastructure/persistence/prisma-restaurant-order.repository.spec.ts`
- Test: `backend/src/restaurants/infrastructure/persistence/prisma-restaurant-read.repository.spec.ts`

**Interfaces:**
- Produces: `RestaurantOrderLineView.imageUrl: string | null`.
- Produces: `ServicePointOrderLineView.imageUrl: string | null`.
- Produces: REST `imageUrl: string | null` in persistent order and service-point order lines.

- [ ] **Step 1: Write failing repository mapping tests**

Extend the raw Prisma fixtures with:

```ts
restaurantProduct: {
  product: { imageUrl: 'https://cdn.example.test/wine.jpg' },
},
```

Assert both read paths return:

```ts
expect(result?.lines[0]).toEqual(
  expect.objectContaining({ imageUrl: 'https://cdn.example.test/wine.jpg' }),
);
```

Also cover a deleted/unlinked product:

```ts
restaurantProduct: null,
// expected
imageUrl: null,
```

- [ ] **Step 2: Run tests and verify RED**

Run from `backend/`:

```powershell
pnpm test -- src/restaurants/infrastructure/persistence/prisma-restaurant-order.repository.spec.ts src/restaurants/infrastructure/persistence/prisma-restaurant-read.repository.spec.ts
```

Expected: FAIL because `imageUrl` is absent from mapped lines.

- [ ] **Step 3: Add the additive domain and Prisma mapping**

Add to both line view types:

```ts
imageUrl: string | null;
```

Extend the Prisma line relation:

```ts
restaurantProduct: { select: { imageUrl: true } },
```

Represent it in raw types:

```ts
restaurantProduct: { imageUrl: string | null } | null;
```

Map it without assertions:

```ts
imageUrl: line.restaurantProduct?.imageUrl ?? null,
```

In the demo adapter, prepare the current menu items before mapping the order:

```ts
const menuItems = (new Map(this.menus).get(restaurantId)?.sections ?? [])
  .flatMap((section) => section.items);
```

Then resolve each line with the same sale-product identity used by the POS:

```ts
imageUrl:
  menuItems.find(
    (item) =>
      (item.restaurantProductId ?? item.productId ?? item.id) ===
      (line.restaurantProductId ?? line.productId),
  )?.imageUrl ?? null,
```

- [ ] **Step 4: Expose the field in both Swagger DTOs**

Add:

```ts
@ApiPropertyOptional({ nullable: true, example: 'https://cdn.example.test/wine.jpg' })
imageUrl!: string | null;
```

`RestaurantOrderLineResponseDto.fromDomain` must preserve `imageUrl` through its existing `Object.assign` mapping.

- [ ] **Step 5: Run focused tests and backend build**

```powershell
pnpm test -- src/restaurants/infrastructure/persistence/prisma-restaurant-order.repository.spec.ts src/restaurants/infrastructure/persistence/prisma-restaurant-read.repository.spec.ts
pnpm build
```

Expected: affected specs PASS; Prisma generation and Nest build exit `0`.

- [ ] **Step 6: Commit only if the touched hunks are isolated from pre-existing user edits**

```powershell
git diff --check -- backend/src/restaurants/domain/restaurant-order.models.ts backend/src/restaurants/domain/service-floor.models.ts backend/src/restaurants/infrastructure/persistence/prisma-restaurant-order.repository.ts backend/src/restaurants/infrastructure/persistence/prisma-restaurant-read.repository.ts backend/src/restaurants/infrastructure/demo-restaurant-read.repository.ts backend/src/restaurants/presentation/rest/dto/restaurant-order-response.dto.ts backend/src/restaurants/presentation/rest/dto/service-point-order-response.dto.ts
```

If any file contains inseparable pre-existing edits, leave the task uncommitted and record that fact. Otherwise stage exactly the listed files and commit `feat: expose order product images`.

---

### Task 2: Propagación frontend de `imageUrl`

**Files:**
- Modify: `frontend/src/app/features/restaurant-pos/api/restaurant-pos-api.models.ts`
- Modify: `frontend/src/app/features/restaurant-pos/api/restaurant-pos-api.mappers.ts`
- Modify: `frontend/src/app/features/restaurant-pos/api/restaurant-pos-api.mappers.spec.ts`
- Modify: `frontend/src/app/features/restaurant-pos/models/order.models.ts`
- Modify: `frontend/src/app/features/restaurant-pos/state/restaurant-order.store.ts`
- Modify: `frontend/src/app/features/restaurant-pos/state/restaurant-pos.store.spec.ts`

**Interfaces:**
- Consumes: backend line `imageUrl?: string | null` for legacy compatibility.
- Produces: `OrderLineProductSnapshot.imageUrl?: string`.

- [ ] **Step 1: Write failing mapper and local snapshot tests**

Add an API fixture line with `imageUrl: 'https://cdn.example.test/wine.jpg'` and assert:

```ts
expect(mapped.lines[0]?.productSnapshot.imageUrl).toBe(
  'https://cdn.example.test/wine.jpg',
);
```

Create a local product containing the same URL, add it to a table, and assert the resulting line snapshot preserves it. Add a legacy DTO case without `imageUrl` and assert the property remains absent.

- [ ] **Step 2: Run tests and verify RED**

```powershell
pnpm exec ng test --watch=false --include src/app/features/restaurant-pos/api/restaurant-pos-api.mappers.spec.ts --include src/app/features/restaurant-pos/state/restaurant-pos.store.spec.ts
```

Expected: FAIL because the snapshot type and mapper do not preserve the URL.

- [ ] **Step 3: Implement the optional frontend contract**

Add to DTO line types:

```ts
imageUrl?: string | null;
```

Add to `OrderLineProductSnapshot`:

```ts
imageUrl?: string;
```

In both remote mappers and `createProductSnapshot`, use conditional spreads:

```ts
...(line.imageUrl ? { imageUrl: line.imageUrl } : {}),
```

```ts
...(product.imageUrl ? { imageUrl: product.imageUrl } : {}),
```

- [ ] **Step 4: Run focused tests and verify GREEN**

Run the command from Step 2. Expected: both specs PASS.

- [ ] **Step 5: Check the scoped diff**

```powershell
git diff --check -- frontend/src/app/features/restaurant-pos/api/restaurant-pos-api.models.ts frontend/src/app/features/restaurant-pos/api/restaurant-pos-api.mappers.ts frontend/src/app/features/restaurant-pos/api/restaurant-pos-api.mappers.spec.ts frontend/src/app/features/restaurant-pos/models/order.models.ts frontend/src/app/features/restaurant-pos/state/restaurant-order.store.ts frontend/src/app/features/restaurant-pos/state/restaurant-pos.store.spec.ts
```

---

### Task 3: Componente reutilizable de imagen con skeleton

**Files:**
- Create: `frontend/src/app/features/restaurant-pos/components/product-image/product-image.ts`
- Create: `frontend/src/app/features/restaurant-pos/components/product-image/product-image.html`
- Create: `frontend/src/app/features/restaurant-pos/components/product-image/product-image.css`
- Create: `frontend/src/app/features/restaurant-pos/components/product-image/product-image.spec.ts`

**Interfaces:**
- Produces selector: `app-product-image`.
- Inputs: `imageUrl: string | null | undefined`, `alt: string`, `shape: 'square' | 'circle'`, `size: 'sm' | 'md' | 'lg'`.
- Uses: shared `Skeleton` and `Icon` components.

- [ ] **Step 1: Write failing component tests**

Cover the observable states:

```ts
expect(screen.getByTestId('product-image-skeleton')).toBeTruthy();
fireEvent.load(screen.getByRole('img'));
expect(screen.queryByTestId('product-image-skeleton')).toBeNull();
```

```ts
fireEvent.error(screen.getByRole('img'));
expect(screen.queryByRole('img')).toBeNull();
expect(screen.getByTestId('product-image-fallback')).toBeTruthy();
```

Also assert missing URL renders fallback immediately, `shape="circle"` applies a round container, and the skeleton has `aria-hidden="true"`.

- [ ] **Step 2: Run the component spec and verify RED**

```powershell
pnpm exec ng test --watch=false --include src/app/features/restaurant-pos/components/product-image/product-image.spec.ts
```

Expected: compilation FAIL because the component does not exist.

- [ ] **Step 3: Implement the minimal signal-based component**

Use a URL-keyed state so changing inputs cannot reuse a stale loaded state:

```ts
type ProductImageState = 'loading' | 'loaded' | 'error';

readonly imageUrl = input<string | null | undefined>(null);
readonly alt = input('');
readonly shape = input<'square' | 'circle'>('square');
readonly size = input<'sm' | 'md' | 'lg'>('md');
private readonly states = signal(new Map<string, ProductImageState>());
protected readonly state = computed(() => {
  const url = this.imageUrl();
  return url ? (this.states().get(url) ?? 'loading') : 'error';
});
```

`markLoaded()` and `markFailed()` replace the map immutably. The template reserves dimensions on the wrapper, renders a decorative `app-skeleton` while loading, an absolutely positioned `<img>` for a valid URL, and an `image` icon on error/missing URL. CSS defines exact sizes: `sm=2.5rem`, `md=3rem`, `lg=6rem`.

- [ ] **Step 4: Run the spec and verify GREEN**

Run the command from Step 2. Expected: component spec PASS.

- [ ] **Step 5: Run shared skeleton regression**

```powershell
pnpm exec ng test --watch=false --include src/app/shared/ui/skeleton/skeleton.spec.ts --include src/app/features/restaurant-pos/components/product-image/product-image.spec.ts
```

Expected: both specs PASS.

---

### Task 4: Pedido y diálogo de borrado agrupado

**Files:**
- Modify: `frontend/src/app/features/restaurant-pos/components/service-table-panel/service-table-panel.ts`
- Modify: `frontend/src/app/features/restaurant-pos/components/service-table-panel/service-table-panel.html`
- Modify: `frontend/src/app/features/restaurant-pos/components/service-table-panel/service-table-panel.spec.ts`
- Modify: `frontend/public/i18n/es.json`
- Modify: `frontend/public/i18n/en.json`
- Modify: `frontend/public/i18n/ca.json`

**Interfaces:**
- Consumes: `app-product-image` and `GroupedOrderLine.quantity`.
- Preserves: `removeProduct` output payload remains the primary line ID.

- [ ] **Step 1: Write failing panel interaction tests**

Add these user-visible cases:

1. Pending quantity `1`: click `Eliminar`; `removeProduct` emits immediately and no dialog exists.
2. Pending grouped quantity `5`: click `Eliminar`; no emit yet; dialog contains product name, `5`, product image and destructive confirmation.
3. Confirm grouped deletion: emits the primary line ID once and closes.
4. Cancel grouped deletion: emits nothing and closes.
5. Non-pending quantity `1`: still opens the existing confirmation.
6. Order row with URL: renders the product image component and its skeleton before `load`.

- [ ] **Step 2: Run panel spec and verify RED**

```powershell
pnpm exec ng test --watch=false --include src/app/features/restaurant-pos/components/service-table-panel/service-table-panel.spec.ts
```

Expected: grouped pending deletion emits immediately and no order thumbnail/dialog content exists.

- [ ] **Step 3: Route deletion through the grouped line**

Change the template call to:

```html
(click)="requestRemoveProduct(groupedLine)"
```

Store the complete pending group:

```ts
protected readonly pendingRemovalGroup = signal<GroupedOrderLine | null>(null);
```

Decision rule:

```ts
protected requestRemoveProduct(group: GroupedOrderLine): void {
  if (group.primaryLine.status === 'pending' && group.quantity === 1) {
    this.removeProduct.emit(group.primaryLine.id);
    return;
  }
  this.pendingRemovalGroup.set(group);
  this.removeProductConfirmOpen.set(true);
}
```

Confirmation emits `group.primaryLine.id`. Closing clears both signal and open state.

- [ ] **Step 4: Add order thumbnail and dialog content**

Import `ProductImage`. Place a `size="md"` square image before the line text while keeping the quantity control in its existing column. Replace the self-closing delete dialog with projected content containing a centered `size="lg"` image, product name and quantity.

Select title/description keys based on `pendingRemovalGroup()?.quantity > 1`; preserve the non-pending wording for a single unit.

- [ ] **Step 5: Add translations**

Add equivalent keys to all locales:

```json
"removeGroupedConfirmTitle": "Eliminar todas las unidades",
"removeGroupedConfirmDescription": "Se eliminarán las {{count}} unidades de {{name}} del pedido."
```

Use accurate English and Catalan equivalents, keeping the current confirmation/cancel labels.

- [ ] **Step 6: Run panel spec and verify GREEN**

Run the command from Step 2. Expected: panel spec PASS.

---

### Task 5: Skeleton en «Buscar producto»

**Files:**
- Modify: `frontend/src/app/features/restaurant-pos/components/product-search-dialog/product-search-dialog.ts`
- Modify: `frontend/src/app/features/restaurant-pos/components/product-search-dialog/product-search-dialog.html`
- Modify: `frontend/src/app/features/restaurant-pos/components/product-search-dialog/product-search-dialog.spec.ts`

**Interfaces:**
- Consumes: `app-product-image` with `shape="circle"` and `size="sm"`.
- Preserves: mapper outputs, row tracking, favorites, quantity controls and phone layout.

- [ ] **Step 1: Write failing search dialog tests**

For a result with `imageUrl`, assert the circular product image exists, its skeleton is initially visible, `load` hides it and `error` shows fallback. For a result without URL, assert fallback and no skeleton.

- [ ] **Step 2: Run search dialog spec and verify RED**

```powershell
pnpm exec ng test --watch=false --include src/app/features/restaurant-pos/components/product-search-dialog/product-search-dialog.spec.ts
```

Expected: FAIL because the current raw `<img>` has no skeleton/fallback state.

- [ ] **Step 3: Replace the raw image branch**

Import `ProductImage` and replace the current `@if (item.imageUrl)` image/icon branch with:

```html
<app-product-image
  [imageUrl]="item.imageUrl"
  alt=""
  shape="circle"
  size="sm"
/>
```

Keep the existing avatar wrapper dimensions and all row/button semantics unchanged.

- [ ] **Step 4: Run search and page integration specs**

```powershell
pnpm exec ng test --watch=false --include src/app/features/restaurant-pos/components/product-search-dialog/product-search-dialog.spec.ts --include src/app/features/restaurant-pos/pages/restaurant-pos-service-page/restaurant-pos-service-page.spec.ts
```

Expected: both specs PASS; add-product, customization and quantity-stepper behavior remains green.

---

### Task 6: Final cross-project verification

**Files:**
- Verify only; no production edits unless a regression is proven.

**Interfaces:**
- Consumes all previous task deliverables.
- Produces verification evidence and residual-risk report.

- [ ] **Step 1: Run focused frontend matrix**

```powershell
pnpm exec ng test --watch=false --include src/app/features/restaurant-pos/components/product-image/product-image.spec.ts --include src/app/features/restaurant-pos/components/service-table-panel/service-table-panel.spec.ts --include src/app/features/restaurant-pos/components/product-search-dialog/product-search-dialog.spec.ts --include src/app/features/restaurant-pos/pages/restaurant-pos-service-page/restaurant-pos-service-page.spec.ts --include src/app/features/restaurant-pos/api/restaurant-pos-api.mappers.spec.ts --include src/app/features/restaurant-pos/state/restaurant-pos.store.spec.ts
```

Expected: all selected files PASS.

- [ ] **Step 2: Run full frontend suite and production build**

```powershell
pnpm test -- --watch=false
pnpm build
```

Expected: suite exits `0`; build exits `0` with only already-known budget/CommonJS warnings.

- [ ] **Step 3: Run backend affected tests and build**

```powershell
pnpm test -- src/restaurants/infrastructure/persistence/prisma-restaurant-order.repository.spec.ts src/restaurants/infrastructure/persistence/prisma-restaurant-read.repository.spec.ts
pnpm build
```

Expected: affected specs and build PASS. Run `pnpm test` once and report separately if the two already-diagnosed stale expectations remain; do not silently classify new failures as baseline.

- [ ] **Step 4: Verify phone compatibility**

From `mobile/` with the Android Studio JDK:

```powershell
$env:JAVA_HOME='C:\Program Files\Android\Android Studio\jbr'
.\gradlew.bat :app:testDebugUnitTest --tests "com.mesaflow.client.core.data.CartRepositoryTest" --tests "com.mesaflow.client.core.data.OrderMappersTest" --tests "com.mesaflow.client.core.data.OrderRepositoryTest" --rerun-tasks --console=plain
```

Expected: `29/29`, zero failures/errors/skips.

- [ ] **Step 5: Perform responsive and interaction QA**

At a phone-width viewport, verify:

- no horizontal scroll;
- image, product name, price, quantity control and delete button remain visible;
- skeleton occupies the final image dimensions;
- `−` reduces one unit;
- `Eliminar` on quantity greater than one opens the destructive dialog;
- cancel preserves the group and confirm removes it;
- search results retain add/configure/favorite controls while images load.

- [ ] **Step 6: Final diff and scope audit**

```powershell
git -c core.whitespace=cr-at-eol diff --check
git status --short
```

Separate task changes from pre-existing user edits. Do not stage unrelated files or generated Gradle/pnpm caches.
