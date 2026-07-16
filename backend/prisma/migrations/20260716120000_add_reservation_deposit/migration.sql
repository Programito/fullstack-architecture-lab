ALTER TABLE "reservations"
ADD COLUMN "depositAmountCents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "depositPaidAt" TIMESTAMP(3);
