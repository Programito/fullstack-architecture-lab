CREATE TYPE "OrderStatus" AS ENUM ('open', 'pending_payment', 'paid', 'cancelled');
CREATE TYPE "OrderLineStatus" AS ENUM ('pending', 'preparing', 'ready', 'served', 'cancelled');
CREATE TYPE "OrderDiscountType" AS ENUM ('percentage', 'fixed_amount');
CREATE TYPE "PaymentMethod" AS ENUM ('cash', 'card', 'bizum', 'other');
CREATE TYPE "PaymentStatus" AS ENUM ('pending', 'completed', 'failed', 'refunded');

CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "tableId" TEXT,
    "status" "OrderStatus" NOT NULL DEFAULT 'open',
    "openedByUserId" TEXT NOT NULL,
    "subtotalCents" INTEGER NOT NULL,
    "discountTotalCents" INTEGER NOT NULL DEFAULT 0,
    "totalCents" INTEGER NOT NULL,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "order_lines" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "restaurantProductId" TEXT,
    "productId" TEXT,
    "productNameSnapshot" TEXT NOT NULL,
    "productTypeSnapshot" "ProductType" NOT NULL,
    "basePriceCentsSnapshot" INTEGER NOT NULL,
    "unitPriceCents" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "subtotalCents" INTEGER NOT NULL,
    "status" "OrderLineStatus" NOT NULL DEFAULT 'pending',
    "kitchenNote" TEXT,
    "configurationSignature" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_lines_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "order_line_modifiers" (
    "id" TEXT NOT NULL,
    "orderLineId" TEXT NOT NULL,
    "groupNameSnapshot" TEXT NOT NULL,
    "optionNameSnapshot" TEXT NOT NULL,
    "priceDeltaCents" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "order_line_modifiers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "order_line_combo_slots" (
    "id" TEXT NOT NULL,
    "orderLineId" TEXT NOT NULL,
    "slotNameSnapshot" TEXT NOT NULL,
    "selectedProductNameSnapshot" TEXT NOT NULL,
    "supplementPriceCents" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "order_line_combo_slots_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "order_line_platter_components" (
    "id" TEXT NOT NULL,
    "orderLineId" TEXT NOT NULL,
    "componentNameSnapshot" TEXT NOT NULL,
    "removed" BOOLEAN NOT NULL DEFAULT false,
    "replacementNameSnapshot" TEXT,
    "priceDeltaCents" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "order_line_platter_components_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "order_discounts" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "type" "OrderDiscountType" NOT NULL,
    "value" DECIMAL(10,2) NOT NULL,
    "reason" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_discounts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "status" "PaymentStatus" NOT NULL,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "orders_restaurantId_status_createdAt_idx" ON "orders"("restaurantId", "status", "createdAt");
CREATE INDEX "orders_openedByUserId_createdAt_idx" ON "orders"("openedByUserId", "createdAt");
CREATE INDEX "order_lines_orderId_status_createdAt_idx" ON "order_lines"("orderId", "status", "createdAt");
CREATE INDEX "order_lines_orderId_configurationSignature_idx" ON "order_lines"("orderId", "configurationSignature");
CREATE INDEX "order_line_modifiers_orderLineId_idx" ON "order_line_modifiers"("orderLineId");
CREATE INDEX "order_line_combo_slots_orderLineId_idx" ON "order_line_combo_slots"("orderLineId");
CREATE INDEX "order_line_platter_components_orderLineId_idx" ON "order_line_platter_components"("orderLineId");
CREATE INDEX "order_discounts_orderId_createdAt_idx" ON "order_discounts"("orderId", "createdAt");
CREATE INDEX "payments_orderId_status_createdAt_idx" ON "payments"("orderId", "status", "createdAt");

ALTER TABLE "orders"
ADD CONSTRAINT "orders_restaurantId_fkey"
FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "orders"
ADD CONSTRAINT "orders_openedByUserId_fkey"
FOREIGN KEY ("openedByUserId") REFERENCES "users"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "order_lines"
ADD CONSTRAINT "order_lines_orderId_fkey"
FOREIGN KEY ("orderId") REFERENCES "orders"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "order_lines"
ADD CONSTRAINT "order_lines_restaurantProductId_fkey"
FOREIGN KEY ("restaurantProductId") REFERENCES "restaurant_products"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "order_lines"
ADD CONSTRAINT "order_lines_productId_fkey"
FOREIGN KEY ("productId") REFERENCES "products"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "order_line_modifiers"
ADD CONSTRAINT "order_line_modifiers_orderLineId_fkey"
FOREIGN KEY ("orderLineId") REFERENCES "order_lines"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "order_line_combo_slots"
ADD CONSTRAINT "order_line_combo_slots_orderLineId_fkey"
FOREIGN KEY ("orderLineId") REFERENCES "order_lines"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "order_line_platter_components"
ADD CONSTRAINT "order_line_platter_components_orderLineId_fkey"
FOREIGN KEY ("orderLineId") REFERENCES "order_lines"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "order_discounts"
ADD CONSTRAINT "order_discounts_orderId_fkey"
FOREIGN KEY ("orderId") REFERENCES "orders"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "order_discounts"
ADD CONSTRAINT "order_discounts_createdByUserId_fkey"
FOREIGN KEY ("createdByUserId") REFERENCES "users"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "payments"
ADD CONSTRAINT "payments_orderId_fkey"
FOREIGN KEY ("orderId") REFERENCES "orders"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
