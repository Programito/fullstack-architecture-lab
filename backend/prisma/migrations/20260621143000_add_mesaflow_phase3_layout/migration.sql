CREATE TYPE "FloorElementType" AS ENUM ('table', 'bar', 'kitchen', 'bathroom', 'entrance', 'blocked', 'stool');
CREATE TYPE "TableShape" AS ENUM ('round', 'square', 'rectangle', 'long');

CREATE TABLE "restaurant_floors" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rows" INTEGER NOT NULL,
    "columns" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "restaurant_floors_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "restaurant_tables" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "tableNumber" INTEGER NOT NULL,
    "name" TEXT,
    "capacity" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "restaurant_tables_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "floor_elements" (
    "id" TEXT NOT NULL,
    "floorId" TEXT NOT NULL,
    "type" "FloorElementType" NOT NULL,
    "tableId" TEXT,
    "label" TEXT NOT NULL,
    "x" INTEGER NOT NULL,
    "y" INTEGER NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "shape" "TableShape",
    "sortOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "floor_elements_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "restaurant_floors_restaurantId_name_key" ON "restaurant_floors"("restaurantId", "name");
CREATE UNIQUE INDEX "restaurant_tables_restaurantId_tableNumber_key" ON "restaurant_tables"("restaurantId", "tableNumber");
CREATE UNIQUE INDEX "floor_elements_floorId_label_key" ON "floor_elements"("floorId", "label");
CREATE UNIQUE INDEX "floor_elements_floorId_sortOrder_key" ON "floor_elements"("floorId", "sortOrder");

ALTER TABLE "restaurant_floors"
ADD CONSTRAINT "restaurant_floors_restaurantId_fkey"
FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "restaurant_tables"
ADD CONSTRAINT "restaurant_tables_restaurantId_fkey"
FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "floor_elements"
ADD CONSTRAINT "floor_elements_floorId_fkey"
FOREIGN KEY ("floorId") REFERENCES "restaurant_floors"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "floor_elements"
ADD CONSTRAINT "floor_elements_tableId_fkey"
FOREIGN KEY ("tableId") REFERENCES "restaurant_tables"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
