-- Normalize restaurant ID to stable value used by the service API
UPDATE "restaurants"
SET "id" = 'restaurant-mesaflow-centro'
WHERE "name" = 'MesaFlow Centro' AND "id" <> 'restaurant-mesaflow-centro';

-- Normalize table IDs to stable values matching the service-floor contract
UPDATE "restaurant_tables"
SET "id" = CASE
  WHEN "tableNumber" BETWEEN 1 AND 4 THEN 'table-' || "tableNumber"::text
  WHEN "tableNumber" BETWEEN 5 AND 7 THEN 'stool-' || ("tableNumber" - 4)::text
  ELSE "id"
END
WHERE "restaurantId" = 'restaurant-mesaflow-centro';

-- Add new columns to orders
ALTER TABLE "orders"
  ADD COLUMN "currency"    TEXT    NOT NULL DEFAULT 'EUR',
  ADD COLUMN "guestCount"  INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "taxCents"    INTEGER NOT NULL DEFAULT 0;

-- Add new columns to order_lines
ALTER TABLE "order_lines"
  ADD COLUMN "courseSnapshot"           "ProductCourse",
  ADD COLUMN "preparationRouteSnapshot" "PreparationRoute",
  ADD COLUMN "taxRateNameSnapshot"      TEXT,
  ADD COLUMN "taxRatePercentSnapshot"   DECIMAL(5,2),
  ADD COLUMN "taxCents"                 INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "cancellationReason"       TEXT,
  ADD COLUMN "cancelledAt"              TIMESTAMP(3);

-- Backfill courseSnapshot and preparationRouteSnapshot from the source product
UPDATE "order_lines" AS line
SET
  "courseSnapshot" = COALESCE(product."defaultCourse", 'other'::"ProductCourse"),
  "preparationRouteSnapshot" = COALESCE(product."defaultPreparationRoute", 'direct'::"PreparationRoute")
FROM "products" AS product
WHERE product."id" = line."productId";

-- Fill any remaining rows that had no product reference
UPDATE "order_lines"
SET
  "courseSnapshot" = COALESCE("courseSnapshot", 'other'::"ProductCourse"),
  "preparationRouteSnapshot" = COALESCE("preparationRouteSnapshot", 'direct'::"PreparationRoute");

-- Now make them NOT NULL
ALTER TABLE "order_lines"
  ALTER COLUMN "courseSnapshot" SET NOT NULL,
  ALTER COLUMN "preparationRouteSnapshot" SET NOT NULL;

-- Add quantity to modifier and combo-slot child tables
ALTER TABLE "order_line_modifiers"
  ADD COLUMN "quantity" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "order_line_combo_slots"
  ADD COLUMN "quantity" INTEGER NOT NULL DEFAULT 1;

-- Add foreign key from orders to restaurant_tables
ALTER TABLE "orders"
  ADD CONSTRAINT "orders_tableId_fkey"
  FOREIGN KEY ("tableId") REFERENCES "restaurant_tables"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Add business rule constraints
ALTER TABLE "orders"
  ADD CONSTRAINT "orders_guestCount_check" CHECK ("guestCount" > 0);
ALTER TABLE "orders"
  ADD CONSTRAINT "orders_money_check"
  CHECK ("subtotalCents" >= 0 AND "discountTotalCents" >= 0 AND "taxCents" >= 0 AND "totalCents" >= 0);
ALTER TABLE "order_lines"
  ADD CONSTRAINT "order_lines_quantity_check" CHECK ("quantity" > 0);
ALTER TABLE "payments"
  ADD CONSTRAINT "payments_amount_check" CHECK ("amountCents" > 0);

-- Partial unique index: only one active order per table at a time
CREATE UNIQUE INDEX "orders_one_active_per_table_idx"
  ON "orders" ("tableId")
  WHERE "tableId" IS NOT NULL AND "status" IN ('open', 'pending_payment');

-- Remove the temporary DEFAULT on currency now that existing rows are filled
ALTER TABLE "orders"
  ALTER COLUMN "currency" DROP DEFAULT;
