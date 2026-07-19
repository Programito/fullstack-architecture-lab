# Restaurant POS Floor Loading State Design

## Summary

The restaurant POS layout and service routes must not render mock or stale table data while the
floor configuration is loading from the backend. Both routes will begin with an empty floor state
and show an in-place loading indicator until the backend response hydrates the shared store.

The backend remains the only source of truth. Local storage, offline caching, multi-terminal
coordination, and conflict detection are intentionally deferred.

## Goals

- Remove the initial mock floor and table configuration from runtime store state.
- Share an explicit `loading | loaded | error` floor-loading state across layout and service.
- Keep the floor area visually stable while data loads.
- Prevent floor interactions until backend data is available.
- Show a recoverable error state when loading fails.
- Ensure both routes render the same backend-backed configuration.

## Non-Goals

- No `localStorage` or other client-side persistence.
- No stale-while-revalidate behavior.
- No multi-terminal synchronization or version conflict handling.
- No changes to backend floor contracts.
- No redesign of the floor editor or service workflow.
- No loading treatment for order, payment, or reservation data beyond what is required to avoid
  rendering floor service points before the floor is loaded.

## Recommended Approach

Move floor loading status into the shared restaurant POS state boundary rather than managing it
independently in each page. The store starts with empty floor elements and restaurant tables. A
single load operation marks the floor as loading, requests the active restaurant's floor data,
hydrates the store on success, and exposes an error on failure.

Both layout and service consume this shared status:

- `loading`: render a spinner centered inside the reserved floor area
- `loaded`: render the real floor plan and enable interactions
- `error`: render an error message and retry action in the same area

This keeps route behavior consistent and avoids briefly exposing the mock configuration.

## Architecture

### Store state

The floor state owns:

- empty initial `floorElements` and `restaurantTables`
- nullable active floor metadata until hydration
- a loading status represented as `loading | loaded | error`
- an error value suitable for translating or presenting in the route

The store exposes read-only signals and explicit transitions for starting a load, accepting a
successful response, and recording a failure. Starting a fresh load clears the previous error.

### Loading coordinator

Floor retrieval should have one reusable owner in the restaurant POS state or data layer. It waits
for the active restaurant, calls `RestaurantPosApiService.getRestaurantFloors`, maps the response,
and updates the floor store.

The layout and service pages should not each create competing requests for the same restaurant.
Repeated consumers may call an idempotent `load` entry point, but the coordinator must reuse an
active or already completed load for the same restaurant unless retry or refresh is explicitly
requested.

### Route presentation

The existing floor-plan container remains mounted or reserves a comparable minimum height during
loading and error states. This avoids a large layout shift when the backend response arrives.

While loading:

- show a visible spinner and accessible loading text
- expose the busy state with `aria-busy="true"`
- do not render interactive tables or layout editing controls

On error:

- replace the spinner with a concise error message
- provide a native retry button
- keep table and editing interactions unavailable

On success:

- render the hydrated floor plan
- enable the controls appropriate to layout or service
- remove the busy state

## Data Flow

1. The restaurant context resolves the active restaurant.
2. The floor loader transitions to `loading`.
3. The shared floor state remains empty while the request is pending.
4. The API requests the restaurant floors from the backend.
5. On success, the first supported floor and its tables hydrate the store and status becomes
   `loaded`.
6. On failure, the state stays empty, status becomes `error`, and the route offers retry.
7. Retry repeats the request for the current active restaurant.

If the backend returns no floors, treat this as an explicit empty result rather than an indefinite
loading state. The route should show a suitable empty message; it must not fall back to mock data.

## Error Handling

- Restaurant context errors continue to use the restaurant-context error handling.
- Floor request errors produce the shared floor `error` state.
- A retry starts a new request and returns the view to `loading`.
- A malformed or unsupported response must not partially hydrate the floor.
- Navigating between layout and service after a successful load reuses the hydrated state for the
  same restaurant.

## Testing Strategy

Implement with focused frontend tests covering:

- floor store starts with no floor elements or restaurant tables
- loading transition clears prior floor data and errors when the active restaurant changes
- layout route shows the loading state before the floor response
- service route shows the loading state before the floor response
- neither route renders mock tables while loading
- successful response hydrates the store and reveals the floor
- failed response shows an accessible error and retry action
- retry issues a new request and can reach the loaded state
- an empty floor response exits loading without showing mock data
- layout and service do not duplicate the same in-flight request

Run the focused Vitest specs first, then the frontend build and the wider frontend test suite as
appropriate. Storybook verification is only required if shared UI component stories or MDX docs
change.

## Risks and Mitigations

### Duplicate requests from layout and service

Keep loading ownership in a shared coordinator and make normal loads idempotent per restaurant.

### Layout shift when data arrives

Reserve the floor viewport dimensions while showing loading and error states.

### Loading state that never resolves for an empty response

Model an empty backend result explicitly and always leave `loading` after a completed request.

### Mock data leaking into production behavior

Remove mock values from store initialization. Keep fixtures available only to tests and stories
that import them explicitly.

## Success Criteria

- Layout and service initially show a spinner instead of mock tables.
- The floor area does not noticeably jump when real data renders.
- Real backend data replaces the loading state on success.
- Users can retry a failed floor request.
- Floor interactions are unavailable before a successful load.
- Navigation between layout and service does not trigger redundant in-flight floor requests.
- No local storage or multi-terminal synchronization is introduced.
