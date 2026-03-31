import { Response } from "express";
import { Prisma } from "@prisma/client";
import prisma from "../utils/prisma";
import { AuthRequest } from "../middleware/auth";

function toPair(userId: string, friendId: string) {
  return userId < friendId
    ? { user_a_id: userId, user_b_id: friendId }
    : { user_a_id: friendId, user_b_id: userId };
}

async function getFriendshipOrNull(userId: string, friendId: string) {
  return prisma.friendship.findUnique({
    where: { user_a_id_user_b_id: toPair(userId, friendId) },
    include: {
      userA: { select: { id: true, name: true, email: true } },
      userB: { select: { id: true, name: true, email: true } },
    },
  });
}

export const getFriendExpenses = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const userId = req.userId!;
  const friendId = req.params.friendId as string;

  try {
    const friendship = await getFriendshipOrNull(userId, friendId);

    if (!friendship) {
      res.status(404).json({ error: "Friendship not found" });
      return;
    }

    const expenses = await prisma.friendExpense.findMany({
      where: { friendship_id: friendship.id },
      include: {
        payer: { select: { id: true, name: true, email: true } },
      },
      orderBy: { created_at: "desc" },
    });

    res.json(expenses);
  } catch (error) {
    console.error("Get friend expenses error:", error);
    res.status(500).json({ error: "Failed to fetch friend expenses" });
  }
};

export const addFriendExpense = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const userId = req.userId!;
  const friendId = req.params.friendId as string;
  const {
    description,
    amount,
    paid_by,
    split_type,
  }: {
    description?: string;
    amount?: number;
    paid_by?: "self" | "friend";
    split_type?: "equal" | "full_amount";
  } = req.body;

  if (!description?.trim() || !amount || amount <= 0 || !paid_by || !split_type) {
    res.status(400).json({
      error: "description, amount, paid_by, and split_type are required",
    });
    return;
  }

  try {
    const friendship = await getFriendshipOrNull(userId, friendId);

    if (!friendship) {
      res.status(404).json({ error: "Friendship not found" });
      return;
    }

    const payerId = paid_by === "self" ? userId : friendId;

    const expense = await prisma.friendExpense.create({
      data: {
        friendship_id: friendship.id,
        payer_id: payerId,
        amount: new Prisma.Decimal(amount),
        description: description.trim(),
        split_type:
          split_type === "equal"
            ? "EQUAL"
            : "FULL_AMOUNT",
      },
      include: {
        payer: { select: { id: true, name: true, email: true } },
      },
    });

    res.status(201).json(expense);
  } catch (error) {
    console.error("Add friend expense error:", error);
    res.status(500).json({ error: "Failed to add friend expense" });
  }
};
