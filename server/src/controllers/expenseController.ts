import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import prisma from "../utils/prisma";
import { Prisma } from "@prisma/client";
import { convertAmountToBase, normalizeCurrency, splitConvertedAmounts } from "../utils/currency";
import { deleteStoredReceipt, resolveStoredReceipt } from "../utils/receiptStorage";

const expenseInclude = {
  payer: { select: { id: true, name: true, username: true, email: true, default_currency: true } },
  splits: {
    include: {
      user: { select: { id: true, name: true, username: true, email: true, default_currency: true } },
    },
  },
  comments: {
    include: {
      author: { select: { id: true, name: true, username: true, email: true, default_currency: true } },
    },
    orderBy: { created_at: "asc" as const },
  },
};

async function ensureGroupMembership(groupId: string, userId: string) {
  return prisma.groupMember.findUnique({
    where: { group_id_user_id: { group_id: groupId, user_id: userId } },
  });
}

function buildEqualSplitRows(total: Prisma.Decimal, userIds: string[]) {
  const totalCents = Math.round(Number(total) * 100);
  const memberCount = userIds.length;
  const baseCents = Math.floor(totalCents / memberCount);
  const remainder = totalCents % memberCount;

  return userIds.map((userId, index) => ({
    user_id: userId,
    amount_owed: new Prisma.Decimal((baseCents + (index < remainder ? 1 : 0)) / 100),
  }));
}

function buildManualSplitRows(
  total: Prisma.Decimal,
  userIds: string[],
  rawSplits: Array<{ user_id: string; amount_owed: number | string }>,
) {
  const memberSet = new Set(userIds);

  if (rawSplits.length !== userIds.length) {
    throw new Error("Manual split must include every group member");
  }

  const seen = new Set<string>();
  const normalized = rawSplits.map((split) => {
    const userId = String(split.user_id ?? "");
    const amount = Number(split.amount_owed);

    if (!memberSet.has(userId)) {
      throw new Error("Manual split contains an invalid group member");
    }

    if (seen.has(userId)) {
      throw new Error("Manual split contains duplicate members");
    }
    seen.add(userId);

    if (!Number.isFinite(amount) || amount < 0) {
      throw new Error("Manual split amounts must be zero or greater");
    }

    return {
      user_id: userId,
      amount_owed: new Prisma.Decimal(amount).toDecimalPlaces(2),
    };
  });

  const totalManual = normalized.reduce(
    (sum, split) => sum.plus(split.amount_owed),
    new Prisma.Decimal(0),
  );

  if (!totalManual.equals(total.toDecimalPlaces(2))) {
    throw new Error("Manual split total must match the expense amount");
  }

  return normalized;
}

function buildSplitRows(
  total: Prisma.Decimal,
  convertedTotal: Prisma.Decimal,
  userIds: string[],
  splitType: "equal" | "manual",
  rawSplits: Array<{ user_id: string; amount_owed: number | string }> = [],
) {
  const originalRows =
    splitType === "manual"
      ? buildManualSplitRows(total, userIds, rawSplits)
      : buildEqualSplitRows(total, userIds);

  const weights =
    splitType === "manual"
      ? originalRows.map((split) => Number(split.amount_owed))
      : originalRows.map(() => 1);
  const convertedShares = splitConvertedAmounts(Number(convertedTotal), weights);

  return originalRows.map((split, index) => ({
    ...split,
    converted_amount_owed: new Prisma.Decimal(convertedShares[index]).toDecimalPlaces(2),
  }));
}

// POST /api/expenses
export const addExpense = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const {
    group_id,
    amount,
    description,
    note,
    receipt_data,
    incurred_on,
    currency,
    split_type,
    splits,
  } = req.body;
  const payerId = req.userId!;

  if (!group_id || !amount || !description) {
    res.status(400).json({ error: "group_id, amount, and description are required" });
    return;
  }

  if (Number(amount) <= 0) {
    res.status(400).json({ error: "Amount must be greater than zero" });
    return;
  }

  try {
    const membership = await ensureGroupMembership(group_id, payerId);

    if (!membership) {
      res.status(403).json({ error: "You are not a member of this group" });
      return;
    }

    const members = await prisma.groupMember.findMany({ where: { group_id } });
    const total = new Prisma.Decimal(amount);
    const converted = await convertAmountToBase(Number(amount), currency);
    const convertedTotal = new Prisma.Decimal(converted.convertedAmount);
    const storedReceipt = await resolveStoredReceipt(receipt_data, null, null, null);
    const splitRows = buildSplitRows(
      total,
      convertedTotal,
      members.map((member) => member.user_id),
      split_type === "manual" ? "manual" : "equal",
      Array.isArray(splits) ? splits : [],
    );

    const expense = await prisma.$transaction(async (tx) => {
      const newExpense = await tx.expense.create({
        data: {
          group_id,
          payer_id: payerId,
          amount: total,
          currency: converted.currency,
          exchange_rate_to_base: new Prisma.Decimal(converted.exchangeRateToBase),
          converted_amount: convertedTotal,
          description: String(description).trim(),
          note: String(note ?? "").trim() || null,
          receipt_data: storedReceipt.url,
          receipt_storage_key: storedReceipt.storageKey,
          incurred_on: incurred_on ? new Date(incurred_on) : new Date(),
        },
      });

      await tx.expenseSplit.createMany({
        data: splitRows.map((split) => ({
          expense_id: newExpense.id,
          user_id: split.user_id,
          amount_owed: split.amount_owed,
          converted_amount_owed: split.converted_amount_owed,
        })),
      });

      return tx.expense.findUnique({
        where: { id: newExpense.id },
        include: expenseInclude,
      });
    });

    res.status(201).json(expense);
  } catch (error) {
    console.error("Add expense error:", error);
    if (
      error instanceof Error &&
      (error.message.toLowerCase().includes("split") ||
        error.message.toLowerCase().includes("currency") ||
        error.message.toLowerCase().includes("amount"))
    ) {
      res.status(400).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: "Failed to add expense" });
  }
};

// GET /api/expenses/group/:groupId
export const getGroupExpenses = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const groupId = req.params.groupId as string;
  const userId = req.userId!;

  try {
    const membership = await ensureGroupMembership(groupId, userId);

    if (!membership) {
      res.status(403).json({ error: "You are not a member of this group" });
      return;
    }

    const expenses = await prisma.expense.findMany({
      where: { group_id: groupId },
      include: expenseInclude,
      orderBy: [{ incurred_on: "desc" }, { created_at: "desc" }],
    });

    res.json(expenses);
  } catch (error) {
    console.error("Get expenses error:", error);
    res.status(500).json({ error: "Failed to fetch expenses" });
  }
};

export const getExpenseDetail = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const userId = req.userId!;
  const expenseId = req.params.expenseId as string;

  try {
    const expense = await prisma.expense.findUnique({
      where: { id: expenseId },
      include: expenseInclude,
    });

    if (!expense) {
      res.status(404).json({ error: "Expense not found" });
      return;
    }

    const membership = await ensureGroupMembership(expense.group_id, userId);

    if (!membership) {
      res.status(403).json({ error: "You are not a member of this group" });
      return;
    }

    res.json(expense);
  } catch (error) {
    console.error("Get expense detail error:", error);
    res.status(500).json({ error: "Failed to fetch expense" });
  }
};

export const updateExpense = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const userId = req.userId!;
  const expenseId = req.params.expenseId as string;
  const { description, amount, note, receipt_data, receipt_storage_key, incurred_on, currency, split_type, splits } = req.body;

  try {
    const existing = await prisma.expense.findUnique({
      where: { id: expenseId },
      include: { group: true },
    });

    if (!existing) {
      res.status(404).json({ error: "Expense not found" });
      return;
    }

    const membership = await ensureGroupMembership(existing.group_id, userId);

    if (!membership) {
      res.status(403).json({ error: "You are not a member of this group" });
      return;
    }

    const members = await prisma.groupMember.findMany({
      where: { group_id: existing.group_id },
    });

    const numericAmount = Number(amount);
    const nextAmount =
      Number.isFinite(numericAmount) && numericAmount > 0
        ? new Prisma.Decimal(numericAmount)
        : existing.amount;
    const nextCurrency =
      currency === undefined
        ? existing.currency
        : normalizeCurrency(currency);
    const converted = await convertAmountToBase(Number(nextAmount), nextCurrency);
    const convertedTotal = new Prisma.Decimal(converted.convertedAmount);
    const storedReceipt = await resolveStoredReceipt(
      receipt_data,
      receipt_storage_key,
      existing.receipt_data,
      existing.receipt_storage_key,
    );
    const splitRows = buildSplitRows(
      nextAmount,
      convertedTotal,
      members.map((member) => member.user_id),
      split_type === "manual" ? "manual" : "equal",
      Array.isArray(splits) ? splits : [],
    );

    const expense = await prisma.$transaction(async (tx) => {
      const updated = await tx.expense.update({
        where: { id: expenseId },
        data: {
          description: String(description ?? existing.description).trim(),
          amount: nextAmount,
          currency: converted.currency,
          exchange_rate_to_base: new Prisma.Decimal(converted.exchangeRateToBase),
          converted_amount: convertedTotal,
          note: note === undefined ? existing.note : String(note).trim() || null,
          receipt_data: storedReceipt.url,
          receipt_storage_key: storedReceipt.storageKey,
          incurred_on: incurred_on ? new Date(incurred_on) : existing.incurred_on,
        },
      });

      await tx.expenseSplit.deleteMany({ where: { expense_id: expenseId } });
      await tx.expenseSplit.createMany({
        data: splitRows.map((split) => ({
          expense_id: expenseId,
          user_id: split.user_id,
          amount_owed: split.amount_owed,
          converted_amount_owed: split.converted_amount_owed,
        })),
      });

      return tx.expense.findUnique({
        where: { id: updated.id },
        include: expenseInclude,
      });
    });

    res.json(expense);
  } catch (error) {
    console.error("Update expense error:", error);
    if (
      error instanceof Error &&
      (error.message.toLowerCase().includes("split") ||
        error.message.toLowerCase().includes("currency") ||
        error.message.toLowerCase().includes("amount"))
    ) {
      res.status(400).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: "Failed to update expense" });
  }
};

export const deleteExpense = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const userId = req.userId!;
  const expenseId = req.params.expenseId as string;

  try {
    const existing = await prisma.expense.findUnique({
      where: { id: expenseId },
      select: { id: true, group_id: true, receipt_storage_key: true },
    });

    if (!existing) {
      res.status(404).json({ error: "Expense not found" });
      return;
    }

    const membership = await ensureGroupMembership(existing.group_id, userId);

    if (!membership) {
      res.status(403).json({ error: "You are not a member of this group" });
      return;
    }

    await prisma.$transaction([
      prisma.expenseSplit.deleteMany({ where: { expense_id: expenseId } }),
      prisma.expenseComment.deleteMany({ where: { expense_id: expenseId } }),
      prisma.expense.delete({ where: { id: expenseId } }),
    ]);
    await deleteStoredReceipt(existing.receipt_storage_key);

    res.json({ message: "Expense deleted" });
  } catch (error) {
    console.error("Delete expense error:", error);
    res.status(500).json({ error: "Failed to delete expense" });
  }
};

export const addExpenseComment = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const userId = req.userId!;
  const expenseId = req.params.expenseId as string;
  const body = String(req.body.body ?? "").trim();

  if (!body) {
    res.status(400).json({ error: "Comment text is required" });
    return;
  }

  try {
    const expense = await prisma.expense.findUnique({
      where: { id: expenseId },
      select: { id: true, group_id: true },
    });

    if (!expense) {
      res.status(404).json({ error: "Expense not found" });
      return;
    }

    const membership = await ensureGroupMembership(expense.group_id, userId);

    if (!membership) {
      res.status(403).json({ error: "You are not a member of this group" });
      return;
    }

    const comment = await prisma.expenseComment.create({
      data: {
        expense_id: expenseId,
        author_id: userId,
        body,
      },
      include: {
        author: { select: { id: true, name: true, email: true, default_currency: true } },
      },
    });

    res.status(201).json(comment);
  } catch (error) {
    console.error("Add expense comment error:", error);
    res.status(500).json({ error: "Failed to add comment" });
  }
};
