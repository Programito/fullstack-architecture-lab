# Restaurant POS Service Served and Payment UX Design

## Summary

This design refines the `/restaurant-pos/service` flow in three small but connected ways:

- replace the current all-or-nothing `mark served` action with a multi-select served flow that can still serve everything quickly
- add a loading spinner to the `charge` button while the existing charge flow is running
- show a clear `paid` indicator plus an in-table `last payment` history block until the table moves to cleaning or is freed

The goal is to improve real service-floor usability without breaking the current backend contract, the persistent payment flow, or the mobile customer app payment behavior.

## Goals

- Let staff mark specific products as served from the service table panel.
- Keep a fast path to mark all servable lines as served.
- Show a spinner only on the `charge` button while charging is in progress.
- Keep paid context visible on the table until cleaning or free-table transition.
- Preserve compatibility with the current persistent order payment flow.
- Explicitly avoid regressions for orders opened from mobile (`clientOrigin = 'apk-customer'`).

## Non-Goals

- No redesign of the overall service page layout.
- No new cross-table payment history screen.
- No change to the mobile app payment contract or payment semantics.
- No change to payment registration payloads or order payment persistence rules.
- No full audit log beyond the current table-local `last payment` view.

## Current Context

Today the service page behaves like this:

- `mark served` marks every non-served active line on the selected table
- `charge` runs the existing backend charge plus payment registration flow, but the UI does not expose loading state
- paid tables can be identified by status, but the panel does not clearly preserve a readable payment summary until cleanup

Important existing coupling:

- the frontend service page currently calls `POST /service-points/:tableId/charge`
- then it calls `POST /orders/:orderId/payments`
- order responses already include `payments`
- order and service-order DTOs already carry `clientOrigin`, including `apk-customer`

This means the safest change is to preserve the current payment flow and extend only the UI behavior around it.

## Recommended Approach

Use one entry point for served actions, one lightweight loading state for charge, and one paid-state summary block in the panel.

Concretely:

- keep a single `Mark served` action in the kitchen section
- when pressed, enter a short-lived multi-select mode for servable lines
- include `Select all` so the current “serve everything” behavior remains one quick action away
- keep charge behavior unchanged at API level, but expose a button-level loading state
- when the table is `paid`, replace primary payment actions with a read-only `Paid` summary and `Last payment` block

This gives the least disruptive UX improvement while keeping backend and mobile payment behavior stable.

## Architecture

### 1. Served flow

Frontend:

- add local UI state for `servedSelectionMode`
- track `selectedServedLineIds`
- expose derived helpers for:
  - servable lines
  - selected line count
  - whether all servable lines are selected

Backend:

- extend the existing `mark served` endpoint to accept optional `lineIds`
- if `lineIds` is omitted or empty, preserve current behavior and mark all active non-served lines
- if `lineIds` is present, mark only those lines as served

Compatibility rule:

- the existing frontend and any other client that calls the endpoint without a body must continue to work unchanged

### 2. Charge loading state

Frontend only:

- add a local `isCharging` flag on the service page
- set it when charge starts
- clear it on success and error
- pass it to the panel charge button so the spinner is shown only there

Behavior rule:

- do not block the whole payment section
- do not alter the existing sequence:
  1. charge service point
  2. register order payment
  3. refresh service point and order state

### 3. Paid indicator and last payment block

Frontend:

- map the latest completed payment from the persistent order response
- surface it in the panel only when table status is `paid`
- show:
  - paid badge or strong paid label
  - total paid
  - payment method
  - payment time
  - read-only order summary for what was just paid

Visibility rule:

- the `Last payment` block remains visible while the table stays `paid`
- it disappears once the table moves to `cleaning` or is freed

Fallback rule:

- if a paid table has no completed payment in the mapped order data, still show `Paid` with the paid total and hide method/time gracefully

## UX Flow

### Mark served

1. Staff presses `Mark served`
2. The order lines enter served-selection mode
3. Only servable lines can be selected
4. A compact action bar appears with:
   - `Select all`
   - selected count
   - `Confirm served`
   - `Cancel`
5. Confirm sends only selected lines
6. If all servable lines were selected, the operational result matches the old “serve everything” flow

### Charge

1. Staff presses `Charge`
2. The charge button shows loading spinner and disabled state
3. Existing kitchen-confirm flow still runs if there are pending kitchen items
4. Existing payment registration flow remains unchanged
5. On success, the table moves to `paid`

### Paid table

1. Panel header shows `Paid`
2. Payment section becomes read-only
3. `Last payment` block shows the most recent successful payment context
4. Cleaning and free-table actions remain the closing path

## Mobile Compatibility Guardrails

These changes must not affect the mobile customer app payment behavior.

Guardrails:

- do not change `registerRestaurantOrderPayment` request shape
- do not change charge-to-payment call ordering
- do not change `clientOrigin` semantics or filtering
- do not change how completed payments are persisted or returned in `RestaurantOrderDto`
- do not infer mobile-specific payment behavior from the new service-page UI states

Specific risk to avoid:

- a UI refactor that accidentally skips `registerRestaurantOrderPayment` after charging would leave desktop appearing paid while the persistent order payment history is incomplete, which could affect downstream consumers including mobile-related order visibility or staff review flows

## Component and File Boundaries

### Frontend files likely to change

- `frontend/src/app/features/restaurant-pos/pages/restaurant-pos-service-page/restaurant-pos-service-page.ts`
- `frontend/src/app/features/restaurant-pos/pages/restaurant-pos-service-page/restaurant-pos-service-page.spec.ts`
- `frontend/src/app/features/restaurant-pos/components/service-table-panel/service-table-panel.ts`
- `frontend/src/app/features/restaurant-pos/components/service-table-panel/service-table-panel.html`
- `frontend/src/app/features/restaurant-pos/components/service-table-panel/service-table-panel.spec.ts`
- `frontend/src/app/features/restaurant-pos/api/restaurant-pos-api.models.ts`
- `frontend/src/app/features/restaurant-pos/api/restaurant-pos-api.service.ts`
- `frontend/src/app/features/restaurant-pos/api/restaurant-pos-api.mappers.ts`
- `frontend/src/app/features/restaurant-pos/models/order.models.ts`
- `frontend/src/app/features/restaurant-pos/models/service.models.ts`

### Backend files likely to change

- `backend/src/restaurants/application/use-cases/mark-restaurant-service-point-order-served.use-case.ts`
- `backend/src/restaurants/application/use-cases/mark-restaurant-service-point-order-served.use-case.spec.ts`
- the REST controller or DTO layer that exposes `mark served`

### Backend files not expected to change

- payment persistence use cases
- mobile-origin resolution logic
- order payment DTO semantics

## Data Contract Changes

### Mark served request

Add an optional request body for the service-point mark-served endpoint:

- `lineIds?: string[]`

Semantics:

- omitted or empty: serve all active non-cancelled non-served lines
- present: serve only matching eligible lines

Validation:

- ignore lines that are already served or cancelled
- reject invalid requests only when no eligible target lines remain

### Order payment mapping

No backend contract change is required for payments if `RestaurantOrderDto.payments` already contains:

- `method`
- `amountCents`
- `status`
- `paidAt`

Frontend will map the latest `completed` payment only.

## Error Handling

### Mark served

- if no eligible lines are selected, keep the user in selection mode and show a clear inline message
- if the API call fails, exit loading state, keep current UI consistent, and reload table data from backend

### Charge

- if charge fails, clear the button spinner and preserve the current error message behavior
- if card flow fails, keep the current rejected-gateway behavior

### Paid summary

- if payment metadata is incomplete, show a reduced paid summary rather than hiding paid state entirely

## Testing Strategy

### Frontend

Add focused tests for:

- entering and leaving served-selection mode
- selecting individual servable lines
- `Select all` selecting all eligible lines
- confirming partial served sends only selected `lineIds`
- confirming all eligible lines still works like current full serve flow
- charge button shows loading only during the in-flight charge flow
- payment section shows `Paid` plus `Last payment` for paid tables
- payment summary hides gracefully when payment metadata is incomplete

Mobile safety tests:

- ensure the service-page charge flow still calls both `chargeRestaurantServicePoint` and `registerRestaurantOrderPayment`
- ensure mapped `clientOrigin` remains unchanged for orders opened from `apk-customer`

### Backend

Add focused tests for:

- serving all lines when `lineIds` is omitted
- serving only selected eligible lines when `lineIds` is provided
- rejecting the request when no eligible lines remain
- preserving current behavior for existing callers with no request body

Do not broaden payment backend changes unless a test proves a real gap.

## Rollout Order

1. Add mark-served request DTO with optional `lineIds`
2. Extend backend use case and tests for partial-serve behavior
3. Extend frontend API client to send optional `lineIds`
4. Add served-selection UI state and panel interactions
5. Add button-level charge loading state
6. Map latest completed payment and render `Paid` plus `Last payment`
7. Run focused frontend and backend verification

## Risks and Mitigations

### Risk: partial served flow adds too much UI noise

Mitigation:

- keep selection mode hidden until the user explicitly presses `Mark served`
- keep permanent line actions unchanged unless they already exist

### Risk: the paid summary duplicates stale order data

Mitigation:

- derive the display from the latest refreshed persistent order payload
- only show the block in `paid`

### Risk: mobile-related payment behavior regresses indirectly

Mitigation:

- do not touch payment request contracts
- add explicit regression tests around charge plus payment registration sequence
- keep `clientOrigin` mapping unchanged

## Success Criteria

- staff can mark one, many, or all eligible products as served from the service panel
- charging shows a spinner only on the charge button
- paid tables clearly display paid state and last payment context until cleaning or free-table
- existing charge plus payment registration sequence remains intact
- no regression is introduced for orders opened from the mobile customer app

## Future Follow-Ups

- support multiple completed payments in a richer table-local timeline if partial payments become a real workflow
- expose paid summaries in dashboard or closing analytics if operations ask for it
- unify payment summary rendering across service, reservations, and future checkout views if the same pattern repeats
