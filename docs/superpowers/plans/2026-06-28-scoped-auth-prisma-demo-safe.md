# Scoped Auth + Prisma Runtime + Demo-Safe UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Consolidate MesaFlow around scoped authorization, Prisma-backed runtime reads, and active restaurant context without losing the seeded demo users, demo login flow, or examiner-facing demo data.

**Architecture:** Keep the demo experience intact at the edges, but move runtime truth toward Prisma and scoped assignments. Demo users stay seeded through Prisma and continue to be available in the login UI, while authorization and restaurant access start reading `user_role_assignments` instead of relying mainly on global `user_roles`.

**Tech Stack:** NestJS, Prisma, PostgreSQL, Angular, pnpm, Vitest, Supertest, Testing Library

---

## Guardrails

- Preserve `backend/prisma/seeds/demo-users.seed.ts` and `backend/src/identity/domain/demo-account-catalog.ts`.
- Preserve demo login for examiner and portfolio use.
- Do not remove seeded demo restaurant, seeded demo menu, or seeded demo reservations.
- Prefer "real runtime + good seed data" over "in-memory demo runtime".
- Split work into thin vertical slices so auth, data access, and frontend context can be tested incrementally.

## File map

### Backend auth and scope

- Modify: `backend/src/identity/application/use-cases/auth.service.ts`
- Modify: `backend/src/identity/application/use-cases/auth.service.spec.ts`
- Modify: `backend/src/identity/presentation/rest/dto/auth-response.dto.ts`
- Modify: `backend/src/identity/infrastructure/security/auth-token.service.ts`
- Create: `backend/src/identity/application/ports/user-role-assignment-repository.port.ts`
- Create: `backend/src/identity/infrastructure/persistence/prisma-user-role-assignment.repository.ts`
- Modify: `backend/src/identity/identity.module.ts`

### Backend guards and restaurant access

- Create: `backend/src/identity/presentation/rest/require-permission.decorator.ts`
- Create: `backend/src/identity/presentation/rest/require-restaurant-scope.decorator.ts`
- Create: `backend/src/identity/presentation/rest/scoped-permissions.guard.ts`
- Create: `backend/src/identity/presentation/rest/restaurant-access.guard.ts`
- Modify: `backend/src/restaurants/presentation/rest/restaurants.controller.ts`
- Modify: `backend/test/app.e2e-spec.ts`

### Backend Prisma runtime reads

- Create: `backend/src/restaurants/infrastructure/persistence/prisma-restaurant-read.repository.ts`
- Create: `backend/src/restaurants/infrastructure/persistence/prisma-customer.repository.ts`
- Modify: `backend/src/restaurants/restaurants.module.ts`
- Modify: `backend/src/restaurants/application/ports/restaurant-read-repository.port.ts`
- Modify: `backend/src/restaurants/application/ports/customer-repository.port.ts`
- Modify: `backend/prisma/schema.prisma`
- Modify: `backend/prisma/seed.ts`
- Modify: `backend/prisma/seeds/demo-users.seed.ts`

### Frontend active restaurant context

- Modify: `frontend/src/app/features/restaurant-pos/state/restaurant-context.store.ts`
- Modify: `frontend/src/app/features/menu/services/menu-api.service.ts`
- Modify: `frontend/src/app/features/restaurant-pos/restaurant-pos.routes.ts`
- Modify: `frontend/src/app/features/restaurant-pos/pages/restaurant-pos-access-page.ts`
- Modify: `frontend/src/app/features/restaurant-pos/pages/restaurant-pos-shell-page/restaurant-pos-shell-page.ts`
- Modify: `frontend/src/app/features/restaurant-pos/api/restaurant-pos-api.service.spec.ts`
- Modify: `frontend/src/app/features/restaurant-pos/state/restaurant-context.store.spec.ts`
- Modify: `frontend/src/app/features/menu/pages/menu-page/menu-page.spec.ts`

### Cleanup after core flow is stable

- Modify: `backend/src/app.module.ts`
- Delete: `backend/src/tasks/*`
- Modify: `frontend/.gitignore` or repo root `.gitignore`
- Modify: `backend/src/main.ts`

---

### Task 1: Add scoped auth output while preserving demo login

**Files:**
- Create: `backend/src/identity/application/ports/user-role-assignment-repository.port.ts`
- Create: `backend/src/identity/infrastructure/persistence/prisma-user-role-assignment.repository.ts`
- Modify: `backend/src/identity/application/use-cases/auth.service.ts`
- Modify: `backend/src/identity/application/use-cases/auth.service.spec.ts`
- Modify: `backend/src/identity/presentation/rest/dto/auth-response.dto.ts`
- Modify: `backend/src/identity/identity.module.ts`

- [ ] **Step 1: Write the failing auth service spec for scopes**

```ts
it('returns organization and restaurant scopes from assignments', async () => {
  userRoleAssignments.findByUserId.mockResolvedValue([
    {
      id: 'ura-manager',
      userId: user.id,
      roleId: 'role-manager',
      scopeType: 'organization',
      organizationId: 'org-demo',
      restaurantId: null,
    },
    {
      id: 'ura-waiter',
      userId: user.id,
      roleId: 'role-waiter',
      scopeType: 'restaurant',
      organizationId: 'org-demo',
      restaurantId: 'restaurant-mesaflow-centro',
    },
  ]);

  const result = await service.login('laura@mesaflow.demo', 'Password123!');

  expect(result.scopes).toEqual({
    organizations: ['org-demo'],
    restaurants: ['restaurant-mesaflow-centro'],
  });
});
```

- [ ] **Step 2: Run the focused auth spec**

Run: `pnpm test -- auth.service.spec.ts`
Expected: FAIL because `AuthResult` and auth dependencies do not expose `scopes` yet.

- [ ] **Step 3: Define the scoped assignment port**

```ts
export type UserRoleAssignmentRecord = {
  id: string;
  userId: string;
  roleId: string;
  scopeType: 'organization' | 'restaurant';
  organizationId: string | null;
  restaurantId: string | null;
};

export interface UserRoleAssignmentRepository {
  findByUserId(userId: string): Promise<UserRoleAssignmentRecord[]>;
}

export const USER_ROLE_ASSIGNMENT_REPOSITORY = Symbol('USER_ROLE_ASSIGNMENT_REPOSITORY');
```

- [ ] **Step 4: Extend the auth result and DTO**

```ts
export type AuthResult = {
  accessToken: string;
  refreshToken: string;
  accessExpiresIn: number;
  user: User;
  permissions: string[];
  roles: string[];
  scopes: {
    organizations: string[];
    restaurants: string[];
  };
};
```

```ts
@ApiProperty({
  example: { organizations: ['org-demo'], restaurants: ['restaurant-mesaflow-centro'] },
})
scopes!: {
  organizations: string[];
  restaurants: string[];
};
```

- [ ] **Step 5: Implement the Prisma assignment repository**

```ts
async findByUserId(userId: string): Promise<UserRoleAssignmentRecord[]> {
  return this.prisma.userRoleAssignment.findMany({
    where: { userId },
    select: {
      id: true,
      userId: true,
      roleId: true,
      scopeType: true,
      organizationId: true,
      restaurantId: true,
    },
  });
}
```

- [ ] **Step 6: Update `AuthService` to compute scopes from assignments**

```ts
const assignments = await this.userRoleAssignments.findByUserId(user.id);

const scopes = {
  organizations: [...new Set(assignments.flatMap((assignment) => assignment.organizationId ?? []))],
  restaurants: [...new Set(assignments.flatMap((assignment) => assignment.restaurantId ?? []))],
};
```

- [ ] **Step 7: Wire the new repository in `IdentityModule`**

```ts
PrismaUserRoleAssignmentRepository,
{
  provide: USER_ROLE_ASSIGNMENT_REPOSITORY,
  useExisting: PrismaUserRoleAssignmentRepository,
},
```

- [ ] **Step 8: Run the auth spec again**

Run: `pnpm test -- auth.service.spec.ts`
Expected: PASS with demo login and regular login still returning roles, permissions, and scopes.

- [ ] **Step 9: Commit**

```bash
git add backend/src/identity/application/ports/user-role-assignment-repository.port.ts backend/src/identity/infrastructure/persistence/prisma-user-role-assignment.repository.ts backend/src/identity/application/use-cases/auth.service.ts backend/src/identity/application/use-cases/auth.service.spec.ts backend/src/identity/presentation/rest/dto/auth-response.dto.ts backend/src/identity/identity.module.ts
git commit -m "feat: expose scoped auth assignments"
```

---

### Task 2: Enforce restaurant access with scoped guards

**Files:**
- Create: `backend/src/identity/presentation/rest/require-permission.decorator.ts`
- Create: `backend/src/identity/presentation/rest/require-restaurant-scope.decorator.ts`
- Create: `backend/src/identity/presentation/rest/scoped-permissions.guard.ts`
- Create: `backend/src/identity/presentation/rest/restaurant-access.guard.ts`
- Modify: `backend/src/restaurants/presentation/rest/restaurants.controller.ts`
- Modify: `backend/test/app.e2e-spec.ts`

- [ ] **Step 1: Write the failing e2e expectation**

```ts
it('rejects reservations access when the token lacks restaurant scope', async () => {
  await request(app.getHttpServer())
    .get('/api/v1/restaurants/restaurant-mesaflow-centro/reservations')
    .set('Authorization', `Bearer ${tokenWithoutRestaurantScope}`)
    .expect(403);
});
```

- [ ] **Step 2: Run the focused e2e file**

Run: `pnpm test:e2e -- app.e2e-spec.ts`
Expected: FAIL because read endpoints still rely on coarse auth only.

- [ ] **Step 3: Add decorators**

```ts
export const RequirePermission = (permission: string) => SetMetadata('requiredPermission', permission);
export const RequireRestaurantScope = () => SetMetadata('requireRestaurantScope', true);
```

- [ ] **Step 4: Implement the scope guard**

```ts
const restaurantId = request.params.id;
const user = request.user as {
  scopes?: { restaurants?: string[] };
};

if (!restaurantId) {
  return true;
}

return user.scopes?.restaurants?.includes(restaurantId) ?? false;
```

- [ ] **Step 5: Protect read and write restaurant endpoints**

```ts
@UseGuards(AuthGuard, RestaurantAccessGuard)
@RequireRestaurantScope()
@Get(':id/reservations')
```

```ts
@UseGuards(AuthGuard, ScopedPermissionsGuard, RestaurantAccessGuard)
@RequirePermission('orders:create')
@RequireRestaurantScope()
@Post(':id/service-points/:servicePointId/occupy')
```

- [ ] **Step 6: Run the e2e file again**

Run: `pnpm test:e2e -- app.e2e-spec.ts`
Expected: PASS for forbidden access and existing allowed demo flows.

- [ ] **Step 7: Commit**

```bash
git add backend/src/identity/presentation/rest/require-permission.decorator.ts backend/src/identity/presentation/rest/require-restaurant-scope.decorator.ts backend/src/identity/presentation/rest/scoped-permissions.guard.ts backend/src/identity/presentation/rest/restaurant-access.guard.ts backend/src/restaurants/presentation/rest/restaurants.controller.ts backend/test/app.e2e-spec.ts
git commit -m "feat: enforce restaurant scoped access"
```

---

### Task 3: Replace demo runtime reads with Prisma repositories, keep demo seed data

**Files:**
- Create: `backend/src/restaurants/infrastructure/persistence/prisma-restaurant-read.repository.ts`
- Create: `backend/src/restaurants/infrastructure/persistence/prisma-customer.repository.ts`
- Modify: `backend/src/restaurants/restaurants.module.ts`
- Modify: `backend/prisma/schema.prisma`
- Modify: `backend/prisma/seed.ts`
- Modify: `backend/prisma/seeds/demo-users.seed.ts`
- Test: `backend/src/restaurants/infrastructure/persistence/*.integration-spec.ts`

- [ ] **Step 1: Write the failing repository integration spec**

```ts
it('lists seeded reservations from Prisma for the active demo restaurant', async () => {
  const reservations = await repository.listReservationsByRestaurantId('restaurant-mesaflow-centro', '2026-06-28');

  expect(reservations.length).toBeGreaterThan(0);
  expect(reservations[0]?.restaurantId).toBeUndefined();
});
```

- [ ] **Step 2: Run the focused integration spec**

Run: `pnpm test -- prisma-restaurant-read.repository.integration-spec.ts`
Expected: FAIL because the Prisma read repository does not exist yet.

- [ ] **Step 3: Add missing persistent tables only where runtime still depends on in-memory data**

```prisma
model RestaurantServiceWindow {
  id            String @id @default(cuid())
  restaurantId  String
  name          String
  startTime     String
  endTime       String
  sortOrder     Int
  isActive      Boolean @default(true)

  restaurant Restaurant @relation(fields: [restaurantId], references: [id], onDelete: Cascade)

  @@map("restaurant_service_windows")
}
```

- [ ] **Step 4: Implement Prisma read mapping for restaurant, menu, floors, service floor, reservations, and windows**

```ts
async listRestaurants(): Promise<RestaurantSummary[]> {
  const restaurants = await this.prisma.restaurant.findMany({
    orderBy: { name: 'asc' },
  });

  return restaurants.map((restaurant) => ({
    id: restaurant.id,
    organizationId: restaurant.organizationId,
    name: restaurant.name,
    slug: restaurant.slug,
  }));
}
```

```ts
async listReservationsByRestaurantId(restaurantId: string, date?: string): Promise<RestaurantReservation[]> {
  const reservations = await this.prisma.restaurantReservation.findMany({
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
    include: { tables: true },
    orderBy: { reservationAt: 'asc' },
  });

  return reservations.map(mapReservationRecord);
}
```

- [ ] **Step 5: Keep demo users and demo restaurant in seeds**

```ts
await seedMesaFlowDemo(prisma);
await seedDemoUsers(prisma);
await seedMesaFlowLayout(prisma);
await seedMesaFlowOrders(prisma);
await seedMesaFlowReservations(prisma);
```

- [ ] **Step 6: Switch `RestaurantsModule` providers to Prisma runtime**

```ts
PrismaRestaurantReadRepository,
PrismaCustomerRepository,
{
  provide: RESTAURANT_READ_REPOSITORY,
  useExisting: PrismaRestaurantReadRepository,
},
{
  provide: RESTAURANT_SERVICE_WINDOWS_REPOSITORY,
  useExisting: PrismaRestaurantReadRepository,
},
{
  provide: CUSTOMER_REPOSITORY,
  useExisting: PrismaCustomerRepository,
},
```

- [ ] **Step 7: Run focused backend verification**

Run: `pnpm test -- prisma-restaurant-read.repository.integration-spec.ts demo-users.seed.spec.ts mesaflow-demo.seed.spec.ts`
Expected: PASS with demo data still visible through Prisma.

- [ ] **Step 8: Commit**

```bash
git add backend/src/restaurants/infrastructure/persistence/prisma-restaurant-read.repository.ts backend/src/restaurants/infrastructure/persistence/prisma-customer.repository.ts backend/src/restaurants/restaurants.module.ts backend/prisma/schema.prisma backend/prisma/seed.ts backend/prisma/seeds/demo-users.seed.ts
git commit -m "feat: move restaurant reads to prisma runtime"
```

---

### Task 4: Make the frontend resolve the active restaurant instead of hardcoding it

**Files:**
- Modify: `frontend/src/app/features/restaurant-pos/state/restaurant-context.store.ts`
- Modify: `frontend/src/app/features/menu/services/menu-api.service.ts`
- Modify: `frontend/src/app/features/restaurant-pos/pages/restaurant-pos-access-page.ts`
- Modify: `frontend/src/app/features/restaurant-pos/pages/restaurant-pos-shell-page/restaurant-pos-shell-page.ts`
- Modify: `frontend/src/app/features/menu/pages/menu-page/menu-page.spec.ts`
- Modify: `frontend/src/app/features/restaurant-pos/state/restaurant-context.store.spec.ts`

- [ ] **Step 1: Write the failing context store spec**

```ts
it('auto-selects the only allowed restaurant and exposes its id', () => {
  api.listRestaurants = vi.fn(() => of([{ id: 'restaurant-mesaflow-centro', organizationId: 'org-demo', name: 'MesaFlow Centro', slug: 'mesaflow-centro' }]));

  store.load();

  expect(store.activeRestaurant()?.id).toBe('restaurant-mesaflow-centro');
});
```

- [ ] **Step 2: Run the focused frontend spec**

Run: `pnpm exec ng test --watch=false --include=src/app/features/restaurant-pos/state/restaurant-context.store.spec.ts`
Expected: PASS or partial PASS, but `MenuApiService` still depends on a hardcoded constant.

- [ ] **Step 3: Add an explicit `activeRestaurantId` computed value**

```ts
readonly activeRestaurantId = computed(() => this.activeRestaurant()?.id ?? null);
```

- [ ] **Step 4: Replace `RESTAURANT_ID` in the menu service**

```ts
private readonly restaurantContext = inject(RestaurantContextStore);

private getRequiredRestaurantId(): string {
  const restaurantId = this.restaurantContext.activeRestaurantId();
  if (!restaurantId) {
    throw new Error('No active restaurant selected.');
  }
  return restaurantId;
}
```

```ts
getMenu(): Observable<MenuData> {
  return this.api.getRestaurantMenu(this.getRequiredRestaurantId()).pipe(map(mapApiMenuToMenuData));
}
```

- [ ] **Step 5: Ensure route entry points load restaurant context before page actions**

```ts
ngOnInit(): void {
  this.restaurantContext.load();
}
```

- [ ] **Step 6: Run focused frontend verification**

Run: `pnpm exec ng test --watch=false --include=src/app/features/restaurant-pos/state/restaurant-context.store.spec.ts --include=src/app/features/menu/pages/menu-page/menu-page.spec.ts`
Expected: PASS with the menu page using the selected restaurant instead of a fixed constant.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/app/features/restaurant-pos/state/restaurant-context.store.ts frontend/src/app/features/menu/services/menu-api.service.ts frontend/src/app/features/restaurant-pos/pages/restaurant-pos-access-page.ts frontend/src/app/features/restaurant-pos/pages/restaurant-pos-shell-page/restaurant-pos-shell-page.ts frontend/src/app/features/restaurant-pos/state/restaurant-context.store.spec.ts frontend/src/app/features/menu/pages/menu-page/menu-page.spec.ts
git commit -m "feat: resolve active restaurant from context"
```

---

### Task 5: Clean demo/scaffold debt only after auth and runtime are stable

**Files:**
- Modify: `backend/src/app.module.ts`
- Delete: `backend/src/tasks/*`
- Modify: `backend/README.md`
- Modify: `.gitignore`
- Modify: `backend/src/main.ts`

- [ ] **Step 1: Write a quick smoke assertion for app boot**

```ts
it('boots without TasksModule', async () => {
  const module = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  expect(module).toBeTruthy();
});
```

- [ ] **Step 2: Run the relevant backend smoke tests**

Run: `pnpm test -- app.e2e-spec.ts`
Expected: PASS before deleting scaffold code.

- [ ] **Step 3: Remove `TasksModule` from the application module**

```ts
imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule, HealthModule, IdentityModule, RestaurantsModule]
```

- [ ] **Step 4: Ignore generated Storybook output instead of serving it from the backend**

```gitignore
storybook-static/
dist/
.angular/
coverage/
```

- [ ] **Step 5: Keep runtime demo pages working from live frontend, not static Storybook artifacts**

```ts
// Remove storybook static serving once runtime no longer depends on it.
```

- [ ] **Step 6: Run final verification**

Run: `pnpm test`
Expected: PASS in `backend/`.

Run: `pnpm build`
Expected: PASS in `backend/`.

Run: `pnpm exec ng test --watch=false`
Expected: PASS in `frontend/`.

Run: `pnpm build`
Expected: PASS in `frontend/`, or fail only on a known unrelated budget issue already documented before this branch.

- [ ] **Step 7: Commit**

```bash
git add backend/src/app.module.ts backend/README.md .gitignore backend/src/main.ts
git rm -r backend/src/tasks
git commit -m "chore: remove scaffold runtime leftovers"
```

---

## Suggested execution order

1. Task 1 and Task 2 together form the first serious milestone: scoped auth that still supports demo login.
2. Task 3 is the second milestone: runtime data becomes real, but demo seed data stays rich and visible.
3. Task 4 is the third milestone: frontend stops assuming one hardcoded restaurant.
4. Task 5 is cleanup only after the first three milestones are stable.

## Explicitly out of scope for this plan

- Splitting `RestaurantsController` into multiple controllers
- Splitting `RestaurantPosStore` into multiple smaller stores
- Reservation overlap, capacity, and timezone rules
- Cash sessions, audit logs, stock, promotions

Those should come after this consolidation pass, not before.

## Self-review

### Spec coverage

- Scoped auth contract: covered in Task 1.
- Restaurant-level authorization: covered in Task 2.
- Prisma runtime reads with preserved demo users: covered in Task 3.
- Removal of hardcoded restaurant ID on frontend: covered in Task 4.
- Scaffold cleanup after stabilization: covered in Task 5.

### Placeholder scan

- No `TODO` or `TBD` markers remain.
- Each task includes concrete files, example code, commands, and commit points.
- Cleanup work is explicitly deferred until core runtime and auth are stable.

### Type consistency

- `scopes.organizations` and `scopes.restaurants` are used consistently across auth result, DTO, guards, and frontend context assumptions.
- Demo users remain seeded through Prisma and continue to be referenced through `DEMO_ACCOUNT_CATALOG`.

## Execution handoff

Plan complete and saved to `docs/superpowers/plans/2026-06-28-scoped-auth-prisma-demo-safe.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
