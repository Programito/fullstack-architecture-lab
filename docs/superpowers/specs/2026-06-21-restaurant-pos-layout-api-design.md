# Restaurant POS Layout API Integration Design

## Summary

This design connects the Angular `restaurant-pos` layout route to the MesaFlow backend endpoints
that already exist under `/api/v1/restaurants`. The goal is to stop relying on frontend-only mock
state for the layout editor and start using a real restaurant context plus the backend floor-plan
contract without introducing full multi-restaurant selection yet.

The experience should remain simple for demo and single-restaurant users:

- when the current user can access exactly one restaurant, the app resolves it automatically
- the layout route loads the active restaurant floor plan from the backend
- layout mutations use backend write endpoints and refresh the view from the backend response
- no restaurant picker UI is introduced in this iteration

This design deliberately limits scope to the layout route so we can validate the backend-frontend
contract before expanding the same context to service and reservations.

## Goals

- Resolve one active restaurant automatically for demo and single-restaurant users.
- Create a reusable restaurant context layer in frontend for future POS routes.
- Load `/restaurant-pos/layout` from `GET /api/v1/restaurants/:id/floors`.
- Connect layout editing actions to the existing backend endpoints:
  - `POST /api/v1/restaurants/:id/floors/:floorId/elements`
  - `PATCH /api/v1/restaurants/:id/floors/:floorId`
  - `PUT /api/v1/restaurants/:id/floors/:floorId/elements/reorder`
- Preserve the current layout editing UX as much as possible.
- Add focused automated tests for context resolution and layout API wiring.

## Non-Goals

- No restaurant selection page or selector UI yet.
- No reservation or service route backend integration in this iteration.
- No delete endpoint in this iteration.
- No Prisma-backed restaurant frontend integration beyond the existing demo-backed backend routes.
- No redesign of the layout page visual language.

## Current Context

Backend already exposes demo-backed read and write routes for restaurant layout:

- `GET /api/v1/restaurants`
- `GET /api/v1/restaurants/:id/floors`
- `POST /api/v1/restaurants/:id/floors/:floorId/elements`
- `PATCH /api/v1/restaurants/:id/floors/:floorId`
- `PUT /api/v1/restaurants/:id/floors/:floorId/elements/reorder`

Frontend already has:

- `restaurant-pos` route structure with a dedicated `layout` page
- a rich local layout editor experience
- current floor plan and layout state living in frontend models and store logic
- no restaurant API client or restaurant context layer yet

## Recommended Approach

Use a small frontend restaurant context store plus a dedicated restaurant API service. The context
store resolves the active restaurant once and exposes it to the layout page. The layout page then
loads and updates floor-plan data through backend endpoints while preserving its current UI flow.

This gives us the shortest path to real backend usage without hardcoding a demo restaurant id and
without prematurely building selector UX.

## Architecture

### 1. Frontend restaurant API layer

Add a small `restaurants` API area in frontend that maps backend DTOs to typed frontend models.

Responsibilities:

- fetch restaurant summaries from `GET /api/v1/restaurants`
- fetch floor plan data from `GET /api/v1/restaurants/:id/floors`
- create a floor element through `POST`
- update floor dimensions and name through `PATCH`
- reorder existing floor elements through `PUT`

This layer should be HTTP-focused and avoid page-specific UI logic.

### 2. Restaurant context store

Add a small context store or service that owns:

- `restaurants`
- `activeRestaurant`
- `isLoading`
- `loadError`

Resolution rules for this iteration:

- if the backend returns exactly one restaurant, select it automatically
- if the backend returns more than one restaurant, keep the data available but expose a
  `multipleRestaurants` state for future selector UI
- if the backend returns none, expose a friendly empty state

The layout page should depend on this context instead of constructing a restaurant id itself.

### 3. Layout page integration

The layout page should:

- wait for the active restaurant from the context
- request floors from backend using the active restaurant id
- translate the API response into the current floor-plan UI state
- replace only the layout data source, not the overall editing interactions

Mutation behavior:

- add element modal submits `POST` and replaces local layout state with the returned floor payload
- resize layout modal submits `PATCH` and replaces local layout state with the returned floor payload
- drag or reorder submits `PUT` and replaces local layout state with the returned floor payload

This keeps backend as the source of truth and avoids rebuilding derived positions manually after
writes.

### 4. Error handling

Frontend should treat API failures explicitly:

- restaurant context load failure: show a route-level error state with retry
- no restaurants: show an empty informative state
- multiple restaurants: keep a placeholder state that explains selection is not available yet
- layout mutation failure: keep current UI state and surface a clear non-blocking error message

We should keep the messaging direct and formal in Spanish, aligned with repo conventions.

## Data Flow

### Initial route load

1. User enters `/restaurant-pos/layout`
2. Restaurant context loads `GET /api/v1/restaurants`
3. If exactly one restaurant is returned, the context marks it active
4. Layout page requests `GET /api/v1/restaurants/:id/floors`
5. Response hydrates the visible floor plan

### Add element

1. User opens the add element modal and confirms a new element
2. Layout page sends `POST /api/v1/restaurants/:id/floors/:floorId/elements`
3. Backend returns the updated floor payload
4. Frontend replaces the current floor state with the response

### Resize floor

1. User changes rows or columns in the resize modal
2. Layout page sends `PATCH /api/v1/restaurants/:id/floors/:floorId`
3. Backend returns the updated floor payload
4. Frontend replaces the current floor state with the response

### Reorder or reposition elements

1. User drags or reorders elements in the matrix
2. Layout page sends `PUT /api/v1/restaurants/:id/floors/:floorId/elements/reorder`
3. Backend returns the updated floor payload
4. Frontend replaces the current floor state with the response

## Component and File Boundaries

### Frontend files to add

- `frontend/src/app/features/restaurant-pos/api/restaurant-pos-api.models.ts`
- `frontend/src/app/features/restaurant-pos/api/restaurant-pos-api.service.ts`
- `frontend/src/app/features/restaurant-pos/state/restaurant-context.store.ts`
- focused specs for the new API or context as needed

### Frontend files likely to change

- `frontend/src/app/features/restaurant-pos/pages/restaurant-pos-layout-page/restaurant-pos-layout-page.ts`
- `frontend/src/app/features/restaurant-pos/pages/restaurant-pos-layout-page/restaurant-pos-layout-page.spec.ts`
- `frontend/src/app/features/restaurant-pos/state/restaurant-pos.store.ts`
- `frontend/src/app/features/restaurant-pos/models/floor-plan.models.ts`
- possibly `frontend/src/app/app.config.ts` if provider wiring is needed

### Backend files

No new backend contract is required for this iteration beyond already implemented routes. Backend
changes are only needed if frontend integration reveals a missing response shape or contract bug.

## Testing Strategy

### Frontend

Use TDD with focused tests first:

- restaurant context resolves a single restaurant automatically
- layout page loads floors from backend for the active restaurant
- add element action calls the `POST` endpoint and refreshes the rendered layout
- resize action calls the `PATCH` endpoint and refreshes the rendered layout
- reorder action calls the `PUT` endpoint and refreshes the rendered layout
- graceful handling for no restaurants and multiple restaurants states

Preferred test levels:

- service or context tests for API mapping and restaurant resolution
- page integration tests with `HttpTestingController` or the repo's current HTTP testing pattern

### Backend

Only rerun backend verification if contract adjustments are required while integrating frontend.

## Rollout Order

1. Add frontend restaurant API models and service
2. Add restaurant context store with automatic single-restaurant resolution
3. Connect layout page read flow to the context and `GET floors`
4. Connect layout write flows to `POST`, `PATCH`, and `PUT`
5. Add or update focused frontend tests
6. Run frontend verification
7. Run backend verification only if backend files changed

## Risks and Mitigations

### Risk: current layout page is tightly coupled to mock state

Mitigation:

- keep the existing UI interactions
- replace data boundaries incrementally
- adapt the store rather than rewriting the page wholesale

### Risk: future multi-restaurant support may need selector UI

Mitigation:

- keep multiple-restaurant state explicit in the context
- do not hardcode demo ids
- defer selector UX instead of pretending it does not exist

### Risk: backend and frontend floor models may not align perfectly

Mitigation:

- add a dedicated API mapping layer
- make tests prove the mapping rather than scattering shape assumptions across components

## Success Criteria

- `/restaurant-pos/layout` renders using backend restaurant and floor data
- demo and single-restaurant users do not need to choose a restaurant
- add element, resize floor, and reorder element flows persist through backend endpoints
- the page remains usable when API loading or mutation errors occur
- frontend tests cover the new context resolution and at least the primary layout interactions

## Future Follow-Ups

- add `DELETE /api/v1/restaurants/:id/floors/:floorId/elements/:elementId`
- extend the same restaurant context to service and reservations
- introduce restaurant selection UI when multiple restaurants are returned
- replace demo-backed backend adapters with Prisma-backed repositories when ready
