CREATE TYPE "FriendExpenseSplitType" AS ENUM ('EQUAL', 'FULL_AMOUNT');

CREATE TABLE "friend_expenses" (
    "id" TEXT NOT NULL,
    "friendship_id" TEXT NOT NULL,
    "payer_id" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "description" TEXT NOT NULL,
    "split_type" "FriendExpenseSplitType" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "friend_expenses_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "friend_expenses"
ADD CONSTRAINT "friend_expenses_friendship_id_fkey"
FOREIGN KEY ("friendship_id") REFERENCES "friendships"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "friend_expenses"
ADD CONSTRAINT "friend_expenses_payer_id_fkey"
FOREIGN KEY ("payer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
