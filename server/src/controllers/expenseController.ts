import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import prisma from "../utils/prisma";
import { Prisma } from "@prisma/client";

const expenseInclude = {
  payer: { select: { id: true, name: true, email: true, default_currency: true } },
  splits: {
    include: {
      user: { select: { id: true, name: true, email: true, default_currency: true } },
    },
  },
  comments: {
    include: {
      author: { select: { id: true, name: true, email: true, default_currency: true } },
    },
    orderBy: { created_at: "asc" as const },
  },
};

async function ensureGroupMembership(groupId: string, userId: string) {
  return prisma.groupMember.findUnique({
    where: { group_id_user_id: { group_id: groupId, user_id: userId } },
  });
}

// POST /api/expenses
export const addExpense = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const { group_id, amount, description, note, receipt_data, incurred_on } = req.body;
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
    const memberCount = members.length;
    const splitAmount = total.dividedBy(memberCount).toDecimalPlaces(2);

    const expense = await prisma.$transaction(async (tx) => {
      const newExpense = await tx.expense.create({
        data: {
          group_id,
          payer_id: payerId,
          amount: total,
          description: String(description).trim(),
          note: String(note ?? "").trim() || null,
          receipt_data: String(receipt_data ?? "").trim() || null,
          incurred_on: incurred_on ? new Date(incurred_on) : new Date(),
        },
      });

      await tx.expenseSplit.createMany({
        data: members.map((member) => ({
          expense_id: newExpense.id,
          user_id: member.user_id,
          amount_owed: splitAmount,
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
  const { description, amount, note, receipt_data, incurred_on } = req.body;

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

    const nextAmount =
      typeof amount === "number" && amount > 0
        ? new Prisma.Decimal(amount)
        : existing.amount;
    const splitAmount = nextAmount.dividedBy(members.length).toDecimalPlaces(2);

    const expense = await prisma.$transaction(async (tx) => {
      const updated = await tx.expense.update({
        where: { id: expenseId },
        data: {
          description: String(description ?? existing.description).trim(),
          amount: nextAmount,
          note: note === undefined ? existing.note : String(note).trim() || null,
          receipt_data:
            receipt_data === undefined
              ? existing.receipt_data
              : String(receipt_data).trim() || null,
          incurred_on: incurred_on ? new Date(incurred_on) : existing.incurred_on,
        },
      });

      await tx.expenseSplit.deleteMany({ where: { expense_id: expenseId } });
      await tx.expenseSplit.createMany({
        data: members.map((member) => ({
          expense_id: expenseId,
          user_id: member.user_id,
          amount_owed: splitAmount,
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
      select: { id: true, group_id: true },
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
