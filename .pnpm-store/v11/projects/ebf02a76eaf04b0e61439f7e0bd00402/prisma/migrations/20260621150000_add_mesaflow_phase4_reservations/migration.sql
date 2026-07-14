CREATE TYPE "ReservationStatus" AS ENUM ('pending', 'confirmed', 'seated', 'cancelled', 'no_show');

CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "reservations" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "customerId" TEXT,
    "customerNameSnapshot" TEXT NOT NULL,
    "customerPhoneSnapshot" TEXT,
    "partySize" INTEGER NOT NULL,
    "reservationAt" TIMESTAMP(3) NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "status" "ReservationStatus" NOT NULL DEFAULT 'pending',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reservations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "reservation_tables" (
    "reservationId" TEXT NOT NULL,
    "tableId" TEXT NOT NULL,

    CONSTRAINT "reservation_tables_pkey" PRIMARY KEY ("reservationId","tableId")
);

CREATE UNIQUE INDEX "customers_organizationId_name_key" ON "customers"("organizationId", "name");
CREATE INDEX "reservations_restaurantId_reservationAt_status_idx" ON "reservations"("restaurantId", "reservationAt", "status");

ALTER TABLE "customers"
ADD CONSTRAINT "customers_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "reservations"
ADD CONSTRAINT "reservations_restaurantId_fkey"
FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "reservations"
ADD CONSTRAINT "reservations_customerId_fkey"
FOREIGN KEY ("customerId") REFERENCES "customers"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "reservation_tables"
ADD CONSTRAINT "reservation_tables_reservationId_fkey"
FOREIGN KEY ("reservationId") REFERENCES "reservations"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "reservation_tables"
ADD CONSTRAINT "reservation_tables_tableId_fkey"
FOREIGN KEY ("tableId") REFERENCES "restaurant_tables"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
