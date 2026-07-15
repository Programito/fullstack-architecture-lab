-- CreateTable
CREATE TABLE "restaurant_product_modifier_option_overrides" (
    "id" TEXT NOT NULL,
    "restaurantProductId" TEXT NOT NULL,
    "modifierOptionId" TEXT NOT NULL,
    "priceDeltaCents" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "restaurant_product_modifier_option_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "restaurant_product_modifier_option_overrides_restaurantPro_key" ON "restaurant_product_modifier_option_overrides"("restaurantProductId", "modifierOptionId");

-- AddForeignKey
ALTER TABLE "restaurant_product_modifier_option_overrides" ADD CONSTRAINT "restaurant_product_modifier_option_overrides_restaurantProductId_fkey" FOREIGN KEY ("restaurantProductId") REFERENCES "restaurant_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restaurant_product_modifier_option_overrides" ADD CONSTRAINT "restaurant_product_modifier_option_overrides_modifierOptionId_fkey" FOREIGN KEY ("modifierOptionId") REFERENCES "modifier_options"("id") ON DELETE CASCADE ON UPDATE CASCADE;
