import { Response } from "express";
import prisma from "../utils/prisma";
import { AuthRequest } from "../middleware/auth";

// GET /api/groups/:groupId/balances
export const getBalances = async (
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

    // Get all members
    const members = await prisma.groupMember.findMany({
      where: { group_id: groupId },
      include: { user: { select: { id: true, name: true, username: true, email: true } } },
    });

    // Get all expenses with splits
    const expenses = await prisma.expense.findMany({
      where: { group_id: groupId },
      include: { splits: true },
    });

    // Calculate net balance per user: total paid - total owed
    const balanceMap = new Map<string, number>();
    for (const member of members) {
      balanceMap.set(member.user_id, 0);
    }

    for (const expense of expenses) {
      // Add what the payer paid
      const current = balanceMap.get(expense.payer_id) ?? 0;
      balanceMap.set(expense.payer_id, current + Number(expense.converted_amount));

      // Subtract what each person owes
      for (const split of expense.splits) {
        const owed = balanceMap.get(split.user_id) ?? 0;
        balanceMap.set(split.user_id, owed - Number(split.converted_amount_owed));
      }
    }

    const balances = members.map((m) => ({
      user: m.user,
      balance: Math.round((balanceMap.get(m.user_id) ?? 0) * 100) / 100,
    }));

    res.json(balances);
  } catch (error) {
    console.error("Get balances error:", error);
    res.status(500).json({ error: "Failed to calculate balances" });
  }
};

// GET /api/groups/:groupId/settlements
export const getSettlements = async (
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

    // Get members and expenses
    const members = await prisma.groupMember.findMany({
      where: { group_id: groupId },
      include: { user: { select: { id: true, name: true, username: true, email: true } } },
    });

    const expenses = await prisma.expense.findMany({
      where: { group_id: groupId },
      include: { splits: true },
    });

    // Calculate net balances
    const balanceMap = new Map<string, number>();
    for (const member of members) {
      balanceMap.set(member.user_id, 0);
    }

    for (const expense of expenses) {
      const current = balanceMap.get(expense.payer_id) ?? 0;
      balanceMap.set(expense.payer_id, current + Number(expense.converted_amount));

      for (const split of expense.splits) {
        const owed = balanceMap.get(split.user_id) ?? 0;
        balanceMap.set(split.user_id, owed - Number(split.converted_amount_owed));
      }
    }

    // Build user lookup
    const userMap = new Map(members.map((m) => [m.user_id, m.user]));

    // Greedy matching algorithm from docs/settlement-algorithm.md
    const debtors: { userId: string; amount: number }[] = [];
    const creditors: { userId: string; amount: number }[] = [];

    for (const [uid, balance] of balanceMap) {
      const rounded = Math.round(balance * 100) / 100;
      if (rounded < 0) debtors.push({ userId: uid, amount: Math.abs(rounded) });
      else if (rounded > 0) creditors.push({ userId: uid, amount: rounded });
    }

    // Sort: largest debtor first, largest creditor first
    debtors.sort((a, b) => b.amount - a.amount);
    creditors.sort((a, b) => b.amount - a.amount);

    const settlements: { from: typeof members[0]["user"]; to: typeof members[0]["user"]; amount: number }[] = [];

    let i = 0;
    let j = 0;

    while (i < debtors.length && j < creditors.length) {
      const settleAmount = Math.min(debtors[i].amount, creditors[j].amount);
      const rounded = Math.round(settleAmount * 100) / 100;

      if (rounded > 0) {
        settlements.push({
          from: userMap.get(debtors[i].userId)!,
          to: userMap.get(creditors[j].userId)!,
          amount: rounded,
        });
      }

      debtors[i].amount -= settleAmount;
      creditors[j].amount -= settleAmount;

      if (debtors[i].amount < 0.01) i++;
      if (creditors[j].amount < 0.01) j++;
    }

    res.json(settlements);
  } catch (error) {
    console.error("Get settlements error:", error);
    res.status(500).json({ error: "Failed to calculate settlements" });
  }
};
