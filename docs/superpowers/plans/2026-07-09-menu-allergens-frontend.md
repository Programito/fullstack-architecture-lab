# Menu Allergens Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make allergens first-class in the existing Angular `menu` page by centralizing the allergen catalog, exposing translated allergen labels in the product list/detail, and adding multi-select allergen filtering without adding a new POS navigation entry.

**Architecture:** Keep allergens inside the current `features/menu` flow. Extract a shared allergen catalog from the product form into a dedicated menu model file, consume that catalog from both the form and the menu page, and extend `MenuPage` state plus template rendering so allergen labels are both visible and filterable. Follow the existing signal-first page architecture and Testing Library specs already used by the menu feature.

**Tech Stack:** Angular standalone components, signals/computed state, Transloco, Vitest, Testing Library, pnpm.

## Global Constraints

- Work only inside the existing `frontend/src/app/features/menu/` feature and related shared i18n test data.
- Do not add a new route or POS side-menu section in `frontend/src/app/features/restaurant-pos/restaurant-pos.routes.ts`.
- Reuse the backend enum keys already mirrored in `frontend/src/app/features/menu/models/product.model.ts` and `frontend/src/app/features/restaurant-pos/api/restaurant-pos-api.models.ts`.
- Keep visible copy localized through Transloco test fixtures for `es`, `en`, and `ca`.
- Preserve existing category, availability, customization, review, and search filters.
- Prefer focused Vitest specs before broader verification.

---

### Task 1: Centralize the allergen catalog for all menu UIs

**Files:**
- Create: `frontend/src/app/features/menu/models/allergen.model.ts`
- Modify: `frontend/src/app/features/menu/components/product-form-dialog/product-form-dialog.ts`
- Modify: `frontend/src/app/features/menu/components/product-form-dialog/product-form-dialog.spec.ts`
- Test: `frontend/src/app/features/menu/models/allergen.model.spec.ts`

**Interfaces:**
- Consumes: `Allergen` from `frontend/src/app/features/menu/models/product.model.ts`
- Produces: `ALLERGEN_VALUES`, `type LocalizedAllergenOption`, and optional helpers such as `hasDeclaredAllergens(allergens?: string[]): boolean`

- [ ] **Step 1: Write the failing shared-catalog test**

```ts
// frontend/src/app/features/menu/models/allergen.model.spec.ts
import { describe, expect, it } from 'vitest';
import { ALLERGEN_VALUES } from './allergen.model';

describe('allergen.model', () => {
  it('exports the 14 backend allergen keys in stable order', () => {
    expect(ALLERGEN_VALUES).toEqual([
      'gluten',
      'crustaceans',
      'eggs',
      'fish',
      'peanuts',
      'soybeans',
      'milk',
      'nuts',
      'celery',
      'mustard',
      'sesame',
      'sulphites',
      'lupin',
      'molluscs',
    ]);
  });
});
```

- [ ] **Step 2: Run the focused test to confirm the file is missing**

Run: `pnpm test -- --watch=false frontend/src/app/features/menu/models/allergen.model.spec.ts`

Expected: FAIL because `./allergen.model` does not exist yet.

- [ ] **Step 3: Implement the shared allergen catalog**

```ts
// frontend/src/app/features/menu/models/allergen.model.ts
import type { Allergen } from './product.model';

export const ALLERGEN_VALUES: readonly Allergen[] = [
  'gluten',
  'crustaceans',
  'eggs',
  'fish',
  'peanuts',
  'soybeans',
  'milk',
  'nuts',
  'celery',
  'mustard',
  'sesame',
  'sulphites',
  'lupin',
  'molluscs',
] as const;

export type LocalizedAllergenOption = {
  value: Allergen;
  label: string;
};

export function hasDeclaredAllergens(allergens?: readonly string[] | null): boolean {
  return Array.isArray(allergens) && allergens.length > 0;
}
```

- [ ] **Step 4: Replace the duplicated list in the product form**

```ts
// product-form-dialog.ts
import { ALLERGEN_VALUES } from '../../models/allergen.model';

// remove the local const ALLERGEN_VALUES block

protected readonly allergenOptions = computed<{ value: Allergen; label: string }[]>(() => {
  this.activeLang();
  return ALLERGEN_VALUES.map((value) => ({
    value,
    label: this.transloco.translate(`menu.allergen.${value}`),
  }));
});
```

- [ ] **Step 5: Add a product-form regression test that proves the shared list is used**

```ts
// product-form-dialog.spec.ts
it('shows the shared allergen catalog in create mode', async () => {
  await renderDialog({ product: null });

  for (const label of ['Gluten', 'Crustáceos', 'Huevos', 'Pescado', 'Moluscos']) {
    expect(screen.getByRole('checkbox', { name: new RegExp(`^${label}$`, 'i') })).toBeTruthy();
  }
});
```

- [ ] **Step 6: Run the focused tests until they pass**

Run: `pnpm test -- --watch=false frontend/src/app/features/menu/models/allergen.model.spec.ts frontend/src/app/features/menu/components/product-form-dialog/product-form-dialog.spec.ts`

Expected: PASS with the new model file and updated form imports.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/app/features/menu/models/allergen.model.ts frontend/src/app/features/menu/models/allergen.model.spec.ts frontend/src/app/features/menu/components/product-form-dialog/product-form-dialog.ts frontend/src/app/features/menu/components/product-form-dialog/product-form-dialog.spec.ts
git commit -m "feat: centralize menu allergen catalog"
```

### Task 2: Add allergen filter state and behavior to MenuPage

**Files:**
- Modify: `frontend/src/app/features/menu/pages/menu-page/menu-page.ts`
- Modify: `frontend/src/app/features/menu/pages/menu-page/menu-page.spec.ts`
- Modify: `frontend/src/app/shared/i18n/i18n-testing.ts`

**Interfaces:**
- Consumes: `ALLERGEN_VALUES` from `frontend/src/app/features/menu/models/allergen.model.ts`
- Produces: `selectedAllergenFilters`, `allergenFilterOptions()`, `toggleAllergenFilter(allergen: Allergen)`, `hasAllergenFilter(allergen: Allergen)`, `productAllergenLabels(product: Product): string[]`

- [ ] **Step 1: Write the failing MenuPage behavior tests for allergen filtering**

```ts
// menu-page.spec.ts
it('filters products by a selected allergen', async () => {
  const { fixture } = await renderPage();

  fireEvent.click(screen.getByRole('button', { name: 'Gluten' }));
  fixture.detectChanges();

  expect(screen.getAllByText('Hamburguesa craft').length).toBeGreaterThan(0);
  expect(screen.queryByText('Café solo')).toBeNull();
});

it('combines multiple allergen filters with OR logic', async () => {
  const { fixture } = await renderPage();

  fireEvent.click(screen.getByRole('button', { name: 'Pescado' }));
  fireEvent.click(screen.getByRole('button', { name: 'Leche' }));
  fixture.detectChanges();

  expect(screen.getAllByText('Hamburguesa craft').length).toBeGreaterThan(0);
  expect(screen.getAllByText('Croquetas de jamón ibérico').length).toBeGreaterThan(0);
});
```

- [ ] **Step 2: Run the focused MenuPage spec to confirm the filter UI does not exist yet**

Run: `pnpm test -- --watch=false frontend/src/app/features/menu/pages/menu-page/menu-page.spec.ts`

Expected: FAIL because buttons like `Gluten` or `Pescado` are not rendered yet.

- [ ] **Step 3: Extend MenuPage state with allergen filter signals and helpers**

```ts
// menu-page.ts
import { ALLERGEN_VALUES } from '../../models/allergen.model';
import type { Allergen } from '../../models/product.model';

protected readonly selectedAllergenFilters = signal<Allergen[]>([]);

protected readonly allergenFilterOptions = computed(() =>
  ALLERGEN_VALUES.map((value) => ({
    value,
    label: this.translate(`menu.allergen.${value}`),
  })),
);

protected hasAllergenFilter(allergen: Allergen): boolean {
  return this.selectedAllergenFilters().includes(allergen);
}

protected toggleAllergenFilter(allergen: Allergen): void {
  this.selectedAllergenFilters.update((current) =>
    current.includes(allergen) ? current.filter((item) => item !== allergen) : [...current, allergen],
  );
  this.resetSelection();
}
```

- [ ] **Step 4: Add allergen matching into the computed product filter**

```ts
// inside filteredProducts()
const selectedAllergenFilters = this.selectedAllergenFilters();

return this.products()
  .filter((product) =>
    selectedAllergenFilters.length === 0 ||
    (product.allergens ?? []).some((allergen) =>
      selectedAllergenFilters.includes(allergen as Allergen),
    ),
  )
  .filter((product) => categoryFilter === 'all' || product.categoryId === categoryFilter)
  // keep the rest of the existing filters unchanged
```

- [ ] **Step 5: Add label helpers for template rendering and fallback text**

```ts
// menu-page.ts
protected productAllergenLabels(product: Product): string[] {
  return (product.allergens ?? []).map((allergen) => this.translate(`menu.allergen.${allergen}`));
}

protected productAllergenSummary(product: Product, maxVisible = 2): string {
  const labels = this.productAllergenLabels(product);
  if (!labels.length) return this.translate('menu.page.noAllergens');
  if (labels.length <= maxVisible) return labels.join(', ');
  return `${labels.slice(0, maxVisible).join(', ')} +${labels.length - maxVisible}`;
}
```

- [ ] **Step 6: Add the missing i18n copy for the new filter block**

```ts
// i18n-testing.ts inside menu.page for es/en/ca
allergenFilter: 'Alérgenos'
allergenFilterHint: 'Filtra la carta por los alérgenos declarados en cada producto.'
```

Suggested translations:

```ts
// en
allergenFilter: 'Allergens'
allergenFilterHint: 'Filter the menu by the allergens declared on each product.'

// ca
allergenFilter: 'Al·lergògens'
allergenFilterHint: 'Filtra la carta pels al·lergògens declarats a cada producte.'
```

- [ ] **Step 7: Run the focused MenuPage spec until filter logic passes**

Run: `pnpm test -- --watch=false frontend/src/app/features/menu/pages/menu-page/menu-page.spec.ts`

Expected: PASS on the new allergen filter cases and no regressions in existing filter behavior.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/app/features/menu/pages/menu-page/menu-page.ts frontend/src/app/features/menu/pages/menu-page/menu-page.spec.ts frontend/src/app/shared/i18n/i18n-testing.ts
git commit -m "feat: add allergen filtering to menu page"
```

### Task 3: Render translated allergen visibility in cards, compact rows, mobile filters, and detail panel

**Files:**
- Modify: `frontend/src/app/features/menu/pages/menu-page/menu-page.html`
- Modify: `frontend/src/app/features/menu/pages/menu-page/menu-page.spec.ts`
- Modify: `frontend/src/app/shared/i18n/i18n-testing.ts`

**Interfaces:**
- Consumes: `productAllergenLabels(product)`, `productAllergenSummary(product)`, `allergenFilterOptions()`, `hasAllergenFilter()`, `toggleAllergenFilter()`
- Produces: visible allergen chips/summary text in product cards and detail, plus allergen filter controls in desktop and mobile layouts

- [ ] **Step 1: Write the failing UI assertions for visible allergen labels**

```ts
// menu-page.spec.ts
it('shows translated allergens in the selected product detail', async () => {
  const { fixture } = await renderPage();

  fireEvent.click(screen.getByRole('button', { name: /Hamburguesa craft/i }));
  fixture.detectChanges();

  const details = screen.getByRole('complementary');
  expect(within(details).getByText(/Gluten/)).toBeTruthy();
  expect(within(details).getByText(/Leche/)).toBeTruthy();
});

it('shows an allergen summary in product cards when allergens are declared', async () => {
  await renderPage();

  const card = screen.getAllByRole('button', { name: 'Hamburguesa craft' })[0];
  expect(within(card).getByText(/Gluten/)).toBeTruthy();
});
```

- [ ] **Step 2: Run the spec to confirm current rendering still shows raw enum keys or no summary**

Run: `pnpm test -- --watch=false frontend/src/app/features/menu/pages/menu-page/menu-page.spec.ts`

Expected: FAIL because the detail panel currently renders `product.allergens?.join(', ')` and cards only show a generic allergens badge.

- [ ] **Step 3: Add allergen filter controls to both desktop and mobile filter areas**

```html
<!-- menu-page.html -->
<div class="grid gap-2">
  <p class="theme-muted text-xs font-semibold uppercase">{{ 'menu.page.allergenFilter' | transloco }}</p>
  <p class="theme-muted text-sm">{{ 'menu.page.allergenFilterHint' | transloco }}</p>
  <div class="flex flex-wrap gap-2">
    @for (filter of allergenFilterOptions(); track filter.value) {
      <app-button
        variant="neutral"
        [fill]="hasAllergenFilter(filter.value) ? 'solid' : 'outline'"
        size="sm"
        (pressed)="toggleAllergenFilter(filter.value)"
      >
        {{ filter.label }}
      </app-button>
    }
  </div>
</div>
```

- [ ] **Step 4: Replace the generic allergens badge in cards with a visible translated summary**

```html
<!-- inside product card content -->
@if (product.allergens?.length) {
  <p class="theme-muted text-sm">{{ productAllergenSummary(product) }}</p>
  <div class="flex flex-wrap gap-1.5">
    @for (label of productAllergenLabels(product).slice(0, 2); track label) {
      <app-badge variant="warning" size="sm">{{ label }}</app-badge>
    }
    @if (productAllergenLabels(product).length > 2) {
      <app-badge variant="warning" size="sm">+{{ productAllergenLabels(product).length - 2 }}</app-badge>
    }
  </div>
}
```

- [ ] **Step 5: Update compact rows and detail panel to show translated allergen content**

```html
<!-- compact row -->
@if (product.allergens?.length) {
  <p class="theme-muted text-xs">{{ productAllergenSummary(product) }}</p>
}

<!-- detail template -->
<section>
  <h3 class="theme-title text-sm font-semibold">{{ 'menu.page.allergens' | transloco }}</h3>
  @if (product.allergens?.length) {
    <div class="mt-2 flex flex-wrap gap-2">
      @for (label of productAllergenLabels(product); track label) {
        <app-badge variant="warning" size="sm">{{ label }}</app-badge>
      }
    </div>
  } @else {
    <p class="theme-muted mt-1 text-sm">{{ 'menu.page.noAllergens' | transloco }}</p>
  }
</section>
```

- [ ] **Step 6: Add final regression tests for desktop and mobile visibility**

```ts
// menu-page.spec.ts
it('shows allergen filters inside the mobile filter dialog', async () => {
  const { fixture } = await renderPage({}, 'es', {
    '(max-width: 1023px)': true,
    '(min-width: 900px)': false,
  });

  fireEvent.click(screen.getByRole('button', { name: 'Filtros' }));
  fixture.detectChanges();

  const dialog = screen.getByRole('dialog', { name: 'Filtros' });
  expect(within(dialog).getByRole('button', { name: 'Gluten' })).toBeTruthy();
});
```

- [ ] **Step 7: Run the focused page tests**

Run: `pnpm test -- --watch=false frontend/src/app/features/menu/pages/menu-page/menu-page.spec.ts`

Expected: PASS with translated allergen labels visible in list/detail and the new filter controls working in desktop and mobile.

- [ ] **Step 8: Broaden verification for all touched frontend files**

Run: `pnpm test -- --watch=false frontend/src/app/features/menu/pages/menu-page/menu-page.spec.ts frontend/src/app/features/menu/components/product-form-dialog/product-form-dialog.spec.ts frontend/src/app/features/menu/models/allergen.model.spec.ts`

Expected: PASS for the new shared model, form regression, and page behavior together.

- [ ] **Step 9: Commit**

```bash
git add frontend/src/app/features/menu/pages/menu-page/menu-page.html frontend/src/app/features/menu/pages/menu-page/menu-page.spec.ts frontend/src/app/shared/i18n/i18n-testing.ts
git commit -m "feat: surface allergens across menu page ui"
```

## Self-Review

**Spec coverage:** The plan covers the approved scope: no new route, shared allergen source, visible allergens in `menu`, and multi-select allergen filtering.

**Placeholder scan:** No `TODO`, `TBD`, or vague “handle later” steps remain; each task names exact files, commands, and target code.

**Type consistency:** The plan uses the existing `Allergen` union, keeps `Product.allergens` as the UI source, and references the same method names across tasks: `ALLERGEN_VALUES`, `selectedAllergenFilters`, `allergenFilterOptions`, `productAllergenLabels`, and `productAllergenSummary`.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-09-menu-allergens-frontend.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
