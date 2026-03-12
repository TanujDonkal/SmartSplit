import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import prisma from "../utils/prisma";
import { Prisma } from "@prisma/client";

// POST /api/expenses
export const addExpense = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const { group_id, amount, description } = req.body;
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
    // Verify payer is a member of the group
    const membership = await prisma.groupMember.findUnique({
      where: { group_id_user_id: { group_id, user_id: payerId } },
    });

    if (!membership) {
      res.status(403).json({ error: "You are not a member of this group" });
      return;
    }

    // Get all group members for equal split
    const members = await prisma.groupMember.findMany({
      where: { group_id },
    });

    const total = new Prisma.Decimal(amount);
    const memberCount = members.length;
    const splitAmount = total.dividedBy(memberCount).toDecimalPlaces(2);

    // Create expense and splits in a transaction
    const expense = await prisma.$transaction(async (tx) => {
      const newExpense = await tx.expense.create({
        data: {
          group_id,
          payer_id: payerId,
          amount: total,
          description,
        },
      });

      await tx.expenseSplit.createMany({
        data: members.map((m) => ({
          expense_id: newExpense.id,
          user_id: m.user_id,
          amount_owed: splitAmount,
        })),
      });

      return tx.expense.findUnique({
        where: { id: newExpense.id },
        include: {
          payer: { select: { id: true, name: true, email: true } },
          splits: {
            include: { user: { select: { id: true, name: true, email: true } } },
          },
        },
      });
    });

    res.status(201).json(expense);
  } catch (error) {
    console.error("Add expense error:", error);
    res.status(500).json({ error: "Failed to add expense" });
  }
};

// GET /api/expenses/:groupId
export const getGroupExpenses = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const groupId = req.params.groupId as string;
  const userId = req.userId!;

  try {
    // Verify user is a member
    const membership = await prisma.groupMember.findUnique({
      where: { group_id_user_id: { group_id: groupId, user_id: userId } },
    });

    if (!membership) {
      res.status(403).json({ error: "You are not a member of this group" });
      return;
    }

    const expenses = await prisma.expense.findMany({
      where: { group_id: groupId },
      include: {
        payer: { select: { id: true, name: true, email: true } },
        splits: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
      },
      orderBy: { created_at: "desc" },
    });

    res.json(expenses);
  } catch (error) {
    console.error("Get expenses error:", error);
    res.status(500).json({ error: "Failed to fetch expenses" });
  }
};
