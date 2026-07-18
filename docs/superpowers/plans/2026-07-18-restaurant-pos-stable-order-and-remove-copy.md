# Restaurant POS Stable Order and Removal Copy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep order products in their original position after quantity changes and make each removal confirmation describe its real effect.

**Architecture:** Prisma is the source of truth for line order and returns every order relation sorted by immutable creation time plus `id` as a deterministic tie-breaker. Angular preserves that order while grouping lines and selects a context-specific translated confirmation label without changing removal behavior.

**Tech Stack:** NestJS, Prisma, Angular, Transloco, Vitest, Angular Testing Library, pnpm.

## Global Constraints

- Sort order lines by `createdAt ASC`, then `id ASC`.
- Incrementing or decreasing quantity must not change relative visual order.
- Grouping behavior and the phone add-product flow must remain unchanged.
- Pending grouped removal says that all units will be deleted.
- Kitchen or served removal says that the product will be cancelled.
- Keep Spanish, English, and Catalan translations aligned.
- Do not add a database migration or a `sortOrder` field.

---

### Task 1: Stable Prisma order-line ordering

**Files:**
- Modify: `backend/src/restaurants/infrastructure/persistence/prisma-restaurant-read.repository.spec.ts`
- Modify: `backend/src/restaurants/infrastructure/persistence/prisma-restaurant-read.repository.ts`
- Modify: `backend/src/restaurants/infrastructure/persistence/prisma-restaurant-order.repository.spec.ts`
- Modify: `backend/src/restaurants/infrastructure/persistence/prisma-restaurant-order.repository.ts`

**Interfaces:**
- Consumes: Prisma `order.findFirst`, `order.findMany`, and nested `lines.orderBy`.
- Produces: all restaurant order line collections in `{ createdAt: 'asc' }, { id: 'asc' }` order.

- [ ] **Step 1: Add failing query-contract assertions**

Extend the existing service-point order test with:

```ts
const prisma = {
  // existing delegates
  order: {
    findMany: vi.fn().mockResolvedValue([demoOrder]),
    findFirst: vi.fn().mockResolvedValue(demoOrder),
  },
};

const repository = new PrismaRestaurantReadRepository(prisma as never);
await repository.findServicePointOrderByRestaurantId('restaurant-mesaflow-centro', 'table-3');

expect(prisma.order.findFirst).toHaveBeenCalledWith(
  expect.objectContaining({
    include: expect.objectContaining({
      lines: expect.objectContaining({
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      }),
    }),
  }),
);
```

In the service-floor test, retain a reference to the `order.findMany` mock and assert:

```ts
expect(prisma.order.findMany).toHaveBeenCalledWith(
  expect.objectContaining({
    include: expect.objectContaining({
      lines: expect.objectContaining({
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      }),
    }),
  }),
);
```

Extend the order repository query-contract assertion with:

```ts
lines: expect.objectContaining({
  orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  include: expect.objectContaining({
    restaurantProduct: { select: { imageUrl: true } },
  }),
}),
```

- [ ] **Step 2: Run the focused backend tests and verify RED**

Run:

```powershell
pnpm test -- src/restaurants/infrastructure/persistence/prisma-restaurant-read.repository.spec.ts src/restaurants/infrastructure/persistence/prisma-restaurant-order.repository.spec.ts
```

Expected: FAIL because the read repository uses `updatedAt` and the order repository lacks the `id` tie-breaker.

- [ ] **Step 3: Apply the minimal stable order**

In both read-repository line includes and in `ORDER_INCLUDE`, use:

```ts
orderBy: [
  { createdAt: 'asc' as const },
  { id: 'asc' as const },
],
```

Do not sort by `updatedAt`, because quantity mutations change it.

- [ ] **Step 4: Run the focused backend tests and verify GREEN**

Run the same focused command. Expected: both spec files PASS with no warnings or unhandled errors.

- [ ] **Step 5: Commit the backend behavior**

```powershell
git add -- backend/src/restaurants/infrastructure/persistence/prisma-restaurant-read.repository.spec.ts backend/src/restaurants/infrastructure/persistence/prisma-restaurant-read.repository.ts backend/src/restaurants/infrastructure/persistence/prisma-restaurant-order.repository.spec.ts backend/src/restaurants/infrastructure/persistence/prisma-restaurant-order.repository.ts
git commit -m "fix: keep restaurant order lines in stable order"
```

### Task 2: Context-specific removal confirmation labels

**Files:**
- Modify: `frontend/src/app/features/restaurant-pos/components/service-table-panel/service-table-panel.spec.ts`
- Modify: `frontend/src/app/features/restaurant-pos/components/service-table-panel/service-table-panel.ts`
- Modify: `frontend/src/app/features/restaurant-pos/components/service-table-panel/service-table-panel.html`
- Modify: `frontend/public/i18n/es.json`
- Modify: `frontend/public/i18n/en.json`
- Modify: `frontend/public/i18n/ca.json`
- Modify: `frontend/src/app/shared/i18n/i18n-testing.ts`

**Interfaces:**
- Consumes: `currentRemovalGroup()` and the existing grouped-pending condition.
- Produces: `removeProductConfirmLabel(): string` and translation key `restaurantPos.service.confirmRemoveGrouped`.

- [ ] **Step 1: Add failing component assertions for both labels**

In the grouped locale matrix, add the expected confirmation label:

```ts
it.each([
  ['es', spanishTranslations, 'Eliminar todas las unidades', 'Se eliminarán las 5 unidades de Craft Burger del pedido.', 'Sí, eliminar todas las unidades'],
  ['en', englishTranslations, 'Remove all units', 'All 5 units of Craft Burger will be removed from the order.', 'Yes, remove all units'],
  ['ca', catalanTranslations, 'Eliminar totes les unitats', "S'eliminaran les 5 unitats de Craft Burger de la comanda.", 'Sí, eliminar totes les unitats'],
] as const)(
  'shows the grouped image, quantity, and production %s remove-all copy',
  async (locale, runtimeTranslations, expectedTitle, expectedDescription, expectedConfirmLabel) => {
    const i18n = provideI18nTesting(locale);
    const runtimeServiceTranslations = runtimeTranslations.restaurantPos.service;
    Object.assign(i18n.translations[locale].restaurantPos.service, {
      confirmRemoveGrouped: runtimeServiceTranslations.confirmRemoveGrouped,
      removeGroupedConfirmTitle: runtimeServiceTranslations.removeGroupedConfirmTitle,
      removeGroupedConfirmDescription: runtimeServiceTranslations.removeGroupedConfirmDescription,
      removeProductActionLabel: runtimeServiceTranslations.removeProductActionLabel,
    });
    await render(ServiceTablePanel, {
      imports: [...i18n.imports],
      providers: [...i18n.providers],
      inputs: {
        serviceInfo: createServiceInfo(table, groupedPendingOrder()),
        title: 'Mesa 1',
        errorMessage: null,
      },
    });
    const removeActionLabel = runtimeServiceTranslations.removeProductActionLabel.replace('{{name}}', 'Craft Burger');
    fireEvent.click(screen.getByRole('button', { name: removeActionLabel }));
    const dialog = screen.getByRole('dialog', { name: expectedTitle });
    expect(within(dialog).getByText(expectedDescription)).toBeTruthy();
    expect(within(dialog).getByRole('button', { name: expectedConfirmLabel })).toBeTruthy();
  },
);
```

Keep the existing non-pending test and make its expected label explicit as `Sí, cancelar el producto`.

- [ ] **Step 2: Run the focused frontend test and verify RED**

Run:

```powershell
pnpm test -- --watch=false --include src/app/features/restaurant-pos/components/service-table-panel/service-table-panel.spec.ts
```

Expected: FAIL because `confirmRemoveGrouped` does not exist and the template always uses `confirmRemoveNonPending`.

- [ ] **Step 3: Add the context-specific label selector**

Add beside the existing title and description helpers:

```ts
protected removeProductConfirmLabel(): string {
  const group = this.currentRemovalGroup();
  return group && group.primaryLine.status === 'pending' && group.quantity > 1
    ? this.translate('restaurantPos.service.confirmRemoveGrouped')
    : this.translate('restaurantPos.service.confirmRemoveNonPending');
}
```

Change the dialog binding to:

```html
[confirmLabel]="removeProductConfirmLabel()"
```

- [ ] **Step 4: Add aligned runtime and testing translations**

Use these exact values:

```json
// es
"confirmRemoveGrouped": "Sí, eliminar todas las unidades",
"confirmRemoveNonPending": "Sí, cancelar el producto"

// en
"confirmRemoveGrouped": "Yes, remove all units",
"confirmRemoveNonPending": "Yes, cancel the item"

// ca
"confirmRemoveGrouped": "Sí, eliminar totes les unitats",
"confirmRemoveNonPending": "Sí, cancel·lar el producte"
```

Mirror the same keys and values in each locale section of `i18n-testing.ts`.

- [ ] **Step 5: Run the focused frontend test and verify GREEN**

Run the same focused command. Expected: the component spec PASS in all three locales.

- [ ] **Step 6: Commit the frontend copy behavior**

```powershell
git add -- frontend/src/app/features/restaurant-pos/components/service-table-panel/service-table-panel.spec.ts frontend/src/app/features/restaurant-pos/components/service-table-panel/service-table-panel.ts frontend/src/app/features/restaurant-pos/components/service-table-panel/service-table-panel.html frontend/public/i18n/es.json frontend/public/i18n/en.json frontend/public/i18n/ca.json frontend/src/app/shared/i18n/i18n-testing.ts
git commit -m "fix: clarify restaurant order removal confirmation"
```

### Task 3: Regression verification

**Files:**
- Verify only; no production files are created.

**Interfaces:**
- Consumes: stable backend query contracts and Angular confirmation labels from Tasks 1 and 2.
- Produces: evidence that restaurant ordering, grouping, translations, and phone-compatible add-product logic still pass.

- [ ] **Step 1: Run the restaurant POS frontend regression set**

```powershell
pnpm test -- --watch=false --include src/app/features/restaurant-pos/components/service-table-panel/service-table-panel.spec.ts --include src/app/features/restaurant-pos/pages/restaurant-pos-service-page/restaurant-pos-service-page.spec.ts --include src/app/features/restaurant-pos/state/order-write.service.spec.ts
```

Expected: all selected frontend specs PASS.

- [ ] **Step 2: Run the complete backend test suite**

```powershell
pnpm test
```

Expected: all backend tests PASS.

- [ ] **Step 3: Run production builds**

From `backend/`, run `pnpm build`. From `frontend/`, run `pnpm build`.

Expected: both builds complete successfully.

- [ ] **Step 4: Review the final diff**

```powershell
git diff --check
git diff -- backend/src/restaurants/infrastructure/persistence frontend/src/app/features/restaurant-pos/components/service-table-panel frontend/public/i18n frontend/src/app/shared/i18n/i18n-testing.ts
```

Expected: no whitespace errors; diff contains only the approved ordering and copy changes plus their tests.
