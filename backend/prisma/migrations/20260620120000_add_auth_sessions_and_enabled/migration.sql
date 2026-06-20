ALTER TABLE "users" RENAME COLUMN "name" TO "firstName";
ALTER TABLE "users" ADD COLUMN "lastName" TEXT NOT NULL DEFAULT '';
ALTER TABLE "users" ADD COLUMN "enabled" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "roles" ADD COLUMN "enabled" BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE "auth_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "refreshTokenHash" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "absoluteExpiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auth_sessions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "auth_sessions_userId_enabled_idx" ON "auth_sessions"("userId", "enabled");

ALTER TABLE "auth_sessions"
ADD CONSTRAINT "auth_sessions_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
