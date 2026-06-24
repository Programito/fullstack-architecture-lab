# Restaurant Order Write Flow Design

## Summary

This design adds persistent order writing to the MesaFlow restaurant service flow. It closes the
current gap where Angular can display locally added products while the backend still sees an empty
or nonexistent order.

The backend becomes the source of truth for:

- active orders by service point
- configured order lines
- catalog prices, supplements, taxes, and snapshots
- line lifecycle and cancellation history
- partial and completed payments
- order totals and remaining balance

The implementation will extend the existing NestJS clean-architecture module and Prisma schema
without replacing the current service-floor read model.

## Goals

- Open or recover the active order for a restaurant table.
- Persist simple products, modifiers, combos, and platters as complete order lines.
- Allow pending lines to be updated or removed.
- Allow sent lines to be cancelled with a mandatory reason.
- Register multiple partial payments using different payment methods.
- Make the existing `charge` action record a real payment.
- Return the complete updated order after every write so Angular can replace local state.
- Preserve the current restaurant, service-floor, kitchen, served, and auth behavior.

## Non-Goals

- Tips, cash change, refunds, or payment-provider integration.
- Splitting individual lines between diners.
- Nested modifiers inside combo selections.
- Editing a line after it has been sent to the kitchen.
- Restoring a physically deleted pending line.
- Automatic promotions, stock deductions, cash sessions, or accounting reconciliation.
- Closing and cleaning the table after payment.

## Recommended Approach

Use separate application use cases for each command, backed by one order write port and a
Prisma implementation. Each use case owns one business operation, while shared domain policies
handle price calculation, line mutability, cancellation, and payment balance.

This approach fits the current `domain / application / infrastructure / presentation` structure,
keeps controllers thin, and avoids placing business rules in Prisma queries or Angular.

Alternative approaches considered:

1. Direct controller CRUD would require fewer files but would distribute validation and state
   transitions across HTTP and persistence layers.
2. Loading and saving a single large order aggregate would strengthen domain encapsulation but
   would add unnecessary mapping and concurrency complexity for the current feature size.

## Architecture

### Presentation

The existing restaurants controller will expose versioned endpoints under `/api/v1`. DTOs validate
the request shape, positive quantities and amounts, supported payment methods, and mandatory
cancellation reasons.

HTTP validation only checks request syntax. Catalog membership, selection rules, line state, and
payment balance remain application or domain rules.

### Application

Add focused use cases for:

- opening or recovering an active order
- adding a configured line
- updating a pending line
- deleting a pending line
- cancelling a non-pending active line
- registering a payment
- charging a service point through the same payment operation

Use cases verify that all referenced entities belong to the same restaurant context before
performing a write.

### Domain

Domain policies define:

- which order is active
- which lines may be edited, deleted, or cancelled
- how catalog selections become an immutable line snapshot
- how subtotal, tax, total, paid amount, and balance are calculated
- when an order changes to `pending_payment` or `paid`

Cancelled lines remain in history but do not contribute to current totals. Pending lines that are
deleted are physically removed because they have not entered the operational kitchen flow.

Once the order has any completed payment, its lines and payable total are frozen. From that point,
the order only accepts additional payments until its balance reaches zero. This avoids creating an
implicit refund flow, which is outside this feature.

### Infrastructure

The Prisma write repository will execute each command atomically. It will load the catalog records
needed for price calculation and write the order line plus modifiers, combo slots, or platter
components in one transaction.

The repository must not trust price, tax, product name, or subtotal values supplied by Angular.

The current demo-backed service-floor repository may continue serving the operational projection
during the transition, but write operations and the resulting active-order response must use
persistent order data. The implementation plan must include the smallest synchronization change
needed so service-floor reads reflect these writes.

## Endpoint Contracts

All paths below are prefixed with `/api/v1`.

### Open or recover an order

`POST /restaurants/:id/service-points/:tableId/orders`

Request body:

```json
{
  "guestCount": 2
}
```

`guestCount` is optional when the current table state already supplies it.

Behavior:

- validate that the table belongs to the restaurant
- return the existing active order when one exists
- otherwise create an `open` order using the restaurant currency
- occupy the service point when necessary
- never create two active orders for the same table

Response:

- `201 Created` when a new order is created
- `200 OK` when the active order is recovered
- complete order representation in both cases

The operation is idempotent by restaurant and table while an active order exists.

### Add a configured line

`POST /restaurants/:id/orders/:orderId/lines`

Request body:

```json
{
  "restaurantProductId": "restaurant-product-1",
  "quantity": 2,
  "kitchenNote": "Sin cebolla",
  "modifiers": [
    {
      "modifierGroupId": "modifier-group-sauce",
      "modifierOptionId": "modifier-option-aioli",
      "quantity": 1
    }
  ],
  "comboSlots": [
    {
      "comboSlotId": "combo-slot-drink",
      "restaurantProductId": "restaurant-product-water",
      "quantity": 1
    }
  ],
  "platterComponents": [
    {
      "platterComponentId": "platter-component-fries",
      "included": false
    }
  ]
}
```

Rules:

- `quantity` must be a positive integer
- the order must be active and belong to the restaurant
- the order must not have any completed payment
- the restaurant product must be available for the same restaurant
- selections must match the product type and configured catalog relationships
- modifier minimums, maximums, required groups, and single-selection rules must pass
- required combo slots and their selection limits must pass
- platter adjustments may only target removable or replaceable components
- unused configuration arrays are empty or omitted

The backend resolves names, currency, base price, supplements, tax rate, and product configuration.
It stores immutable snapshots for the line and all selected children. Angular cannot submit
authoritative monetary fields.

Response: `201 Created` with the complete updated order.

### Update a pending line

`PATCH /restaurants/:id/orders/:orderId/lines/:lineId`

Request body:

```json
{
  "quantity": 3,
  "kitchenNote": "Sin cebolla y poca salsa"
}
```

At least one property is required. The line must be `pending`. Updating quantity recalculates its
totals from the stored unit snapshot; it does not reload a newer catalog price.

Configuration changes are deliberately excluded. Reconfiguring modifiers, combo slots, or platter
components requires deleting the pending line and adding a new one.

The order must not have any completed payment.

Response: `200 OK` with the complete updated order.

### Delete a pending line

`DELETE /restaurants/:id/orders/:orderId/lines/:lineId`

The line must be `pending`. It and its child snapshots are physically deleted in one transaction.
The order must not have any completed payment.

Response: `200 OK` with the complete updated order.

### Cancel a sent line

`POST /restaurants/:id/orders/:orderId/lines/:lineId/cancel`

Request body:

```json
{
  "reason": "El cliente cambia el pedido"
}
```

Rules:

- reason is required and must contain non-whitespace text
- the line must belong to the order and restaurant
- the line must have left `pending`
- an already served or cancelled line cannot be cancelled again
- the order must not have any completed payment

The line is retained with `cancelled` status, cancellation reason, and cancellation timestamp. Its
snapshot remains unchanged and it is excluded from payable totals.

Response: `200 OK` with the complete updated order.

### Register a payment

`POST /restaurants/:id/orders/:orderId/payments`

Request body:

```json
{
  "amountCents": 1500,
  "method": "card"
}
```

Supported methods initially follow the Prisma enum: `cash`, `card`, `bizum`, and `other`.

Rules:

- amount must be a positive integer
- the order must be active, payable, and belong to the restaurant
- amount cannot exceed the current balance
- completed payments contribute to the paid amount
- a partial payment leaves the order active and changes it to `pending_payment`
- the first completed payment freezes all existing lines and the payable total
- a payment that reduces balance to zero marks the order `paid`
- a paid order rejects additional payments

Response: `201 Created` with the complete updated order and its payments.

### Charge a service point

`POST /restaurants/:id/service-points/:tableId/charge`

Request body:

```json
{
  "amountCents": 2750,
  "method": "cash"
}
```

This remains the service-screen convenience endpoint. It resolves the active order for the table
and delegates to the same payment use case used by the canonical payments endpoint.

It supports partial payment. The table is marked `paid` only when the order balance reaches zero;
otherwise it remains in `payment_pending`. The previous behavior that marked an order paid without
persisting a payment is removed.

Response: `201 Created` with the updated service-point detail and order payment summary.

## Order Response

Every order write returns a common representation containing:

- order identity, restaurant, table, status, and timestamps
- currency, subtotal, tax, total, paid amount, and balance
- all lines including cancelled history
- line product, tax, and price snapshots
- modifier, combo-slot, and platter-component snapshots
- completed payments

This common response lets Angular replace its order state after every mutation instead of applying
optimistic monetary calculations.

## Price and Snapshot Rules

For a new line, the backend:

1. loads `restaurant_products` and the organization product
2. loads and validates the configured selections
3. calculates one configured unit price from base price plus supplements
4. calculates line subtotal using quantity
5. applies the product tax rate using the repository's agreed integer rounding policy
6. writes product, tax, selection-name, and price snapshots
7. recalculates order totals from non-cancelled lines

All monetary values are integer cents. The implementation plan must preserve the current Prisma
fields where possible and explicitly add only snapshot or cancellation fields that are missing.

## State Rules

### Order

- `open`: has no completed payment
- `pending_payment`: has at least one completed partial payment and a positive balance
- `paid`: completed payments equal the payable total
- `cancelled`: excluded from this feature's normal write operations

An active order is `open` or `pending_payment`.

An `open` order may add, update, delete, or cancel lines according to their individual states. A
`pending_payment` order has a frozen payable total and only accepts additional payments.

### Line

- `pending`: editable and deletable
- `preparing` or `ready`: not editable; cancellable with reason
- `served`: not editable, deletable, or cancellable
- `cancelled`: immutable and excluded from totals

The existing send-to-kitchen and mark-served operations must use these persisted statuses or a
clearly mapped equivalent. The implementation must not introduce a second conflicting line-state
vocabulary.

## Error Model

- `400 Bad Request`: malformed DTO, empty patch, non-positive quantity or amount
- `404 Not Found`: restaurant, table, order, line, product, or selection does not exist in the
  required restaurant context
- `409 Conflict`: state transition is not allowed, such as editing a sent line or paying a paid
  order; this also covers any line mutation after the first completed payment
- `422 Unprocessable Entity`: syntactically valid configuration violates catalog rules or payment
  amount exceeds the balance

Errors should use the existing application error mapping and return stable, testable messages or
codes. Internal catalog prices and unrelated tenant data must not be exposed by errors.

## Concurrency and Transactions

- Opening an order must be protected by a database constraint or serializable transaction so two
  requests cannot create two active orders for one table.
- Adding a line writes the parent and all child snapshots atomically.
- Updating, deleting, or cancelling a line locks or conditionally updates its expected current
  status.
- Registering a payment validates balance and writes the payment in the same transaction.
- Line mutations conditionally verify that the order still has no completed payment.
- Order totals and status are recalculated before the transaction commits.

The implementation plan must choose a concrete Prisma/PostgreSQL mechanism for active-order
uniqueness because a normal composite unique constraint cannot express a partial status condition.

## Angular Integration

Angular will call the endpoints in this order:

1. select or occupy a service point
2. open or recover its active order
3. submit complete configured lines
4. replace local order state with each backend response
5. update or delete pending lines through HTTP
6. cancel sent lines through the dedicated cancellation action
7. submit partial or final payments
8. refresh service-point and order projections after state transitions

The frontend may calculate preview totals for display, but backend responses always replace them.
Request models contain IDs, quantities, selections, notes, cancellation reasons, and payment
details, not authoritative prices.

## Testing Strategy

### Unit tests

- opening returns an existing active order instead of creating another
- line pricing uses backend catalog values
- modifier, combo, and platter validation policies
- pending-line edit and delete rules
- sent-line cancellation and mandatory reason
- partial payment, final payment, and overpayment rules
- freezing all line mutations after the first completed payment
- `charge` delegates to the payment operation

### Integration tests

Using Prisma and Testcontainers where available:

- transactionally persist a simple configured line and its snapshots
- persist modifiers, combo slots, and platter components
- recalculate totals after update, deletion, and cancellation
- prevent concurrent active orders for one table
- prevent two concurrent payments from exceeding the balance
- prevent a concurrent line mutation once the first payment completes
- preserve cancelled line history

### End-to-end tests

- open a new order and recover it idempotently
- add simple, modified, combo, and platter products
- reject cross-restaurant product and order references
- update quantity and note on a pending line
- delete a pending line
- reject editing a sent line
- cancel a sent line with reason and reject cancellation without reason
- make two partial payments with different methods
- complete the final payment and mark the order and table paid
- reject overpayment and payment after completion
- reject adding, editing, deleting, or cancelling lines after a partial payment
- verify `charge` persists a payment instead of only changing service state
- verify existing auth sessions and service-floor actions remain functional

### Frontend tests

- API service sends the approved request contracts
- adding a product opens or recovers an order before creating its first line
- backend order responses replace local line and total state
- edit, delete, cancellation, and payment actions call their endpoints
- failed writes preserve the last confirmed backend state and expose an actionable error

Testing Library action objects should continue encapsulating repeated page interactions.

## Documentation Changes

Update `backend/docs/service-floor-api.md` during implementation to:

- move order-writing endpoints out of future extensions
- document request and response examples
- replace the simulated `charge` description with real payment behavior
- add Mermaid flow diagrams for order, line, and payment state transitions
- align service status terminology with persisted Prisma enums

Mermaid diagrams must be validated using the repository documentation workflow.

## Rollout Order

1. Align Prisma fields and state vocabulary for snapshots, cancellation, and payment totals.
2. Add domain policies and write-port contracts.
3. Implement opening or recovering an order.
4. Implement adding a configured line.
5. Implement pending-line update and deletion.
6. Implement sent-line cancellation.
7. Implement payments and refactor `charge` to delegate to them.
8. Connect Angular API models, store actions, and service page.
9. Update service API documentation and Mermaid diagrams.
10. Run focused, integration, end-to-end, frontend, build, and documentation verification.

## Success Criteria

- Products displayed in Angular are persisted before they affect the payable order.
- Backend catalog data is the only authority for prices, taxes, supplements, and snapshots.
- Opening an order is idempotent for a table with an active order.
- Pending lines can be edited or deleted and sent lines can be cancelled with history.
- Partial payments are persisted and can use multiple methods.
- Neither payments nor `charge` can overpay an order.
- The order and table become paid only when the balance is zero.
- Existing service-floor reads, kitchen actions, auth sessions, and layout behavior remain passing.
