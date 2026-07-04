-- Prevents more than one active (open or pending_payment) order per table.
-- Application code checks this first via findActiveByTable, but this index
-- is the source of truth under concurrent requests (see OpenRestaurantOrderUseCase,
-- which recovers from the resulting P2002 by re-reading the winning order).
CREATE UNIQUE INDEX "orders_one_active_per_table"
ON "orders" ("tableId")
WHERE "status" IN ('open', 'pending_payment');
