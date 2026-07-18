# Persistent Floor Element Deletion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make deleting a table or other floor element from `/restaurant-pos/layout` persist after API refresh and page reload.

**Architecture:** `FloorPlan` confirms the user action and emits the selected element. `RestaurantPosLayoutPage` owns the remote mutation, calls a versioned DELETE endpoint, and rehydrates the store from its response. The NestJS use case validates restaurant, floor, and element ownership; both repository adapters remove the floor element and retire its linked restaurant table so historical rows are preserved.

**Tech Stack:** Angular signals and Testing Library, NestJS, Prisma/PostgreSQL, Vitest.

## Global Constraints

- Keep the endpoint under `/api/v1` and protected by the existing `layout` permission.
- Preserve order and reservation history: linked restaurant tables are deactivated, not physically deleted.
- Do not change the Prisma data shape or create a migration.
- Keep the phone product-ordering flow unchanged.

---

### Task 1: Backend deletion contract

**Files:**
- Create: `backend/src/restaurants/application/use-cases/delete-floor-element.use-case.ts`
- Create: `backend/src/restaurants/application/use-cases/delete-floor-element.use-case.spec.ts`
- Modify: `backend/src/restaurants/application/ports/restaurant-read-repository.port.ts`
- Modify: `backend/src/restaurants/infrastructure/demo-restaurant-read.repository.ts`
- Modify: `backend/src/restaurants/infrastructure/persistence/prisma-restaurant-read.repository.ts`
- Modify: `backend/src/restaurants/infrastructure/persistence/prisma-restaurant-read.repository.spec.ts`
- Modify: `backend/src/restaurants/presentation/rest/restaurant-floor.controller.ts`
- Modify: `backend/src/restaurants/restaurants.module.ts`

**Interfaces:**
- Produces: `deleteFloorElement(restaurantId: string, floorId: string, elementId: string): Promise<RestaurantFloors | null>`.
- Produces: `DELETE /api/v1/restaurants/:id/floors/:floorId/elements/:elementId` returning `RestaurantFloorsResponseDto`.

- [x] **Step 1: Write failing use-case and Prisma repository tests**

```ts
expect(await useCase.execute({ restaurantId, floorId, elementId })).toMatchObject({ ok: true });
expect(prisma.floorElement.delete).toHaveBeenCalledWith({ where: { id: elementId } });
expect(prisma.restaurantTable.update).toHaveBeenCalledWith({
  where: { id: tableId },
  data: { isActive: false },
});
```

- [x] **Step 2: Run RED tests**

Run: `pnpm test -- delete-floor-element.use-case.spec.ts prisma-restaurant-read.repository.spec.ts`
Expected: FAIL because the deletion capability does not exist.

- [x] **Step 3: Implement the use case, both adapters, controller route, and module wiring**

```ts
@Delete(':id/floors/:floorId/elements/:elementId')
async deleteElement(...) {
  return RestaurantFloorsResponseDto.fromDomain(
    unwrapResultOrThrow(await this.deleteFloorElement.execute({ restaurantId: id, floorId, elementId })),
  );
}
```

- [x] **Step 4: Run GREEN backend tests**

Run: `pnpm test -- delete-floor-element.use-case.spec.ts prisma-restaurant-read.repository.spec.ts`
Expected: PASS.

### Task 2: Frontend persisted deletion flow

**Files:**
- Modify: `frontend/src/app/features/restaurant-pos/components/floor-plan/floor-plan.ts`
- Modify: `frontend/src/app/features/restaurant-pos/components/floor-plan/floor-plan.spec.ts`
- Modify: `frontend/src/app/features/restaurant-pos/pages/restaurant-pos-layout-page/restaurant-pos-layout-page.ts`
- Modify: `frontend/src/app/features/restaurant-pos/pages/restaurant-pos-layout-page/restaurant-pos-layout-page.html`
- Modify: `frontend/src/app/features/restaurant-pos/pages/restaurant-pos-layout-page/restaurant-pos-layout-page.spec.ts`
- Modify: `frontend/src/app/features/restaurant-pos/api/restaurant-pos-api.service.ts`

**Interfaces:**
- Consumes: backend DELETE endpoint from Task 1.
- Produces: `deleteElement = output<FloorElement>()` and page handler `handleFloorElementDeleted(element)`.

- [x] **Step 1: Write failing component/page tests**

```ts
fireEvent.click(screen.getByRole('button', { name: 'Delete M1' }));
expect(deleteElementSpy).toHaveBeenCalledWith(expect.objectContaining({ id: 'floor-element-1' }));
expect(api.deleteFloorElement).toHaveBeenCalledWith(restaurantId, floorId, 'floor-element-1');
```

- [x] **Step 2: Run RED frontend tests**

Run: `pnpm test -- --watch=false floor-plan.spec.ts restaurant-pos-layout-page.spec.ts`
Expected: FAIL because deletion is currently local-only and the API method is absent.

- [x] **Step 3: Emit deletion, call the API, and hydrate the returned floor**

```ts
this.api.deleteFloorElement(restaurant.id, floorId, element.id).subscribe({
  next: (floors) => this.applyFloorsResponse(floors),
});
```

- [x] **Step 4: Run GREEN focused frontend tests**

Run: `pnpm test -- --watch=false floor-plan.spec.ts restaurant-pos-layout-page.spec.ts`
Expected: PASS.

### Task 3: Broad verification

**Files:**
- Verify all files from Tasks 1 and 2.

**Interfaces:**
- Consumes: complete backend and frontend behavior.
- Produces: a verified persistent deletion flow.

- [x] **Step 1: Run frontend tests and build**

Run: `pnpm test -- --watch=false` and `pnpm build` from `frontend/`.
Expected: all tests and build PASS.

- [x] **Step 2: Run backend unit, integration, and build checks**

Run: `pnpm test`, focused Docker integration if repository SQL changed, and `pnpm build` from `backend/`.
Expected: all checks PASS without warnings.
