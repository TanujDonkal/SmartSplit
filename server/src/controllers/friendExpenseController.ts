import { Response } from "express";
import { Prisma } from "@prisma/client";
import prisma from "../utils/prisma";
import { AuthRequest } from "../middleware/auth";
import { convertAmountToBase, normalizeCurrency } from "../utils/currency";
import { deleteStoredReceipt, resolveStoredReceipt } from "../utils/receiptStorage";

function toPair(userId: string, friendId: string) {
  return userId < friendId
    ? { user_a_id: userId, user_b_id: friendId }
    : { user_a_id: friendId, user_b_id: userId };
}

const friendExpenseInclude = {
  payer: { select: { id: true, name: true, username: true, email: true, default_currency: true } },
  comments: {
    include: {
      author: { select: { id: true, name: true, username: true, email: true, default_currency: true } },
    },
    orderBy: { created_at: "asc" as const },
  },
};

async function getFriendshipOrNull(userId: string, friendId: string) {
  return prisma.friendship.findUnique({
    where: { user_a_id_user_b_id: toPair(userId, friendId) },
    include: {
      userA: { select: { id: true, name: true, username: true, email: true, default_currency: true } },
      userB: { select: { id: true, name: true, username: true, email: true, default_currency: true } },
    },
  });
}

function getFriendSummaryNumbers(
  activities: Array<{
    amount: Prisma.Decimal | number;
    converted_amount: Prisma.Decimal | number;
    split_type: "EQUAL" | "FULL_AMOUNT";
    activity_type: "EXPENSE" | "SETTLEMENT";
    payer: { id: string };
  }>,
  userId: string,
) {
  let netBalance = 0;
  let youPaidTotal = 0;
  let friendPaidTotal = 0;

  activities.forEach((activity) => {
    const amount = Number(activity.amount);
    const convertedAmount = Number(activity.converted_amount);
    const paidByMe = activity.payer.id === userId;

    if (activity.activity_type === "SETTLEMENT") {
      netBalance += paidByMe ? -convertedAmount : convertedAmount;
      return;
    }

    const impact = activity.split_type === "FULL_AMOUNT" ? convertedAmount : convertedAmount / 2;

    if (paidByMe) {
      youPaidTotal += amount;
      netBalance += impact;
    } else {
      friendPaidTotal += amount;
      netBalance -= impact;
    }
  });

  return {
    netBalance: Math.round(netBalance * 100) / 100,
    youPaidTotal: Math.round(youPaidTotal * 100) / 100,
    friendPaidTotal: Math.round(friendPaidTotal * 100) / 100,
  };
}

async function loadFriendActivities(friendshipId: string) {
  return prisma.friendExpense.findMany({
    where: { friendship_id: friendshipId },
    include: friendExpenseInclude,
    orderBy: [{ incurred_on: "desc" }, { created_at: "desc" }],
  });
}

export const getFriendSummary = async (
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

    const activities = await loadFriendActivities(friendship.id);
    const friend =
      friendship.userA.id === userId ? friendship.userB : friendship.userA;
    const summary = getFriendSummaryNumbers(activities, userId);

    res.json({
      friend,
      net_balance: summary.netBalance,
      expense_count: activities.length,
      you_paid_total: summary.youPaidTotal,
      friend_paid_total: summary.friendPaidTotal,
      last_activity: activities[0]?.created_at ?? null,
    });
  } catch (error) {
    console.error("Get friend summary error:", error);
    res.status(500).json({ error: "Failed to fetch friend summary" });
  }
};

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

    const activities = await loadFriendActivities(friendship.id);
    res.json(activities);
  } catch (error) {
    console.error("Get friend expenses error:", error);
    res.status(500).json({ error: "Failed to fetch friend expenses" });
  }
};

export const getFriendExpenseDetail = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const userId = req.userId!;
  const friendId = req.params.friendId as string;
  const expenseId = req.params.expenseId as string;

  try {
    const friendship = await getFriendshipOrNull(userId, friendId);

    if (!friendship) {
      res.status(404).json({ error: "Friendship not found" });
      return;
    }

    const expense = await prisma.friendExpense.findFirst({
      where: { id: expenseId, friendship_id: friendship.id },
      include: friendExpenseInclude,
    });

    if (!expense) {
      res.status(404).json({ error: "Friend expense not found" });
      return;
    }

    res.json(expense);
  } catch (error) {
    console.error("Get friend expense detail error:", error);
    res.status(500).json({ error: "Failed to fetch friend expense" });
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
    currency,
    paid_by,
    split_type,
    note,
    receipt_data,
    incurred_on,
  }: {
    description?: string;
    amount?: number;
    currency?: string;
    paid_by?: "self" | "friend";
    split_type?: "equal" | "full_amount";
    note?: string;
    receipt_data?: string;
    incurred_on?: string;
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
    const converted = await convertAmountToBase(amount, currency);
    const storedReceipt = await resolveStoredReceipt(receipt_data, null, null, null);

    const expense = await prisma.friendExpense.create({
      data: {
        friendship_id: friendship.id,
        payer_id: payerId,
        amount: new Prisma.Decimal(amount),
        currency: converted.currency,
        exchange_rate_to_base: new Prisma.Decimal(converted.exchangeRateToBase),
        converted_amount: new Prisma.Decimal(converted.convertedAmount),
        description: description.trim(),
        split_type: split_type === "equal" ? "EQUAL" : "FULL_AMOUNT",
        note: note?.trim() || null,
        receipt_data: storedReceipt.url,
        receipt_storage_key: storedReceipt.storageKey,
        incurred_on: incurred_on ? new Date(incurred_on) : new Date(),
      },
      include: friendExpenseInclude,
    });

    res.status(201).json(expense);
  } catch (error) {
    console.error("Add friend expense error:", error);
    res.status(500).json({ error: "Failed to add friend expense" });
  }
};

export const updateFriendExpense = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const userId = req.userId!;
  const friendId = req.params.friendId as string;
  const expenseId = req.params.expenseId as string;
  const {
    description,
    amount,
    currency,
    paid_by,
    split_type,
    note,
    receipt_data,
    receipt_storage_key,
    incurred_on,
  } = req.body as {
    description?: string;
    amount?: number;
    currency?: string;
    paid_by?: "self" | "friend";
    split_type?: "equal" | "full_amount";
    note?: string;
    receipt_data?: string | null;
    receipt_storage_key?: string | null;
    incurred_on?: string;
  };

  try {
    const friendship = await getFriendshipOrNull(userId, friendId);

    if (!friendship) {
      res.status(404).json({ error: "Friendship not found" });
      return;
    }

    const existing = await prisma.friendExpense.findFirst({
      where: { id: expenseId, friendship_id: friendship.id },
    });

    if (!existing) {
      res.status(404).json({ error: "Friend expense not found" });
      return;
    }

    const nextAmount =
      typeof amount === "number" && amount > 0 ? amount : Number(existing.amount);
    const nextCurrency =
      currency === undefined ? existing.currency : normalizeCurrency(currency);
    const converted = await convertAmountToBase(nextAmount, nextCurrency);
    const storedReceipt = await resolveStoredReceipt(
      receipt_data,
      receipt_storage_key,
      existing.receipt_data,
      existing.receipt_storage_key,
    );

    const expense = await prisma.friendExpense.update({
      where: { id: expenseId },
      data: {
        description: description?.trim() || existing.description,
        amount: new Prisma.Decimal(nextAmount),
        currency: converted.currency,
        exchange_rate_to_base: new Prisma.Decimal(converted.exchangeRateToBase),
        converted_amount: new Prisma.Decimal(converted.convertedAmount),
        payer_id:
          paid_by === "self"
            ? userId
            : paid_by === "friend"
              ? friendId
              : existing.payer_id,
        split_type:
          split_type === "equal"
            ? "EQUAL"
            : split_type === "full_amount"
              ? "FULL_AMOUNT"
              : existing.split_type,
        note: note === undefined ? existing.note : note?.trim() || null,
        receipt_data: storedReceipt.url,
        receipt_storage_key: storedReceipt.storageKey,
        incurred_on: incurred_on ? new Date(incurred_on) : existing.incurred_on,
      },
      include: friendExpenseInclude,
    });

    res.json(expense);
  } catch (error) {
    console.error("Update friend expense error:", error);
    res.status(500).json({ error: "Failed to update friend expense" });
  }
};

export const deleteFriendExpense = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const userId = req.userId!;
  const friendId = req.params.friendId as string;
  const expenseId = req.params.expenseId as string;

  try {
    const friendship = await getFriendshipOrNull(userId, friendId);

    if (!friendship) {
      res.status(404).json({ error: "Friendship not found" });
      return;
    }

    const existing = await prisma.friendExpense.findFirst({
      where: { id: expenseId, friendship_id: friendship.id },
      select: { id: true, receipt_storage_key: true },
    });

    if (!existing) {
      res.status(404).json({ error: "Friend expense not found" });
      return;
    }

    await prisma.friendExpense.delete({ where: { id: expenseId } });
    await deleteStoredReceipt(existing.receipt_storage_key);
    res.json({ message: "Friend expense deleted" });
  } catch (error) {
    console.error("Delete friend expense error:", error);
    res.status(500).json({ error: "Failed to delete friend expense" });
  }
};

export const addFriendExpenseComment = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
    const userId = req.userId!;
    const friendId = req.params.friendId as string;
    const expenseId = req.params.expenseId as string;
    const body = String(req.body.body ?? "").trim();

    if (!body) {
      res.status(400).json({ error: "Comment text is required" });
      return;
    }

    try {
      const friendship = await getFriendshipOrNull(userId, friendId);

      if (!friendship) {
        res.status(404).json({ error: "Friendship not found" });
        return;
      }

      const existing = await prisma.friendExpense.findFirst({
        where: { id: expenseId, friendship_id: friendship.id },
        select: { id: true },
      });

      if (!existing) {
        res.status(404).json({ error: "Friend expense not found" });
        return;
      }

      const comment = await prisma.friendExpenseComment.create({
        data: {
          friend_expense_id: expenseId,
          author_id: userId,
          body,
        },
        include: {
          author: { select: { id: true, name: true, email: true, default_currency: true } },
        },
      });

      res.status(201).json(comment);
    } catch (error) {
      console.error("Add friend expense comment error:", error);
      res.status(500).json({ error: "Failed to add comment" });
    }
};

export const settleUpFriend = async (
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

    const activities = await loadFriendActivities(friendship.id);
    const summary = getFriendSummaryNumbers(activities, userId);

    if (Math.abs(summary.netBalance) < 0.01) {
      res.status(400).json({ error: "You are already settled up" });
      return;
    }

    const payerId = summary.netBalance < 0 ? userId : friendId;

    const settlement = await prisma.friendExpense.create({
      data: {
        friendship_id: friendship.id,
        payer_id: payerId,
        amount: new Prisma.Decimal(Math.abs(summary.netBalance)),
        currency: "CAD",
        exchange_rate_to_base: new Prisma.Decimal(1),
        converted_amount: new Prisma.Decimal(Math.abs(summary.netBalance)),
        description: "Settle up",
        split_type: "FULL_AMOUNT",
        activity_type: "SETTLEMENT",
        incurred_on: new Date(),
      },
      include: friendExpenseInclude,
    });

    res.status(201).json(settlement);
  } catch (error) {
    console.error("Settle up friend error:", error);
    res.status(500).json({ error: "Failed to settle up" });
  }
};
