CREATE TYPE "AccountType" AS ENUM ('regular', 'demo', 'system', 'test');

ALTER TABLE "users"
ADD COLUMN "accountType" "AccountType" NOT NULL DEFAULT 'regular';
