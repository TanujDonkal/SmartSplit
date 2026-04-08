ALTER TABLE "expenses"
ADD COLUMN "receipt_storage_key" TEXT;

ALTER TABLE "friend_expenses"
ADD COLUMN "receipt_storage_key" TEXT;
