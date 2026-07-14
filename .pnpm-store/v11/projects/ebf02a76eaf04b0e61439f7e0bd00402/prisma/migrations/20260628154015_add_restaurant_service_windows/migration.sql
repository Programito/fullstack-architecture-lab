-- CreateTable
CREATE TABLE "restaurant_service_windows" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "restaurant_service_windows_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "restaurant_service_windows_restaurantId_idx" ON "restaurant_service_windows"("restaurantId");

-- AddForeignKey
ALTER TABLE "restaurant_service_windows" ADD CONSTRAINT "restaurant_service_windows_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
