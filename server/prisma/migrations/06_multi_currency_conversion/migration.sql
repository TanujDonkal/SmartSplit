ALTER TABLE "expenses"
ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'CAD',
ADD COLUMN "exchange_rate_to_base" DECIMAL(12,6) NOT NULL DEFAULT 1,
ADD COLUMN "converted_amount" DECIMAL(10,2) NOT NULL DEFAULT 0;

UPDATE "expenses"
SET "converted_amount" = "amount"
WHERE "converted_amount" = 0;

ALTER TABLE "expense_splits"
ADD COLUMN "converted_amount_owed" DECIMAL(10,2) NOT NULL DEFAULT 0;

UPDATE "expense_splits" es
SET "converted_amount_owed" = es."amount_owed"
WHERE es."converted_amount_owed" = 0;

ALTER TABLE "friend_expenses"
ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'CAD',
ADD COLUMN "exchange_rate_to_base" DECIMAL(12,6) NOT NULL DEFAULT 1,
ADD COLUMN "converted_amount" DECIMAL(10,2) NOT NULL DEFAULT 0;

UPDATE "friend_expenses"
SET "converted_amount" = "amount"
WHERE "converted_amount" = 0;
