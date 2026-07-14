ALTER TABLE "app_logs"
ADD COLUMN "organizationId" TEXT;

CREATE INDEX "app_logs_organizationId_timestamp_idx" ON "app_logs"("organizationId", "timestamp");
