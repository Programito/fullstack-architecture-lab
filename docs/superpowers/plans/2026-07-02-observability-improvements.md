# Observability Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve the first observability release so the data is more trustworthy, retention is explicit, the dashboard is more operational, and the frontend build health is cleaner.

**Architecture:** Keep the existing `backend/src/observability` module as the single backend entry point, but tighten the log contract, move retention cleanup into an explicit scheduled path, and extend the Angular dashboard with lightweight interaction improvements instead of a redesign. Treat frontend build-budget cleanup as a separate closing task inside the same branch only if the earlier observability work stays stable.

**Tech Stack:** NestJS, Prisma, PostgreSQL, Angular, Transloco, Vitest, Supertest, pnpm

---

## File Structure

### Backend files to modify
- `backend/prisma/schema.prisma`
  - Extend `AppLog` with any new indexed fields we decide to persist, such as `organizationId` and `actorRole`.
- `backend/prisma/migrations/<timestamp>_observability_followups/migration.sql`
  - Add schema changes for follow-up observability fields and indexes.
- `backend/src/observability/application/observability.types.ts`
  - Centralize stricter event and metadata contract types.
- `backend/src/observability/application/observability.service.ts`
  - Enforce normalized write/read behavior, metric definitions, and any new summary queries.
- `backend/src/observability/application/audit.service.ts`
  - Route sensitive actions through the stricter event contract.
- `backend/src/observability/application/audit-context.ts`
  - Add normalized actor and organization context helpers.
- `backend/src/observability/application/observability-retention.service.ts`
  - Keep env parsing here; add schedule interval support only if needed.
- `backend/src/observability/observability.module.ts`
  - Register a scheduled retention runner if we add one.
- `backend/src/observability/presentation/rest/developer-logs.controller.ts`
  - Support quick-range filters, view mode, and event detail payloads.
- `backend/src/observability/presentation/rest/dto/developer-logs-query.dto.ts`
  - Add validated query params for range presets and view mode.
- `backend/src/identity/presentation/rest/auth.guard.ts`
  - Reuse existing auth context if needed to expose role names consistently in log records.
- `backend/src/shared/prisma/prisma.service.ts`
  - Keep teardown defensive if scheduler/tests hit Prisma edges.

### Backend files to create
- `backend/src/observability/application/observability-event-catalog.ts`
  - Define allowed event names and default category/level pairings.
- `backend/src/observability/application/observability-metadata.policy.ts`
  - Define per-category allowed metadata keys and truncation rules.
- `backend/src/observability/application/observability-retention.runner.ts`
  - Explicit scheduled cleanup runner.
- `backend/src/observability/application/observability-retention.runner.spec.ts`
  - Test scheduled purge orchestration.
- `backend/src/observability/presentation/rest/dto/log-event-detail.dto.ts`
  - Shape the detail payload for the dashboard drawer.

### Backend tests to modify/create
- `backend/src/observability/application/observability.service.spec.ts`
- `backend/src/observability/application/observability-retention.service.spec.ts`
- `backend/test/app.e2e-spec.ts`
- `backend/src/observability/presentation/rest/*.spec.ts` if controller specs exist or are added

### Frontend files to modify
- `frontend/src/app/features/developer/api/developer-logs.models.ts`
  - Add quick-range/view/detail response types.
- `frontend/src/app/features/developer/api/developer-logs-api.service.ts`
  - Request richer filters and fetch log detail payloads.
- `frontend/src/app/features/developer/pages/developer-logs-page/developer-logs-page.ts`
  - Add quick filters, view tabs, drill-down handlers, and detail drawer state.
- `frontend/src/app/features/developer/pages/developer-logs-page/developer-logs-page.html`
  - Render segmented controls, drill-down entry points, and event detail UI.
- `frontend/src/app/features/developer/pages/developer-logs-page/developer-logs-page.css`
  - Keep layout compact and operational.
- `frontend/src/app/core/observability/client-logs.service.ts`
  - Emit normalized event names and metadata keys from one place.
- `frontend/public/i18n/es.json`
- `frontend/public/i18n/en.json`
- `frontend/public/i18n/ca.json`
  - Add missing strings and clean encoding around observability labels.
- `frontend/angular.json` or the project build config file that defines CSS budgets
  - Only if we decide budgets should be tuned rather than CSS reduced.
- `frontend/src/app/features/identity/pages/login-page/login-page.css`
- `frontend/src/app/features/restaurant-pos/pages/restaurant-pos-reservations-page/restaurant-pos-reservations-page.css`
  - Trim CSS size so global build returns to green.

### Frontend tests to modify/create
- `frontend/src/app/features/developer/pages/developer-logs-page/developer-logs-page.spec.ts`
- `frontend/src/app/core/observability/client-logs.service.spec.ts`
- `frontend/src/app/features/developer/api/developer-logs-api.service.spec.ts` if absent, create it

---

### Task 1: Normalize Observability Event Contracts

**Files:**
- Create: `backend/src/observability/application/observability-event-catalog.ts`
- Create: `backend/src/observability/application/observability-metadata.policy.ts`
- Modify: `backend/src/observability/application/observability.types.ts`
- Modify: `backend/src/observability/application/observability.service.ts`
- Test: `backend/src/observability/application/observability.service.spec.ts`

- [ ] **Step 1: Write the failing test**

```ts
it('normalizes request error metrics and strips disallowed metadata keys', async () => {
  const { prisma, service } = buildService();
  vi.mocked(prisma.appLog.create).mockResolvedValue({} as never);

  await service.record({
    source: 'backend',
    category: 'request',
    level: 'error',
    event: 'http.request.failed',
    message: 'GET /api/v1/demo failed with 500',
    metadata: {
      statusCode: 500,
      errorName: 'InternalServerErrorException',
      password: 'secret-should-not-survive',
    },
  });

  expect(prisma.appLog.create).toHaveBeenCalledWith(expect.objectContaining({
    data: expect.objectContaining({
      metadata: {
        statusCode: 500,
        errorName: 'InternalServerErrorException',
      },
    }),
  }));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- src/observability/application/observability.service.spec.ts`
Expected: FAIL because metadata policy and stricter normalization do not exist yet.

- [ ] **Step 3: Write minimal implementation**

```ts
export const OBSERVABILITY_EVENT_CATALOG = {
  'http.request.completed': { category: 'request', level: 'info' },
  'http.request.failed': { category: 'request', level: 'error' },
  'audit.auth.login': { category: 'audit', level: 'info' },
  'frontend.navigation': { category: 'client', level: 'info' },
} as const;

const BLOCKED_METADATA_KEYS = new Set(['authorization', 'cookie', 'password', 'token', 'refreshToken', 'accessToken']);

function sanitizeMetadata(category: LogCategory, metadata?: Record<string, unknown>) {
  if (!metadata) return Prisma.JsonNull;
  return Object.fromEntries(
    Object.entries(metadata)
      .filter(([key]) => !BLOCKED_METADATA_KEYS.has(key))
      .slice(0, 12),
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- src/observability/application/observability.service.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src/observability/application/observability-event-catalog.ts backend/src/observability/application/observability-metadata.policy.ts backend/src/observability/application/observability.types.ts backend/src/observability/application/observability.service.ts backend/src/observability/application/observability.service.spec.ts
git commit -m "refactor: normalize observability event contracts"
```

### Task 2: Add Organization and Actor Context to Audit Records

**Files:**
- Modify: `backend/prisma/schema.prisma`
- Create: `backend/prisma/migrations/<timestamp>_observability_followups/migration.sql`
- Modify: `backend/src/observability/application/audit-context.ts`
- Modify: `backend/src/observability/application/audit.service.ts`
- Modify: `backend/src/identity/presentation/rest/auth.guard.ts`
- Test: `backend/test/app.e2e-spec.ts`

- [ ] **Step 1: Write the failing test**

```ts
it('persists audit records with organization and actor role context', async () => {
  const login = await request(app.getHttpServer())
    .post('/api/v1/auth/demo-login')
    .send({ role: 'manager' })
    .expect(200);

  await request(app.getHttpServer())
    .post('/api/v1/auth/logout')
    .set('Authorization', `Bearer ${login.body.accessToken}`)
    .expect(204);

  expect(lastAuditWrite()).toEqual(expect.objectContaining({
    organizationId: 'org-demo',
    metadata: expect.objectContaining({ actorRoles: ['manager'] }),
  }));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:e2e -- --testNamePattern="persists audit records with organization and actor role context"`
Expected: FAIL because the extra fields are not written yet.

- [ ] **Step 3: Write minimal implementation**

```prisma
model AppLog {
  id             String   @id @default(cuid())
  timestamp      DateTime @default(now())
  source         LogSource
  category       LogCategory
  level          LogLevel
  event          String
  message        String
  organizationId String?
  userId         String?
  restaurantId   String?
  metadata       Json?

  @@index([organizationId, timestamp])
}
```

```ts
export function auditContext(request: AuthenticatedRequest, restaurantId?: string | null) {
  return {
    requestId: request.requestId ?? null,
    userId: request.auth.userId,
    organizationId: request.auth.scopes.organizations[0] ?? null,
    restaurantId: restaurantId ?? request.auth.scopes.restaurants[0] ?? null,
    metadata: {
      actorRoles: request.auth.roles,
    },
  };
}
```

- [ ] **Step 4: Run tests and Prisma checks**

Run:
- `pnpm prisma:generate`
- `pnpm test:e2e -- --testNamePattern="persists audit records with organization and actor role context"`

Expected: both PASS

- [ ] **Step 5: Commit**

```bash
git add backend/prisma/schema.prisma backend/prisma/migrations backend/src/observability/application/audit-context.ts backend/src/observability/application/audit.service.ts backend/src/identity/presentation/rest/auth.guard.ts backend/test/app.e2e-spec.ts
git commit -m "feat: enrich audit logs with actor context"
```

### Task 3: Move Retention Cleanup Into an Explicit Scheduled Runner

**Files:**
- Create: `backend/src/observability/application/observability-retention.runner.ts`
- Create: `backend/src/observability/application/observability-retention.runner.spec.ts`
- Modify: `backend/src/observability/observability.module.ts`
- Modify: `backend/src/observability/application/observability.service.ts`
- Modify: `backend/.env.example`

- [ ] **Step 1: Write the failing test**

```ts
it('runs purgeExpired from the scheduled retention runner', async () => {
  const purgeExpired = vi.fn().mockResolvedValue(undefined);
  const runner = new ObservabilityRetentionRunner({ purgeExpired } as unknown as ObservabilityService);

  await runner.run();

  expect(purgeExpired).toHaveBeenCalledTimes(1);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- src/observability/application/observability-retention.runner.spec.ts`
Expected: FAIL because the runner file does not exist yet.

- [ ] **Step 3: Write minimal implementation**

```ts
@Injectable()
export class ObservabilityRetentionRunner {
  constructor(private readonly observability: ObservabilityService) {}

  @Cron('0 * * * *')
  async run(): Promise<void> {
    await this.observability.purgeExpired(new Date());
  }
}
```

```ts
@Module({
  imports: [IdentityModule, ScheduleModule.forRoot()],
  providers: [ObservabilityRetentionRunner],
})
export class ObservabilityModule {}
```

- [ ] **Step 4: Run tests and build**

Run:
- `pnpm test -- src/observability/application/observability-retention.runner.spec.ts`
- `pnpm build`

Expected: both PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src/observability/application/observability-retention.runner.ts backend/src/observability/application/observability-retention.runner.spec.ts backend/src/observability/observability.module.ts backend/src/observability/application/observability.service.ts backend/.env.example
git commit -m "feat: schedule explicit observability retention cleanup"
```

### Task 4: Upgrade the Developer Logs Dashboard UX

**Files:**
- Modify: `frontend/src/app/features/developer/api/developer-logs.models.ts`
- Modify: `frontend/src/app/features/developer/api/developer-logs-api.service.ts`
- Modify: `frontend/src/app/features/developer/pages/developer-logs-page/developer-logs-page.ts`
- Modify: `frontend/src/app/features/developer/pages/developer-logs-page/developer-logs-page.html`
- Modify: `frontend/src/app/features/developer/pages/developer-logs-page/developer-logs-page.css`
- Test: `frontend/src/app/features/developer/pages/developer-logs-page/developer-logs-page.spec.ts`

- [ ] **Step 1: Write the failing test**

```ts
it('switches to audit view and loads filtered events from a quick range preset', async () => {
  const api = makeLogsApiDouble();

  await render(DeveloperLogsPage, {
    providers: [{ provide: DeveloperLogsApiService, useValue: api }, ...provideI18nTesting().providers],
    imports: [...provideI18nTesting().imports],
  });

  await userEvent.click(screen.getByRole('button', { name: /audit/i }));
  await userEvent.click(screen.getByRole('button', { name: /24h/i }));

  expect(api.getEvents).toHaveBeenCalledWith(expect.objectContaining({
    category: 'audit',
  }), 1, 20);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec ng test --watch=false --include src/app/features/developer/pages/developer-logs-page/developer-logs-page.spec.ts`
Expected: FAIL because the page has no tab or quick-range controls.

- [ ] **Step 3: Write minimal implementation**

```ts
protected readonly view = signal<'all' | 'operations' | 'audit'>('all');
protected readonly quickRange = signal<'1h' | '24h' | '7d'>('24h');

protected setView(view: 'all' | 'operations' | 'audit'): void {
  this.view.set(view);
  this.filters.update((current) => ({
    ...current,
    category: view === 'audit' ? 'audit' : '',
  }));
  this.page.set(1);
  this.load();
}
```

```html
<div class="developer-logs-page__segmented">
  <app-button (pressed)="setView('all')">All</app-button>
  <app-button (pressed)="setView('operations')">Operations</app-button>
  <app-button (pressed)="setView('audit')">Audit</app-button>
</div>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec ng test --watch=false --include src/app/features/developer/pages/developer-logs-page/developer-logs-page.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/features/developer/api/developer-logs.models.ts frontend/src/app/features/developer/api/developer-logs-api.service.ts frontend/src/app/features/developer/pages/developer-logs-page/developer-logs-page.ts frontend/src/app/features/developer/pages/developer-logs-page/developer-logs-page.html frontend/src/app/features/developer/pages/developer-logs-page/developer-logs-page.css frontend/src/app/features/developer/pages/developer-logs-page/developer-logs-page.spec.ts
git commit -m "feat: improve developer logs dashboard workflows"
```

### Task 5: Finish Observability Localization and Client Event Hygiene

**Files:**
- Modify: `frontend/src/app/core/observability/client-logs.service.ts`
- Modify: `frontend/src/app/core/observability/client-logs.service.spec.ts`
- Modify: `frontend/public/i18n/es.json`
- Modify: `frontend/public/i18n/en.json`
- Modify: `frontend/public/i18n/ca.json`

- [ ] **Step 1: Write the failing test**

```ts
it('sends normalized frontend api error events with compact metadata', () => {
  const post = vi.fn(() => ({ subscribe: () => undefined }));
  const service = setupClientLogsService({ post, token: 'token' });

  service.logHttpError(new HttpErrorResponse({
    status: 500,
    url: '/api/v1/restaurants/demo/products',
  }));

  expect(post).toHaveBeenCalledWith('/api/v1/observability/client-events', expect.objectContaining({
    event: 'frontend.api.error',
    metadata: { status: 500, url: '/api/v1/restaurants/demo/products' },
  }));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec ng test --watch=false --include src/app/core/observability/client-logs.service.spec.ts`
Expected: FAIL if event names or metadata shape are not yet fully normalized.

- [ ] **Step 3: Write minimal implementation**

```ts
const CLIENT_EVENT_NAMES = {
  navigation: 'frontend.navigation',
  online: 'frontend.network.online',
  offline: 'frontend.network.offline',
  apiError: 'frontend.api.error',
  appError: 'frontend.error',
} as const;
```

Also clean the `developer.logs.*` translation keys so chart names, empty states, and quick filters exist in `es`, `en`, and `ca` without mojibake.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec ng test --watch=false --include src/app/core/observability/client-logs.service.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/core/observability/client-logs.service.ts frontend/src/app/core/observability/client-logs.service.spec.ts frontend/public/i18n/es.json frontend/public/i18n/en.json frontend/public/i18n/ca.json
git commit -m "refactor: polish client observability events and i18n"
```

### Task 6: Restore Global Frontend Build Health

**Files:**
- Modify: `frontend/src/app/features/identity/pages/login-page/login-page.css`
- Modify: `frontend/src/app/features/restaurant-pos/pages/restaurant-pos-reservations-page/restaurant-pos-reservations-page.css`
- Modify: other over-budget CSS files only if the first pass still fails
- Test: global frontend build

- [ ] **Step 1: Write the failing verification target**

Run: `pnpm build`
Expected: FAIL with CSS budget errors in `login-page.css` and `restaurant-pos-reservations-page.css`.

- [ ] **Step 2: Inspect the largest repeated selectors**

Run:
- `rg -n ":is\\(|box-shadow|backdrop-filter|@media|padding|gap" frontend/src/app/features/identity/pages/login-page/login-page.css`
- `rg -n ":is\\(|box-shadow|backdrop-filter|@media|padding|gap" frontend/src/app/features/restaurant-pos/pages/restaurant-pos-reservations-page/restaurant-pos-reservations-page.css`

Expected: identify repeated blocks, duplicated responsive rules, or overly verbose utility-like CSS.

- [ ] **Step 3: Write minimal CSS reduction**

```css
.login-page__panel,
.login-page__card {
  border-radius: 8px;
  border: 1px solid var(--border-subtle);
}

.restaurant-pos-reservations-page__summary,
.restaurant-pos-reservations-page__filters {
  display: grid;
  gap: 0.75rem;
}
```

Refactor by merging repeated declarations instead of changing layout behavior or bumping budgets first.

- [ ] **Step 4: Run build to verify it passes**

Run: `pnpm build`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/features/identity/pages/login-page/login-page.css frontend/src/app/features/restaurant-pos/pages/restaurant-pos-reservations-page/restaurant-pos-reservations-page.css
git commit -m "style: reduce frontend css budget overruns"
```

---

## Self-Review

### Spec coverage
- Improve log data quality: covered by Task 1 and Task 2.
- Make retention cleanup explicit and operationally visible: covered by Task 3.
- Improve dashboard usability without making it complex: covered by Task 4.
- Clean frontend observability strings and event hygiene: covered by Task 5.
- Restore global frontend build confidence: covered by Task 6.

### Placeholder scan
- No `TODO`, `TBD`, or “implement later” placeholders remain.
- Every task includes exact file paths, a test or verification step, commands, and a concrete implementation sketch.

### Type consistency
- Event names use a single normalized `frontend.*`, `http.*`, and `audit.*` convention throughout the plan.
- Dashboard terminology stays aligned across models, page state, and translation keys.
- Retention orchestration consistently routes through `ObservabilityService.purgeExpired()`.

---

## Recommended Execution Order

1. Task 1
2. Task 2
3. Task 3
4. Task 5
5. Task 4
6. Task 6

Reason: lock down data correctness and auth first, then polish client event quality, then build the richer dashboard on top of stable data, and only after that spend time on global CSS budget cleanup.

