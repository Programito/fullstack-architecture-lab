-- Drop old unique constraint (name only)
DROP INDEX IF EXISTS "customers_organizationId_name_key";

-- Add reliability counters to customers
ALTER TABLE "customers"
  ADD COLUMN "visitCount"  INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "noShowCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "cancelCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "lateCount"   INTEGER NOT NULL DEFAULT 0;

-- Add arrivedLate flag to reservations
ALTER TABLE "reservations"
  ADD COLUMN "arrivedLate" BOOLEAN;

-- Add composite unique: name + phone per organization
CREATE UNIQUE INDEX "customers_organizationId_name_phone_key"
  ON "customers"("organizationId", "name", "phone");

-- Add unique: email per organization (NULLs are always distinct in PG)
CREATE UNIQUE INDEX "customers_organizationId_email_key"
  ON "customers"("organizationId", "email");
