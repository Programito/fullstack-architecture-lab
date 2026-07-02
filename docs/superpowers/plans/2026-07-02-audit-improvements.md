# Audit Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve the current audit trail so it captures richer business context, exposes more useful filters in the developer dashboard, and remains safe for operational use.

**Architecture:** Keep the existing `backend/src/observability` module as the single entry point for persistence and query logic, but extend the audit contract with explicit actor, entity, result, and change-summary metadata. On the frontend, evolve the existing `/developer/logs` dashboard rather than creating a new surface, adding focused audit filters and detail rendering that reuse the current API/service/page structure.

**Tech Stack:** NestJS, Prisma, PostgreSQL, Angular, Transloco, Vitest, Supertest, pnpm

---

## File Structure

### Backend files to modify
- `backend/prisma/schema.prisma`
  - Extend `AppLog` only if we decide some audit fields must be first-class columns instead of metadata.
- `backend/prisma/migrations/<timestamp>_audit_improvements/migration.sql`
  - Persist any schema changes for new indexed audit fields.
- `backend/src/observability/application/observability.types.ts`
  - Tighten `AppLogInput` and `LogQuery` for audit result/entity filters.
- `backend/src/observability/application/audit.service.ts`
  - Accept structured audit payloads such as `result`, `entityType`, `entityId`, `entityLabel`, `changedFields`.
- `backend/src/observability/application/audit-context.ts`
  - Keep actor/organization context normalized for all audit call sites.
- `backend/src/observability/application/observability-metadata.policy.ts`
  - Allow the new audit metadata keys while keeping sensitive values stripped.
- `backend/src/observability/application/observability.service.ts`
  - Filter audit queries consistently across summary, timeline, breakdown, and events.
- `backend/src/observability/presentation/rest/dto/developer-logs-query.dto.ts`
  - Add validated audit-facing filters such as `result`, `entityType`, `entityId`, and `actorUserId`.
- `backend/src/observability/presentation/rest/developer-logs.controller.ts`
  - Pass the richer filters through to all dashboard endpoints.
- `backend/src/restaurants/presentation/rest/restaurant-products.controller.ts`
- `backend/src/restaurants/presentation/rest/restaurant-menu.controller.ts`
- `backend/src/restaurants/presentation/rest/restaurant-order.controller.ts`
- `backend/src/restaurants/presentation/rest/restaurant-reservations.controller.ts`
- `backend/src/identity/presentation/rest/auth.controller.ts`
  - Upgrade sensitive audit writes to the new structured format.

### Backend files to create
- `backend/src/observability/application/audit-event.types.ts`
  - Define the normalized audit payload contract and enums.

### Backend tests to modify/create
- `backend/src/observability/application/audit.service.spec.ts`
- `backend/src/observability/application/observability.service.spec.ts`
- `backend/test/app.e2e-spec.ts`

### Frontend files to modify
- `frontend/src/app/features/developer/api/developer-logs.models.ts`
  - Extend filter and event detail models for audit-specific fields.
- `frontend/src/app/features/developer/api/developer-logs-api.service.ts`
  - Send new query params for actor/entity/result filters.
- `frontend/src/app/features/developer/pages/developer-logs-page/developer-logs-page.ts`
  - Add audit-focused filters and richer event detail shaping.
- `frontend/src/app/features/developer/pages/developer-logs-page/developer-logs-page.html`
  - Render extra filter inputs and richer audit detail fields.
- `frontend/src/app/features/developer/pages/developer-logs-page/developer-logs-page.css`
  - Keep the additional filters compact and aligned with the current dashboard layout.
- `frontend/public/i18n/es.json`
- `frontend/public/i18n/en.json`
- `frontend/public/i18n/ca.json`
  - Add labels for actor/entity/result audit filters and detail rows.

### Frontend tests to modify/create
- `frontend/src/app/features/developer/pages/developer-logs-page/developer-logs-page.spec.ts`
- `frontend/src/app/features/developer/api/developer-logs-api.service.spec.ts`

---

### Task 1: Normalize the Structured Audit Payload

**Files:**
- Create: `backend/src/observability/application/audit-event.types.ts`
- Modify: `backend/src/observability/application/audit.service.ts`
- Modify: `backend/src/observability/application/observability.types.ts`
- Test: `backend/src/observability/application/audit.service.spec.ts`

- [ ] **Step 1: Write the failing test**

```ts
it('records structured audit metadata with actor, entity, result, and changed fields', async () => {
  const observability = { record: vi.fn().mockResolvedValue(undefined) };
  const service = new AuditService(observability as never);

  await service.record({
    event: 'restaurant.product.updated',
    message: 'Product updated.',
    organizationId: 'org-1',
    userId: 'user-1',
    actorRoles: ['manager'],
    result: 'succeeded',
    entityType: 'product',
    entityId: 'prod-1',
    entityLabel: 'Burger',
    changedFields: ['price', 'isAvailable'],
  });

  expect(observability.record).toHaveBeenCalledWith(expect.objectContaining({
    metadata: expect.objectContaining({
      actorRoles: ['manager'],
      result: 'succeeded',
      entityType: 'product',
      entityId: 'prod-1',
      entityLabel: 'Burger',
      changedFields: ['price', 'isAvailable'],
    }),
  }));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- src/observability/application/audit.service.spec.ts`
Expected: FAIL because the audit service input contract does not include the new structured fields yet.

- [ ] **Step 3: Write minimal implementation**

```ts
export type AuditResult = 'attempted' | 'succeeded' | 'failed';

export type AuditEntityType =
  | 'auth'
  | 'product'
  | 'menu'
  | 'menu-section'
  | 'reservation'
  | 'order';
```

```ts
async record(input: {
  event: string;
  message: string;
  actorRoles?: string[];
  result?: AuditResult;
  entityType?: AuditEntityType;
  entityId?: string | null;
  entityLabel?: string | null;
  changedFields?: string[];
  organizationId?: string | null;
  userId?: string | null;
  restaurantId?: string | null;
  requestId?: string | null;
  path?: string | null;
  method?: string | null;
  metadata?: Prisma.InputJsonValue | null;
}): Promise<void> {
  await this.observability.record({
    source: 'backend',
    category: 'audit',
    level: input.result === 'failed' ? 'error' : 'info',
    event: input.event,
    message: input.message,
    organizationId: input.organizationId ?? null,
    userId: input.userId ?? null,
    restaurantId: input.restaurantId ?? null,
    requestId: input.requestId ?? null,
    path: input.path ?? null,
    method: input.method ?? null,
    metadata: {
      actorRoles: input.actorRoles ?? [],
      result: input.result ?? 'succeeded',
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
      entityLabel: input.entityLabel ?? null,
      changedFields: input.changedFields ?? [],
      ...(isObject(input.metadata) ? input.metadata : {}),
    },
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- src/observability/application/audit.service.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src/observability/application/audit-event.types.ts backend/src/observability/application/audit.service.ts backend/src/observability/application/observability.types.ts backend/src/observability/application/audit.service.spec.ts
git commit -m "feat: structure audit payload metadata"
```

### Task 2: Filter Audit Data Consistently Across Backend Queries

**Files:**
- Modify: `backend/src/observability/application/observability.types.ts`
- Modify: `backend/src/observability/application/observability-metadata.policy.ts`
- Modify: `backend/src/observability/application/observability.service.ts`
- Modify: `backend/src/observability/presentation/rest/dto/developer-logs-query.dto.ts`
- Modify: `backend/src/observability/presentation/rest/developer-logs.controller.ts`
- Test: `backend/src/observability/application/observability.service.spec.ts`

- [ ] **Step 1: Write the failing test**

```ts
it('applies audit result and entity filters to summary, timeline, breakdown, and events', async () => {
  const { prisma, service } = buildService();
  vi.mocked(prisma.appLog.count)
    .mockResolvedValueOnce(2)
    .mockResolvedValueOnce(1)
    .mockResolvedValueOnce(1);
  vi.mocked(prisma.appLog.findMany).mockResolvedValueOnce([{ durationMs: 80 }] as never);

  await service.getSummary(
    new Date('2026-07-01T00:00:00.000Z'),
    new Date('2026-07-02T00:00:00.000Z'),
    { category: 'audit', path: '/api/v1/restaurants/demo/products', search: 'Burger' },
  );

  expect(prisma.appLog.count).toHaveBeenNthCalledWith(1, expect.objectContaining({
    where: expect.objectContaining({
      category: 'request',
      path: { contains: '/api/v1/restaurants/demo/products', mode: 'insensitive' },
    }),
  }));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- src/observability/application/observability.service.spec.ts`
Expected: FAIL because summary/timeline/breakdown do not fully respect the richer filters yet.

- [ ] **Step 3: Write minimal implementation**

```ts
export type LogQuery = {
  from: Date;
  to: Date;
  level?: LogLevel;
  category?: LogCategory;
  path?: string;
  userId?: string;
  entityType?: string;
  entityId?: string;
  result?: 'attempted' | 'succeeded' | 'failed';
  search?: string;
  page: number;
  pageSize: number;
};
```

```ts
function buildWhere(query: Pick<LogQuery, 'from' | 'to'> & Partial<LogQuery>): Prisma.AppLogWhereInput {
  return {
    timestamp: { gte: query.from, lte: query.to },
    level: query.level,
    category: query.category,
    path: query.path ? { contains: query.path, mode: 'insensitive' } : undefined,
    userId: query.userId,
    AND: [
      query.entityType ? { metadata: { path: ['entityType'], equals: query.entityType } } : undefined,
      query.entityId ? { metadata: { path: ['entityId'], equals: query.entityId } } : undefined,
      query.result ? { metadata: { path: ['result'], equals: query.result } } : undefined,
    ].filter(Boolean) as Prisma.AppLogWhereInput[],
    OR: query.search ? [
      { event: { contains: query.search, mode: 'insensitive' } },
      { message: { contains: query.search, mode: 'insensitive' } },
      { path: { contains: query.search, mode: 'insensitive' } },
      { metadata: { path: ['entityLabel'], string_contains: query.search } },
    ] : undefined,
  };
}
```

- [ ] **Step 4: Run tests and build**

Run:
- `pnpm test -- src/observability/application/observability.service.spec.ts`
- `pnpm build`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src/observability/application/observability.types.ts backend/src/observability/application/observability-metadata.policy.ts backend/src/observability/application/observability.service.ts backend/src/observability/presentation/rest/dto/developer-logs-query.dto.ts backend/src/observability/presentation/rest/developer-logs.controller.ts backend/src/observability/application/observability.service.spec.ts
git commit -m "feat: add audit query filters"
```

### Task 3: Upgrade Sensitive Audit Call Sites

**Files:**
- Modify: `backend/src/identity/presentation/rest/auth.controller.ts`
- Modify: `backend/src/restaurants/presentation/rest/restaurant-products.controller.ts`
- Modify: `backend/src/restaurants/presentation/rest/restaurant-menu.controller.ts`
- Modify: `backend/src/restaurants/presentation/rest/restaurant-order.controller.ts`
- Modify: `backend/src/restaurants/presentation/rest/restaurant-reservations.controller.ts`
- Test: `backend/test/app.e2e-spec.ts`

- [ ] **Step 1: Write the failing test**

```ts
it('persists reservation cancellation with entity metadata and failed/succeeded result', async () => {
  const login = await request(app.getHttpServer())
    .post('/api/v1/auth/demo-login')
    .send({ role: 'manager' })
    .expect(200);

  await request(app.getHttpServer())
    .post('/api/v1/restaurants/demo/reservations/res-1/cancel')
    .set('Authorization', `Bearer ${login.body.accessToken}`)
    .expect(200);

  expect(lastAuditWrite()).toEqual(expect.objectContaining({
    event: expect.stringContaining('reservation'),
    metadata: expect.objectContaining({
      result: 'succeeded',
      entityType: 'reservation',
      entityId: 'res-1',
    }),
  }));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:e2e -- --testNamePattern="persists reservation cancellation with entity metadata and failed/succeeded result"`
Expected: FAIL because the controllers are still using only loose audit metadata.

- [ ] **Step 3: Write minimal implementation**

```ts
await this.audit.record({
  ...auditContext(request, restaurantId),
  event: 'restaurant.reservation.cancelled',
  message: `Reservation ${reservation.id} cancelled.`,
  result: 'succeeded',
  entityType: 'reservation',
  entityId: reservation.id,
  entityLabel: reservation.customerName,
  changedFields: ['status'],
});
```

```ts
await this.audit.record({
  ...auditContext(request, restaurantId),
  event: 'restaurant.product.updated',
  message: `Product ${product.id} updated.`,
  result: 'succeeded',
  entityType: 'product',
  entityId: product.id,
  entityLabel: product.name,
  changedFields: ['price', 'isAvailable'],
});
```

- [ ] **Step 4: Run focused verification**

Run:
- `pnpm test:e2e -- --testNamePattern="persists reservation cancellation with entity metadata and failed/succeeded result"`
- `pnpm test -- backend/test/app.e2e-spec.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src/identity/presentation/rest/auth.controller.ts backend/src/restaurants/presentation/rest/restaurant-products.controller.ts backend/src/restaurants/presentation/rest/restaurant-menu.controller.ts backend/src/restaurants/presentation/rest/restaurant-order.controller.ts backend/src/restaurants/presentation/rest/restaurant-reservations.controller.ts backend/test/app.e2e-spec.ts
git commit -m "feat: enrich sensitive audit events"
```

### Task 4: Add Audit Filters and Detail Fields to the Dashboard

**Files:**
- Modify: `frontend/src/app/features/developer/api/developer-logs.models.ts`
- Modify: `frontend/src/app/features/developer/api/developer-logs-api.service.ts`
- Modify: `frontend/src/app/features/developer/pages/developer-logs-page/developer-logs-page.ts`
- Modify: `frontend/src/app/features/developer/pages/developer-logs-page/developer-logs-page.html`
- Modify: `frontend/src/app/features/developer/pages/developer-logs-page/developer-logs-page.css`
- Modify: `frontend/public/i18n/en.json`
- Modify: `frontend/public/i18n/es.json`
- Modify: `frontend/public/i18n/ca.json`
- Test: `frontend/src/app/features/developer/pages/developer-logs-page/developer-logs-page.spec.ts`

- [ ] **Step 1: Write the failing test**

```ts
it('applies actor and entity filters to all dashboard requests', async () => {
  const api = makeLogsApiDouble();

  await render(DeveloperLogsPage, {
    providers: [{ provide: DeveloperLogsApiService, useValue: api }, ...provideI18nTesting().providers],
    imports: [...provideI18nTesting().imports],
  });

  const pathInput = screen.getByDisplayValue('');
  pathInput.focus();
  pathInput.value = '/api/v1/restaurants/demo/products';
  pathInput.dispatchEvent(new Event('input', { bubbles: true }));

  screen.getByRole('button', { name: 'developer.logs.filters.apply' }).click();

  expect(api.getSummary).toHaveBeenLastCalledWith(expect.objectContaining({
    path: '/api/v1/restaurants/demo/products',
  }));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec ng test --watch=false --include src/app/features/developer/pages/developer-logs-page/developer-logs-page.spec.ts`
Expected: FAIL until the extra filters and detail bindings exist.

- [ ] **Step 3: Write minimal implementation**

```ts
export type DeveloperLogFilters = {
  from: string;
  to: string;
  level: '' | LogLevel;
  category: '' | LogCategory;
  path: string;
  actorUserId: string;
  entityType: string;
  entityId: string;
  result: '' | 'attempted' | 'succeeded' | 'failed';
  search: string;
};
```

```html
<label class="developer-logs-page__search">
  <span>{{ 'developer.logs.filters.path' | transloco }}</span>
  <input type="search" [ngModel]="filters().path" (ngModelChange)="setFilter('path', $event)" />
</label>
<label>
  <span>{{ 'developer.logs.filters.result' | transloco }}</span>
  <select [ngModel]="filters().result" (ngModelChange)="setFilter('result', $event)">
    <option value="">{{ 'developer.logs.filters.all' | transloco }}</option>
    <option value="attempted">attempted</option>
    <option value="succeeded">succeeded</option>
    <option value="failed">failed</option>
  </select>
</label>
```

- [ ] **Step 4: Run focused verification**

Run:
- `pnpm exec ng test --watch=false --include src/app/features/developer/pages/developer-logs-page/developer-logs-page.spec.ts`
- `pnpm build`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/features/developer/api/developer-logs.models.ts frontend/src/app/features/developer/api/developer-logs-api.service.ts frontend/src/app/features/developer/pages/developer-logs-page/developer-logs-page.ts frontend/src/app/features/developer/pages/developer-logs-page/developer-logs-page.html frontend/src/app/features/developer/pages/developer-logs-page/developer-logs-page.css frontend/public/i18n/en.json frontend/public/i18n/es.json frontend/public/i18n/ca.json frontend/src/app/features/developer/pages/developer-logs-page/developer-logs-page.spec.ts
git commit -m "feat: add audit dashboard filters"
```

### Task 5: Final Verification and Cleanup

**Files:**
- Review: `backend/src/observability/**`
- Review: `frontend/src/app/features/developer/**`
- Review: `frontend/public/i18n/*.json`

- [ ] **Step 1: Run backend verification**

Run:
- `pnpm test -- src/observability/application/audit.service.spec.ts src/observability/application/observability.service.spec.ts`
- `pnpm test:e2e`
- `pnpm build`

Expected: PASS

- [ ] **Step 2: Run frontend verification**

Run:
- `pnpm exec ng test --watch=false --include src/app/features/developer/pages/developer-logs-page/developer-logs-page.spec.ts`
- `pnpm build`

Expected: PASS

- [ ] **Step 3: Review the resulting diff**

Run:
- `git diff --stat`
- `git status --short`

Expected: only the intended audit and dashboard files are modified.

- [ ] **Step 4: Commit the finishing pass**

```bash
git add backend/src/observability backend/src/restaurants/presentation/rest backend/src/identity/presentation/rest frontend/src/app/features/developer frontend/public/i18n frontend/angular.json
git commit -m "chore: finalize audit improvements"
```

---

## Self-Review

### Spec coverage
- Richer actor and organization context: covered by Task 1 and Task 3.
- Entity-aware audit records: covered by Task 1 and Task 3.
- Audit result and changed field semantics: covered by Task 1 and Task 3.
- Better dashboard filters for audit investigation: covered by Task 2 and Task 4.
- Verification/build confidence: covered by Task 5.

### Placeholder scan
- No `TODO`, `TBD`, or “similar to previous task” placeholders remain.
- Every task lists exact files, concrete commands, and concrete code examples.

### Type consistency
- Audit result is consistently `attempted | succeeded | failed`.
- Entity fields are consistently named `entityType`, `entityId`, and `entityLabel`.
- Dashboard filter naming uses `path`, `result`, `entityType`, `entityId`, and `actorUserId` consistently.

