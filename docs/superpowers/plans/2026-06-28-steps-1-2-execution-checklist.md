# Steps 1-2 Execution Checklist Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish the first two consolidation steps on `v.0.0.2`: extend scoped restaurant auth beyond reservations and prepare the Prisma runtime read migration without losing demo users or seeded demo content.

**Architecture:** Reuse the scoped auth foundation already merged into `v.0.0.2` and extend it endpoint family by endpoint family, keeping verification tight after each slice. Then introduce Prisma-backed read repositories behind the existing ports while preserving demo login, demo seeds, and examiner-facing data flows.

**Tech Stack:** NestJS, Prisma, PostgreSQL, pnpm, Vitest, Supertest

---

## Current baseline

- Branch already created: `v.0.0.2`
- Scoped auth already in place for:
  - auth result scopes
  - token scopes
  - `AuthGuard` request scopes
  - reservation access guard
- Commits already present:
  - `b4815cf` `feat: expose scoped auth assignments`
  - `e3c33b4` `feat: enforce reservation scoped access`

## Guardrails

- Keep `DEMO_ACCOUNT_CATALOG`, `demo-users.seed.ts`, and demo login working.
- Do not remove seeded demo restaurant/menu/layout/reservations.
- Prefer narrow auth rollouts and narrow provider swaps over big-bang refactors.
- Only protect endpoints when their tests have been updated in the same slice.

## File map

### Step 1 follow-up: scoped auth rollout

- Modify: `backend/src/restaurants/presentation/rest/restaurants.controller.ts`
- Modify: `backend/src/identity/presentation/rest/restaurant-access.guard.ts`
- Modify: `backend/src/identity/presentation/rest/permissions.guard.ts`
- Modify: `backend/test/app.e2e-spec.ts`

### Step 2 setup: Prisma runtime reads

- Create: `backend/src/restaurants/infrastructure/persistence/prisma-restaurant-read.repository.ts`
- Create: `backend/src/restaurants/infrastructure/persistence/prisma-customer.repository.ts`
- Modify: `backend/src/restaurants/restaurants.module.ts`
- Modify: `backend/src/restaurants/application/ports/restaurant-read-repository.port.ts`
- Modify: `backend/src/restaurants/application/ports/customer-repository.port.ts`
- Modify: `backend/prisma/schema.prisma`
- Modify: `backend/prisma/seed.ts`
- Modify: `backend/prisma/seeds/demo-users.seed.ts`
- Create: `backend/src/restaurants/infrastructure/persistence/prisma-restaurant-read.repository.integration-spec.ts`

---

### Task 1: Extend restaurant scope to read-only restaurant endpoints

**Files:**
- Modify: `backend/src/restaurants/presentation/rest/restaurants.controller.ts`
- Modify: `backend/test/app.e2e-spec.ts`

- [ ] **Step 1: Add failing e2e expectations for scoped reads**

```ts
it('rejects service-floor access for a token without restaurant scope', async () => {
  const login = await request(app.getHttpServer())
    .post('/api/v1/auth/demo-login')
    .send({ role: 'developer' })
    .expect(200);

  await request(app.getHttpServer())
    .get('/api/v1/restaurants/restaurant-mesaflow-centro/service-floor')
    .set('Authorization', `Bearer ${login.body.accessToken}`)
    .expect(403);
});

it('allows service-floor access for a token with restaurant scope', async () => {
  const login = await request(app.getHttpServer())
    .post('/api/v1/auth/demo-login')
    .send({ role: 'waiter' })
    .expect(200);

  await request(app.getHttpServer())
    .get('/api/v1/restaurants/restaurant-mesaflow-centro/service-floor')
    .set('Authorization', `Bearer ${login.body.accessToken}`)
    .expect(200);
});
```

- [ ] **Step 2: Run the e2e file**

Run: `pnpm test:e2e -- app.e2e-spec.ts`
Expected: FAIL because menu/floors/service-floor/service-point reads are still public.

- [ ] **Step 3: Protect read-only restaurant endpoints with scope**

Apply the same pattern already used for reservations:

```ts
@Get(':id/menu')
@Version('1')
@UseGuards(AuthGuard, RestaurantAccessGuard)
@RequireRestaurantScope()
```

```ts
@Get(':id/floors')
@Version('1')
@UseGuards(AuthGuard, RestaurantAccessGuard)
@RequireRestaurantScope()
```

```ts
@Get(':id/service-floor')
@Version('1')
@UseGuards(AuthGuard, RestaurantAccessGuard)
@RequireRestaurantScope()
```

```ts
@Get(':id/service-points/:tableId')
@Version('1')
@UseGuards(AuthGuard, RestaurantAccessGuard)
@RequireRestaurantScope()
```

```ts
@Get(':id/service-points/:tableId/order')
@Version('1')
@UseGuards(AuthGuard, RestaurantAccessGuard)
@RequireRestaurantScope()
```

- [ ] **Step 4: Update existing e2e reads to log in first**

Use the existing helper style:

```ts
const login = await createAndLoginAdmin(app);

await request(app.getHttpServer())
  .get(`/api/v1/restaurants/${restaurant.id}/menu`)
  .set('Authorization', `Bearer ${login.body.accessToken}`)
  .expect(200);
```

- [ ] **Step 5: Re-run the e2e file**

Run: `pnpm test:e2e -- app.e2e-spec.ts`
Expected: PASS with scoped reads enforced and current demo flows preserved.

- [ ] **Step 6: Commit**

```bash
git add backend/src/restaurants/presentation/rest/restaurants.controller.ts backend/test/app.e2e-spec.ts
git commit -m "feat: scope restaurant read endpoints"
```

---

### Task 2: Extend scope plus permissions to operational restaurant writes

**Files:**
- Modify: `backend/src/restaurants/presentation/rest/restaurants.controller.ts`
- Modify: `backend/src/identity/presentation/rest/permissions.guard.ts`
- Modify: `backend/test/app.e2e-spec.ts`

- [ ] **Step 1: Add failing e2e expectations for operational writes**

```ts
it('rejects occupying a table for developer demo without restaurant scope', async () => {
  const login = await request(app.getHttpServer())
    .post('/api/v1/auth/demo-login')
    .send({ role: 'developer' })
    .expect(200);

  await request(app.getHttpServer())
    .post('/api/v1/restaurants/restaurant-mesaflow-centro/service-points/stool-1/occupy')
    .set('Authorization', `Bearer ${login.body.accessToken}`)
    .expect(403);
});

it('allows waiter demo to occupy a table inside its restaurant scope', async () => {
  const login = await request(app.getHttpServer())
    .post('/api/v1/auth/demo-login')
    .send({ role: 'waiter' })
    .expect(200);

  await request(app.getHttpServer())
    .post('/api/v1/restaurants/restaurant-mesaflow-centro/service-points/stool-1/occupy')
    .set('Authorization', `Bearer ${login.body.accessToken}`)
    .expect(200);
});
```

- [ ] **Step 2: Run the e2e file**

Run: `pnpm test:e2e -- app.e2e-spec.ts`
Expected: FAIL because writes still use only `AuthGuard`.

- [ ] **Step 3: Reuse existing `RequirePermissions` instead of introducing a second permission decorator**

Use the current guard API:

```ts
@UseGuards(AuthGuard, PermissionsGuard, RestaurantAccessGuard)
@RequirePermissions('service')
@RequireRestaurantScope()
@Post(':id/service-points/:tableId/occupy')
```

```ts
@UseGuards(AuthGuard, PermissionsGuard, RestaurantAccessGuard)
@RequirePermissions('kitchen')
@RequireRestaurantScope()
@Post(':id/service-points/:tableId/send-to-kitchen')
```

```ts
@UseGuards(AuthGuard, PermissionsGuard, RestaurantAccessGuard)
@RequirePermissions('service')
@RequireRestaurantScope()
@Post(':id/service-points/:tableId/charge')
```

- [ ] **Step 4: Protect layout and order mutations with scope**

Apply the same composite guard to:

- `POST :id/service-points/:tableId/orders`
- `POST :id/orders/:orderId/lines`
- `PATCH :id/orders/:orderId/lines/:lineId`
- `DELETE :id/orders/:orderId/lines/:lineId`
- `PATCH :id/orders/:orderId/lines/:lineId/status`
- `POST :id/floors/:floorId/elements`
- `PATCH :id/floors/:floorId`
- `PUT :id/floors/:floorId/elements/reorder`

- [ ] **Step 5: Re-run the e2e file**

Run: `pnpm test:e2e -- app.e2e-spec.ts`
Expected: PASS with developers blocked outside technical resources and business roles restricted by scope plus permission.

- [ ] **Step 6: Commit**

```bash
git add backend/src/restaurants/presentation/rest/restaurants.controller.ts backend/test/app.e2e-spec.ts backend/src/identity/presentation/rest/permissions.guard.ts
git commit -m "feat: scope restaurant operational writes"
```

---

### Task 3: Add a Prisma restaurant read integration spec before implementation

**Files:**
- Create: `backend/src/restaurants/infrastructure/persistence/prisma-restaurant-read.repository.integration-spec.ts`
- Modify: `backend/prisma/seed.ts`

- [ ] **Step 1: Write the failing integration spec**

```ts
describe('PrismaRestaurantReadRepository', () => {
  it('lists the seeded demo restaurant', async () => {
    const restaurants = await repository.listRestaurants();

    expect(restaurants).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'restaurant-mesaflow-centro',
          name: 'MesaFlow Centro',
        }),
      ]),
    );
  });

  it('lists seeded reservations for the demo restaurant', async () => {
    const reservations = await repository.listReservationsByRestaurantId('restaurant-mesaflow-centro');

    expect(reservations.length).toBeGreaterThan(0);
    expect(reservations[0]).toEqual(
      expect.objectContaining({
        customerNameSnapshot: expect.any(String),
      }),
    );
  });
});
```

- [ ] **Step 2: Run the focused integration spec**

Run: `pnpm test -- prisma-restaurant-read.repository.integration-spec.ts`
Expected: FAIL because the repository does not exist yet.

- [ ] **Step 3: Make sure seeds remain demo-safe**

Keep this order in `backend/prisma/seed.ts`:

```ts
await seedMesaFlowDemo(prisma);
await seedDemoUsers(prisma);
await seedMesaFlowLayout(prisma);
await seedMesaFlowOrders(prisma);
await seedMesaFlowReservations(prisma);
```

- [ ] **Step 4: Re-run the focused seed specs**

Run: `pnpm test -- demo-users.seed.spec.ts mesaflow-demo.seed.spec.ts mesaflow-reservations.seed.spec.ts`
Expected: PASS before the repository implementation starts.

- [ ] **Step 5: Commit**

```bash
git add backend/src/restaurants/infrastructure/persistence/prisma-restaurant-read.repository.integration-spec.ts backend/prisma/seed.ts
git commit -m "test: define prisma restaurant read runtime expectations"
```

---

### Task 4: Implement the first Prisma read slice behind existing ports

**Files:**
- Create: `backend/src/restaurants/infrastructure/persistence/prisma-restaurant-read.repository.ts`
- Modify: `backend/src/restaurants/restaurants.module.ts`
- Modify: `backend/src/restaurants/application/ports/restaurant-read-repository.port.ts`
- Modify: `backend/prisma/schema.prisma`
- Modify: `backend/prisma/seeds/demo-users.seed.ts`
- Test: `backend/src/restaurants/infrastructure/persistence/prisma-restaurant-read.repository.integration-spec.ts`

- [ ] **Step 1: Implement only `listRestaurants()` and `listReservationsByRestaurantId()` first**

```ts
async listRestaurants(): Promise<RestaurantSummary[]> {
  const restaurants = await this.prisma.restaurant.findMany({
    orderBy: { name: 'asc' },
  });

  return restaurants.map((restaurant) => ({
    id: restaurant.id,
    organizationId: restaurant.organizationId,
    name: restaurant.name,
    slug: restaurant.name.toLowerCase().replace(/\s+/g, '-'),
    timezone: restaurant.timezone,
    currency: restaurant.currency,
  }));
}
```

```ts
async listReservationsByRestaurantId(restaurantId: string, date?: string): Promise<RestaurantReservation[]> {
  const reservations = await this.prisma.reservation.findMany({
    where: {
      restaurantId,
      ...(date
        ? {
            reservationAt: {
              gte: new Date(`${date}T00:00:00.000Z`),
              lt: new Date(`${date}T23:59:59.999Z`),
            },
          }
        : {}),
    },
    include: {
      tables: {
        include: {
          table: true,
        },
      },
    },
    orderBy: { reservationAt: 'asc' },
  });

  return reservations.map((reservation) => ({
    id: reservation.id,
    customerId: reservation.customerId,
    customerNameSnapshot: reservation.customerNameSnapshot,
    customerPhoneSnapshot: reservation.customerPhoneSnapshot,
    partySize: reservation.partySize,
    reservationAt: reservation.reservationAt.toISOString(),
    durationMinutes: reservation.durationMinutes,
    status: reservation.status,
    notes: reservation.notes,
    tableIds: reservation.tables.map(({ tableId }) => tableId),
    tables: reservation.tables.map(({ table }) => ({
      id: table.id,
      tableNumber: table.tableNumber,
      name: table.name,
    })),
  }));
}
```

- [ ] **Step 2: Switch only the read port provider in `RestaurantsModule`**

```ts
{
  provide: RESTAURANT_READ_REPOSITORY,
  useExisting: PrismaRestaurantReadRepository,
}
```

Leave service windows and customers on their current providers for now.

- [ ] **Step 3: Run focused backend verification**

Run: `pnpm test -- prisma-restaurant-read.repository.integration-spec.ts app.e2e-spec.ts`
Expected: PASS with demo login still working and reservations still visible from the seeded demo restaurant.

- [ ] **Step 4: Build the backend**

Run: `pnpm build`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/restaurants/infrastructure/persistence/prisma-restaurant-read.repository.ts backend/src/restaurants/restaurants.module.ts backend/src/restaurants/application/ports/restaurant-read-repository.port.ts backend/prisma/schema.prisma backend/prisma/seeds/demo-users.seed.ts backend/src/restaurants/infrastructure/persistence/prisma-restaurant-read.repository.integration-spec.ts
git commit -m "feat: move restaurant list and reservations reads to prisma"
```

---

## Suggested commit order

1. `feat: scope restaurant read endpoints`
2. `feat: scope restaurant operational writes`
3. `test: define prisma restaurant read runtime expectations`
4. `feat: move restaurant list and reservations reads to prisma`

## Scope notes

- This checklist deliberately limits Step 2 to `listRestaurants` and `reservations` first.
- `menu`, `floors`, `service-floor`, and `customers` should move to Prisma in a second pass after the first port swap is stable.
- No controller splitting or frontend refactors are included here.

## Self-review

### Spec coverage

- Guided continuation of Step 1: covered by Task 1 and Task 2.
- Guided continuation of Step 2: covered by Task 3 and Task 4.
- Demo-safe constraint: preserved in guardrails, seed order, and provider rollout.

### Placeholder scan

- No `TODO` or `TBD` markers remain.
- Each task has concrete files, commands, and commit points.
- Provider rollout is intentionally narrow, not vague.

### Type consistency

- Scope naming stays `organizations` and `restaurants`.
- Existing `RequirePermissions` is reused instead of inventing a parallel permission decorator API.
- Prisma reservation access uses the existing `reservation` and `reservation_tables` schema names already present in `schema.prisma`.

## Execution handoff

Plan complete and saved to `docs/superpowers/plans/2026-06-28-steps-1-2-execution-checklist.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
