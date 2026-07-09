-- CreateEnum
CREATE TYPE "Allergen" AS ENUM ('gluten', 'crustaceans', 'eggs', 'fish', 'peanuts', 'soybeans', 'milk', 'nuts', 'celery', 'mustard', 'sesame', 'sulphites', 'lupin', 'molluscs');

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "allergens" "Allergen"[] DEFAULT ARRAY[]::"Allergen"[];
