/*
  Warnings:

  - You are about to drop the `tasks` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterTable
ALTER TABLE "orders" ALTER COLUMN "guestCount" DROP DEFAULT;

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "lastName" DROP DEFAULT;

-- DropTable
DROP TABLE "tasks";

-- DropEnum
DROP TYPE "TaskStatus";

-- RenameIndex
ALTER INDEX "restaurant_product_modifier_groups_restaurantProductId_modifier" RENAME TO "restaurant_product_modifier_groups_restaurantProductId_modi_key";

-- RenameIndex
ALTER INDEX "restaurant_product_modifier_groups_restaurantProductId_sortO_ke" RENAME TO "restaurant_product_modifier_groups_restaurantProductId_sort_key";

-- RenameIndex
ALTER INDEX "user_role_assignments_userId_roleId_scopeType_organizationId_re" RENAME TO "user_role_assignments_userId_roleId_scopeType_organizationI_idx";
