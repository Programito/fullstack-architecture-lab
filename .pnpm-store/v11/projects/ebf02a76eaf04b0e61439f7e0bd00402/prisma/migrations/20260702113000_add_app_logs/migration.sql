-- CreateEnum
CREATE TYPE "LogSource" AS ENUM ('backend', 'frontend');

-- CreateEnum
CREATE TYPE "LogCategory" AS ENUM ('request', 'error', 'audit', 'client');

-- CreateEnum
CREATE TYPE "LogLevel" AS ENUM ('info', 'warn', 'error');

-- CreateTable
CREATE TABLE "app_logs" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" "LogSource" NOT NULL,
    "category" "LogCategory" NOT NULL,
    "level" "LogLevel" NOT NULL,
    "event" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "requestId" TEXT,
    "userId" TEXT,
    "restaurantId" TEXT,
    "method" TEXT,
    "path" TEXT,
    "statusCode" INTEGER,
    "durationMs" INTEGER,
    "metadata" JSONB,

    CONSTRAINT "app_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "app_logs_timestamp_idx" ON "app_logs"("timestamp");

-- CreateIndex
CREATE INDEX "app_logs_category_timestamp_idx" ON "app_logs"("category", "timestamp");

-- CreateIndex
CREATE INDEX "app_logs_level_timestamp_idx" ON "app_logs"("level", "timestamp");

-- CreateIndex
CREATE INDEX "app_logs_userId_timestamp_idx" ON "app_logs"("userId", "timestamp");

-- CreateIndex
CREATE INDEX "app_logs_restaurantId_timestamp_idx" ON "app_logs"("restaurantId", "timestamp");
