CREATE TYPE "FriendActivityType" AS ENUM ('EXPENSE', 'SETTLEMENT');

ALTER TABLE "expenses"
ADD COLUMN "note" TEXT,
ADD COLUMN "receipt_data" TEXT,
ADD COLUMN "incurred_on" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "friend_expenses"
ADD COLUMN "activity_type" "FriendActivityType" NOT NULL DEFAULT 'EXPENSE',
ADD COLUMN "note" TEXT,
ADD COLUMN "receipt_data" TEXT,
ADD COLUMN "incurred_on" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE TABLE "expense_comments" (
    "id" TEXT NOT NULL,
    "expense_id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expense_comments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "friend_expense_comments" (
    "id" TEXT NOT NULL,
    "friend_expense_id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "friend_expense_comments_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "expense_comments"
ADD CONSTRAINT "expense_comments_expense_id_fkey"
FOREIGN KEY ("expense_id") REFERENCES "expenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "expense_comments"
ADD CONSTRAINT "expense_comments_author_id_fkey"
FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "friend_expense_comments"
ADD CONSTRAINT "friend_expense_comments_friend_expense_id_fkey"
FOREIGN KEY ("friend_expense_id") REFERENCES "friend_expenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "friend_expense_comments"
ADD CONSTRAINT "friend_expense_comments_author_id_fkey"
FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
