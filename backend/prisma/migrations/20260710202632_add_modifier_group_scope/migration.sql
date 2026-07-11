-- CreateEnum
CREATE TYPE "ModifierGroupScope" AS ENUM ('shared', 'product');

-- AlterTable
ALTER TABLE "modifier_groups" ADD COLUMN     "ownerRestaurantProductId" TEXT,
ADD COLUMN     "scope" "ModifierGroupScope" NOT NULL DEFAULT 'shared';

-- CreateIndex
CREATE INDEX "modifier_groups_organizationId_scope_idx" ON "modifier_groups"("organizationId", "scope");

-- AddForeignKey
ALTER TABLE "modifier_groups" ADD CONSTRAINT "modifier_groups_ownerRestaurantProductId_fkey" FOREIGN KEY ("ownerRestaurantProductId") REFERENCES "restaurant_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
