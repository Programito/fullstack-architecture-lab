# Menu Audit, Modifiers, and Extras Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the menu audit health score more meaningful, define modifiers and extras explicitly instead of by UI heuristics, and align the menu page copy and behavior with that model.

**Architecture:** Keep the existing Angular feature boundaries in `frontend/src/app/features/menu/`, but move business meaning out of display heuristics and into explicit menu-domain fields. Preserve the current services (`menu-audit.service.ts`, `menu-pricing.service.ts`, `menu-api.service.ts`) and evolve them with focused tests before any UI changes.

**Tech Stack:** Angular standalone components, signals/computed state, Transloco, Vitest, Testing Library, pnpm.

## Global Constraints

- Run frontend commands from `frontend/`.
- Follow red-green-refactor for each changed behavior.
- Keep translations complete for `es`, `en`, and `ca`.
- Preserve the existing menu feature file layout unless a split is necessary for clarity.
- Keep visible UI text kind, formal, and direct in Spanish.
- Do not introduce hidden dev servers or unrelated refactors.

---

## File Structure

- Modify: `frontend/src/app/features/menu/models/modifier-group.model.ts`
  Purpose: make modifier intent explicit and stop deriving “extra/add” from price-only heuristics.
- Modify: `frontend/src/app/features/menu/services/menu-api.service.ts`
  Purpose: map backend modifier groups into the richer frontend model.
- Modify: `frontend/src/app/features/menu/services/menu-mock.service.ts`
  Purpose: keep mock data aligned with the richer modifier model.
- Modify: `frontend/src/app/features/menu/components/modifier-group-form-dialog/modifier-group-form-dialog.ts`
  Purpose: allow creating clearer modifier group semantics from the UI.
- Modify: `frontend/src/app/features/menu/components/modifier-group-form-dialog/modifier-group-form-dialog.html`
  Purpose: expose the new modifier intent choices in the form.
- Modify: `frontend/src/app/features/menu/services/menu-pricing.service.ts`
  Purpose: build summaries and price-impact lists from explicit modifier semantics.
- Modify: `frontend/src/app/features/menu/services/menu-audit.service.ts`
  Purpose: replace the current binary health logic with weighted scoring and more precise warnings.
- Modify: `frontend/src/app/features/menu/components/menu-health-panel/menu-health-panel.ts`
  Purpose: render the revised health score model.
- Modify: `frontend/src/app/features/menu/components/menu-health-panel/menu-health-panel.spec.ts`
  Purpose: prove the health panel renders the new score and thresholds.
- Modify: `frontend/src/app/features/menu/pages/menu-page/menu-page.ts`
  Purpose: consume the new audit output and new modifier semantics.
- Modify: `frontend/src/app/features/menu/pages/menu-page/menu-page.html`
  Purpose: show clearer modifier, extra, and audit copy.
- Modify: `frontend/public/i18n/es.json`
  Purpose: add revised menu, audit, modifier, and extras copy in Spanish.
- Modify: `frontend/public/i18n/en.json`
  Purpose: add revised menu, audit, modifier, and extras copy in English.
- Modify: `frontend/public/i18n/ca.json`
  Purpose: add revised menu, audit, modifier, and extras copy in Catalan.
- Test: `frontend/src/app/features/menu/services/menu-audit.service.spec.ts`
  Purpose: lock down weighted scoring and warning generation.
- Test: `frontend/src/app/features/menu/services/menu-pricing.service.spec.ts`
  Purpose: lock down explicit modifier/extras summaries and price-impact behavior.
- Test: `frontend/src/app/features/menu/components/modifier-group-form-dialog/modifier-group-form-dialog.spec.ts`
  Purpose: lock down the richer modifier creation flow.
- Test: `frontend/src/app/features/menu/pages/menu-page/menu-page.spec.ts`
  Purpose: prove the page consumes new audit and modifier behavior end-to-end.

### Task 1: Define Explicit Modifier and Extra Semantics

**Files:**
- Modify: `frontend/src/app/features/menu/models/modifier-group.model.ts`
- Modify: `frontend/src/app/features/menu/services/menu-api.service.ts`
- Modify: `frontend/src/app/features/menu/services/menu-mock.service.ts`
- Test: `frontend/src/app/features/menu/services/menu-pricing.service.spec.ts`

**Interfaces:**
- Consumes: existing `ModifierGroup`, `ModifierGroupType`, `deriveModifierGroupDisplayType(...)`.
- Produces:
  - `export type ModifierGroupIntent = 'choice' | 'extras' | 'remove'`
  - `ModifierGroup.intent?: ModifierGroupIntent`
  - `deriveModifierGroupDisplayType(group: { type: ModifierGroupType; intent?: ModifierGroupIntent; options: ReadonlyArray<Pick<ModifierOption, 'priceDelta'>> }): ModifierGroupDisplayType`

- [ ] **Step 1: Write the failing test**

```ts
it('prefers explicit extras intent over price-based inference', () => {
  const displayType = deriveModifierGroupDisplayType({
    type: 'multiple',
    intent: 'extras',
    options: [{ priceDelta: 0 }, { priceDelta: 1 }],
  });

  expect(displayType).toBe('add');
});

it('keeps multiple groups without extras intent as multi-choice', () => {
  const displayType = deriveModifierGroupDisplayType({
    type: 'multiple',
    intent: 'choice',
    options: [{ priceDelta: 1 }, { priceDelta: 2 }],
  });

  expect(displayType).toBe('multi-choice');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- --watch=false src/app/features/menu/services/menu-pricing.service.spec.ts`
Expected: FAIL because `intent` is not part of the modifier-group interface or derivation logic yet.

- [ ] **Step 3: Write minimal implementation**

```ts
export type ModifierGroupIntent = 'choice' | 'extras' | 'remove';

export interface ModifierGroup {
  id: string;
  name: string;
  type: ModifierGroupType;
  intent?: ModifierGroupIntent;
  displayType?: ModifierGroupDisplayType;
  required: boolean;
  minSelections: number;
  maxSelections: number;
  options: ModifierOption[];
}

export function deriveModifierGroupDisplayType(group: {
  type: ModifierGroupType;
  intent?: ModifierGroupIntent;
  options: ReadonlyArray<Pick<ModifierOption, 'priceDelta'>>;
}): ModifierGroupDisplayType {
  if (group.type === 'remove' || group.intent === 'remove') {
    return 'remove';
  }

  if (group.type === 'single') {
    return 'single-choice';
  }

  if (group.intent === 'extras') {
    return 'add';
  }

  return 'multi-choice';
}
```

- [ ] **Step 4: Propagate the interface through API and mock mapping**

```ts
const modifierGroups: ModifierGroup[] = [...modifierGroupMap.values()].map((mg) => ({
  id: mg.id,
  name: mg.name,
  type: mg.selectionType,
  intent: mg.selectionType === 'remove' ? 'remove' : 'choice',
  displayType: deriveModifierGroupDisplayType({
    type: mg.selectionType,
    intent: mg.selectionType === 'remove' ? 'remove' : 'choice',
    options: mg.options.map((opt) => ({ priceDelta: opt.priceDeltaCents / 100 })),
  }),
  required: mg.isRequired,
  minSelections: mg.minSelections,
  maxSelections: mg.maxSelections,
  options: mg.options.map((opt) => ({
    id: opt.id,
    name: opt.name,
    priceDelta: opt.priceDeltaCents / 100,
  })),
}));
```

```ts
{
  id: 'burger-extras',
  name: { es: 'Extras de hamburguesa', en: 'Burger extras', ca: "Extres d'hamburguesa" },
  type: 'multiple',
  intent: 'extras',
  required: false,
  minSelections: 0,
  maxSelections: 3,
  options: [
    { id: 'extra-bacon', name: { es: 'Bacon', en: 'Bacon', ca: 'Bacó' }, priceDelta: 1.5 },
  ],
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm test -- --watch=false src/app/features/menu/services/menu-pricing.service.spec.ts`
Expected: PASS with explicit modifier intent supported.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/app/features/menu/models/modifier-group.model.ts frontend/src/app/features/menu/services/menu-api.service.ts frontend/src/app/features/menu/services/menu-mock.service.ts frontend/src/app/features/menu/services/menu-pricing.service.spec.ts
git commit -m "feat: make menu modifier intent explicit"
```

### Task 2: Improve Modifier Authoring and Summary Generation

**Files:**
- Modify: `frontend/src/app/features/menu/components/modifier-group-form-dialog/modifier-group-form-dialog.ts`
- Modify: `frontend/src/app/features/menu/components/modifier-group-form-dialog/modifier-group-form-dialog.html`
- Modify: `frontend/src/app/features/menu/components/modifier-group-form-dialog/modifier-group-form-dialog.spec.ts`
- Modify: `frontend/src/app/features/menu/services/menu-pricing.service.ts`
- Modify: `frontend/src/app/features/menu/services/menu-pricing.service.spec.ts`

**Interfaces:**
- Consumes:
  - `ModifierGroup.intent?: ModifierGroupIntent`
  - existing `CreateModifierGroupRequest`
- Produces:
  - richer form state for `'single' | 'multiple' | 'remove'`
  - summary generation that uses `intent` instead of price-only inference

- [ ] **Step 1: Write the failing tests**

```ts
it('allows creating an extras group from the modifier form', async () => {
  const confirmed = vi.fn();
  await render(`<app-modifier-group-form-dialog open (confirmed)="confirmed($event)" />`, {
    imports: [ModifierGroupFormDialog],
    componentProperties: { confirmed },
  });

  await user.type(screen.getByLabelText(/nombre/i), 'Extras burger');
  await user.selectOptions(screen.getByLabelText(/tipo/i), 'multiple');
  await user.selectOptions(screen.getByLabelText(/intención/i), 'extras');
  await user.type(screen.getAllByRole('textbox')[1], 'Bacon');

  await user.click(screen.getByRole('button', { name: /crear/i }));

  expect(confirmed).toHaveBeenCalledWith(expect.objectContaining({
    selectionType: 'multiple',
    intent: 'extras',
  }));
});

it('builds a customization summary from explicit extras intent', () => {
  const summary = pricing.buildCustomizationSummary(product, modifierGroups, {
    add: 'Añadir',
    remove: 'Quitar',
    choose: 'Elegir',
    conjunction: 'o',
    oxfordComma: false,
  });

  expect(summary).toContain('Añadir');
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test -- --watch=false src/app/features/menu/components/modifier-group-form-dialog/modifier-group-form-dialog.spec.ts src/app/features/menu/services/menu-pricing.service.spec.ts`
Expected: FAIL because the form cannot emit `intent` and the summary still depends on derived display heuristics.

- [ ] **Step 3: Write minimal implementation**

```ts
protected readonly selectionType = signal<'single' | 'multiple' | 'remove'>('single');
protected readonly intent = signal<'choice' | 'extras' | 'remove'>('choice');

protected readonly selectionTypeOptions: SelectOption[] = [
  { value: 'single', label: 'Una opción' },
  { value: 'multiple', label: 'Varias opciones' },
  { value: 'remove', label: 'Quitar ingredientes' },
];

protected readonly intentOptions: SelectOption[] = [
  { value: 'choice', label: 'Elección' },
  { value: 'extras', label: 'Extras' },
  { value: 'remove', label: 'Quitar' },
];
```

```ts
this.confirmed.emit({
  name: this.name().trim(),
  selectionType: type,
  intent: type === 'remove' ? 'remove' : this.intent(),
  minSelections: this.isRequired() ? 1 : 0,
  maxSelections: type === 'single' ? 1 : this.options().length,
  isRequired: this.isRequired(),
  options: this.options().map((o) => ({ name: o.name.trim(), priceDeltaCents: o.priceDeltaCents })),
});
```

```ts
const action =
  group.intent === 'remove' ? labels.remove :
  group.intent === 'extras' ? labels.add :
  group.type === 'single' ? labels.choose :
  labels.choose;
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test -- --watch=false src/app/features/menu/components/modifier-group-form-dialog/modifier-group-form-dialog.spec.ts src/app/features/menu/services/menu-pricing.service.spec.ts`
Expected: PASS with explicit authoring and summaries aligned.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/features/menu/components/modifier-group-form-dialog/modifier-group-form-dialog.ts frontend/src/app/features/menu/components/modifier-group-form-dialog/modifier-group-form-dialog.html frontend/src/app/features/menu/components/modifier-group-form-dialog/modifier-group-form-dialog.spec.ts frontend/src/app/features/menu/services/menu-pricing.service.ts frontend/src/app/features/menu/services/menu-pricing.service.spec.ts
git commit -m "feat: clarify menu modifier authoring and summaries"
```

### Task 3: Replace Binary Menu Health with Weighted Audit Scoring

**Files:**
- Modify: `frontend/src/app/features/menu/services/menu-audit.service.ts`
- Modify: `frontend/src/app/features/menu/services/menu-audit.service.spec.ts`
- Modify: `frontend/src/app/features/menu/components/menu-health-panel/menu-health-panel.ts`
- Modify: `frontend/src/app/features/menu/components/menu-health-panel/menu-health-panel.spec.ts`
- Modify: `frontend/src/app/features/menu/pages/menu-page/menu-page.ts`

**Interfaces:**
- Consumes: current warning generation in `MenuAuditService`.
- Produces:
  - `MenuAuditReport.healthScore: number`
  - `MenuAuditReport.productsWithoutIssues: number`
  - a weighted score that subtracts by warning severity instead of simply counting “any issue”

- [ ] **Step 1: Write the failing tests**

```ts
it('computes a weighted menu health score', () => {
  const report = service.buildReport(products, modifierGroups, comboDefinitions);

  expect(report.healthScore).toBeLessThan(100);
  expect(report.healthScore).toBeGreaterThan(0);
});

it('shows the weighted score in the health panel', async () => {
  await render('<app-menu-health-panel [counters]="counters" [selectedFilter]="selectedFilter" [totalProducts]="10" [productsWithIssues]="4" [healthScore]="72" />', {
    imports: [MenuHealthPanel],
    componentProperties: { counters: [], selectedFilter: 'all', totalProducts: 10, productsWithIssues: 4, healthScore: 72 },
  });

  expect(screen.getByText('72%')).toBeInTheDocument();
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test -- --watch=false src/app/features/menu/services/menu-audit.service.spec.ts src/app/features/menu/components/menu-health-panel/menu-health-panel.spec.ts`
Expected: FAIL because `healthScore` is not part of the report/component API.

- [ ] **Step 3: Write minimal implementation**

```ts
const WARNING_WEIGHT: Record<MenuAuditWarningType, number> = {
  'missing-image': 15,
  'missing-description': 15,
  'missing-section': 20,
  unavailable: 10,
  'weak-combo-summary': 8,
  'weak-customization-summary': 8,
};
```

```ts
const totalPenalty = products.reduce((sum, product) => {
  const warnings = warningsByProductId[product.id] ?? [];
  return sum + Math.min(100, warnings.reduce((warningSum, type) => warningSum + WARNING_WEIGHT[type], 0));
}, 0);

const maxPenalty = Math.max(products.length * 100, 1);
const healthScore = Math.max(0, Math.round(100 - (totalPenalty / maxPenalty) * 100));
```

```ts
return {
  issues,
  counters: this.buildCounters(issues),
  warningsByProductId,
  healthScore,
  productsWithoutIssues: products.filter((product) => (warningsByProductId[product.id] ?? []).length === 0).length,
};
```

- [ ] **Step 4: Update the panel to consume the explicit score**

```ts
readonly healthScore = input<number | null>(null);

protected readonly healthPercent = computed(() => {
  const score = this.healthScore();
  if (score !== null) {
    return score;
  }

  const total = this.totalProducts();
  if (total <= 0) {
    return 100;
  }

  const clean = Math.max(total - this.productsWithIssues(), 0);
  return Math.round((clean / total) * 100);
});
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm test -- --watch=false src/app/features/menu/services/menu-audit.service.spec.ts src/app/features/menu/components/menu-health-panel/menu-health-panel.spec.ts`
Expected: PASS with weighted scoring wired through the audit report and panel.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/app/features/menu/services/menu-audit.service.ts frontend/src/app/features/menu/services/menu-audit.service.spec.ts frontend/src/app/features/menu/components/menu-health-panel/menu-health-panel.ts frontend/src/app/features/menu/components/menu-health-panel/menu-health-panel.spec.ts frontend/src/app/features/menu/pages/menu-page/menu-page.ts
git commit -m "feat: add weighted menu audit health score"
```

### Task 4: Align Menu Page Copy and Rendering with the New Model

**Files:**
- Modify: `frontend/src/app/features/menu/pages/menu-page/menu-page.ts`
- Modify: `frontend/src/app/features/menu/pages/menu-page/menu-page.html`
- Modify: `frontend/src/app/features/menu/pages/menu-page/menu-page.spec.ts`
- Modify: `frontend/public/i18n/es.json`
- Modify: `frontend/public/i18n/en.json`
- Modify: `frontend/public/i18n/ca.json`

**Interfaces:**
- Consumes:
  - `MenuAuditReport.healthScore`
  - `ModifierGroup.intent`
  - updated summary generation from `MenuPricingService`
- Produces:
  - clearer labels for extras, removals, and choices
  - menu page UI that reflects explicit audit and modifier semantics

- [ ] **Step 1: Write the failing tests**

```ts
it('shows extras labels for groups with extras intent', async () => {
  await render(MenuPage, { providers: testProviders });

  expect(await screen.findByText(/extras/i)).toBeInTheDocument();
});

it('passes the explicit health score to the audit panel', async () => {
  await render(MenuPage, { providers: testProviders });

  expect(await screen.findByText(/salud del menú/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test -- --watch=false src/app/features/menu/pages/menu-page/menu-page.spec.ts`
Expected: FAIL because the page still relies on previous labels and the old health contract.

- [ ] **Step 3: Write minimal implementation**

```ts
protected modifierActionLabel(group: ModifierGroup): string {
  if (group.intent === 'remove') {
    return this.translate('menu.page.modifierActions.remove');
  }

  if (group.intent === 'extras') {
    return this.translate('menu.page.modifierActions.add');
  }

  return this.translate('menu.page.modifierActions.choose');
}
```

```html
<app-menu-health-panel
  [counters]="auditCounters()"
  [selectedFilter]="auditFilter()"
  [totalProducts]="products().length"
  [productsWithIssues]="productsWithAuditIssues()"
  [healthScore]="auditReport().healthScore"
  (filterSelected)="setAuditFilter($event)"
  (exportRequested)="exportAuditCsv()"
/>
```

```json
"audit": {
  "healthLabel": "Salud del menú",
  "description": "La puntuación combina incidencias graves, medias y leves para priorizar la revisión."
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test -- --watch=false src/app/features/menu/pages/menu-page/menu-page.spec.ts`
Expected: PASS with the menu page consuming the richer model.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/features/menu/pages/menu-page/menu-page.ts frontend/src/app/features/menu/pages/menu-page/menu-page.html frontend/src/app/features/menu/pages/menu-page/menu-page.spec.ts frontend/public/i18n/es.json frontend/public/i18n/en.json frontend/public/i18n/ca.json
git commit -m "feat: align menu page copy with audit and extras model"
```

### Task 5: Final Verification

**Files:**
- Test: `frontend/src/app/features/menu/services/menu-audit.service.spec.ts`
- Test: `frontend/src/app/features/menu/services/menu-pricing.service.spec.ts`
- Test: `frontend/src/app/features/menu/components/modifier-group-form-dialog/modifier-group-form-dialog.spec.ts`
- Test: `frontend/src/app/features/menu/components/menu-health-panel/menu-health-panel.spec.ts`
- Test: `frontend/src/app/features/menu/pages/menu-page/menu-page.spec.ts`

**Interfaces:**
- Consumes: all behavior produced by Tasks 1-4.
- Produces: verified, merge-ready frontend behavior for menu audit, modifiers, and extras.

- [ ] **Step 1: Run focused feature tests**

Run: `pnpm test -- --watch=false src/app/features/menu/services/menu-audit.service.spec.ts src/app/features/menu/services/menu-pricing.service.spec.ts src/app/features/menu/components/modifier-group-form-dialog/modifier-group-form-dialog.spec.ts src/app/features/menu/components/menu-health-panel/menu-health-panel.spec.ts src/app/features/menu/pages/menu-page/menu-page.spec.ts`
Expected: PASS for all touched menu audit, pricing, form, panel, and page specs.

- [ ] **Step 2: Run the frontend build**

Run: `pnpm build`
Expected: PASS with a successful Angular production build.

- [ ] **Step 3: Review changed translations**

Run: `rg -n "allergenFilter|healthLabel|modifierActions|extras" public/i18n/es.json public/i18n/en.json public/i18n/ca.json`
Expected: each key appears in `es`, `en`, and `ca`.

- [ ] **Step 4: Commit final verification notes**

```bash
git add .
git commit -m "chore: verify menu audit and modifier improvements"
```

## Self-Review

- Spec coverage:
  - Health score calculation improvement is covered in Task 3.
  - Modifier clarity is covered in Tasks 1 and 2.
  - Extras modeling is covered in Tasks 1, 2, and 4.
  - Translation and page copy alignment is covered in Task 4.
- Placeholder scan:
  - No `TODO`, `TBD`, or “implement later” markers remain.
  - Every task includes concrete files, commands, and code snippets.
- Type consistency:
  - `ModifierGroup.intent` is introduced in Task 1 and reused consistently in Tasks 2 and 4.
  - `MenuAuditReport.healthScore` is introduced in Task 3 and consumed in Task 4.

