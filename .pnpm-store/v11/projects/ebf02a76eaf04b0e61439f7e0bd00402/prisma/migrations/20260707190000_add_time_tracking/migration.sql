CREATE TYPE "TimeEntryStatus" AS ENUM ('open', 'closed', 'corrected');

CREATE TYPE "TimeEntryChangeRequestStatus" AS ENUM ('pending', 'approved', 'rejected');

CREATE TABLE "time_entries" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "restaurantId" TEXT NOT NULL,
  "clockInAt" TIMESTAMP(3) NOT NULL,
  "clockOutAt" TIMESTAMP(3),
  "clockInNote" TEXT,
  "clockOutNote" TEXT,
  "status" "TimeEntryStatus" NOT NULL DEFAULT 'open',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "time_entries_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "time_entry_change_requests" (
  "id" TEXT NOT NULL,
  "timeEntryId" TEXT NOT NULL,
  "restaurantId" TEXT NOT NULL,
  "requestedByUserId" TEXT NOT NULL,
  "requestedClockInAt" TIMESTAMP(3),
  "requestedClockOutAt" TIMESTAMP(3),
  "requestedClockInNote" TEXT,
  "requestedClockOutNote" TEXT,
  "reason" TEXT NOT NULL,
  "status" "TimeEntryChangeRequestStatus" NOT NULL DEFAULT 'pending',
  "reviewedByUserId" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "reviewNote" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "time_entry_change_requests_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "time_entries_restaurantId_userId_clockInAt_idx" ON "time_entries"("restaurantId", "userId", "clockInAt");
CREATE INDEX "time_entries_restaurantId_status_createdAt_idx" ON "time_entries"("restaurantId", "status", "createdAt");
CREATE INDEX "time_entry_change_requests_restaurantId_status_createdAt_idx" ON "time_entry_change_requests"("restaurantId", "status", "createdAt");
CREATE INDEX "time_entry_change_requests_timeEntryId_createdAt_idx" ON "time_entry_change_requests"("timeEntryId", "createdAt");

ALTER TABLE "time_entries"
ADD CONSTRAINT "time_entries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "time_entries"
ADD CONSTRAINT "time_entries_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "time_entry_change_requests"
ADD CONSTRAINT "time_entry_change_requests_timeEntryId_fkey" FOREIGN KEY ("timeEntryId") REFERENCES "time_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "time_entry_change_requests"
ADD CONSTRAINT "time_entry_change_requests_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "time_entry_change_requests"
ADD CONSTRAINT "time_entry_change_requests_requestedByUserId_fkey" FOREIGN KEY ("requestedByUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "time_entry_change_requests"
ADD CONSTRAINT "time_entry_change_requests_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE UNIQUE INDEX "time_entries_one_open_per_user_restaurant" ON "time_entries"("userId", "restaurantId") WHERE "status" = 'open';
