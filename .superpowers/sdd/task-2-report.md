# Task 2 Report: Frontend Payment Summary Model and Mark-Served API Support

## Status

DONE

## Implemented

- Added `MarkRestaurantServicePointServedRequest` with optional `lineIds`.
- Updated `markRestaurantServicePointServed` to accept an optional request, preserving the existing `{}` request body when omitted.
- Added `TableOrderPaymentSummary`, optional `payments`, and optional `lastCompletedPayment` to `TableOrder`.
- Added optional `paidSummary` metadata to `ServiceTableInfo` for later UI consumption.
- Mapped all order payments from cents to currency units and derived the latest completed payment without modifying payment registration, charge sequencing, `clientOrigin`, or backend DTO persistence behavior.

## Tests

### Red

The initial focused test run compiled the new tests and failed as expected:

- `lastCompletedPayment` was missing from the mapper return type.
- `markRestaurantServicePointServed` accepted only two arguments.

The task brief's positional command is not supported by the local Angular 21 CLI. The equivalent supported command was:

```powershell
pnpm test -- frontend --include=src/app/features/restaurant-pos/api/restaurant-pos-api.service.spec.ts
```

The initial run also compiled the mapper spec and reported both expected missing-contract errors.

### Green

```powershell
pnpm test -- frontend --include=src/app/features/restaurant-pos/api/restaurant-pos-api.service.spec.ts
```

Passed: 1 test file, 29 tests.

```powershell
pnpm test -- frontend --include=src/app/features/restaurant-pos/api/restaurant-pos-api.mappers.spec.ts
```

Passed: 1 test file, 27 tests.

`git diff --check` also passed.

## Scope and Constraints

- No payment request contracts were changed.
- No charge-to-payment ordering was changed.
- No `clientOrigin` mapping or filtering behavior was changed.
- No completed-payment persistence or `RestaurantOrderDto` return behavior was changed.
- Service page and service table panel files were not edited.

## Concerns

None. The full frontend suite and production build were not run because this task requests focused API/model coverage only; the Angular test build did type-check the application code used by these changes.
