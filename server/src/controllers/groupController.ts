import { Response } from "express";
import prisma from "../utils/prisma";
import { AuthRequest } from "../middleware/auth";
import { normalizeUsername } from "../utils/username";
import { deleteStoredReceipt } from "../utils/receiptStorage";

export const createGroup = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const { name } = req.body;
  const userId = req.userId!;

  if (!name) {
    res.status(400).json({ error: "Group name is required" });
    return;
  }

  const group = await prisma.group.create({
    data: {
      name,
      created_by: userId,
      members: {
        create: { user_id: userId },
      },
    },
    include: { members: { include: { user: { select: { id: true, name: true, username: true, email: true } } } } },
  });

  res.status(201).json(group);
};

export const addMember = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const groupId = req.params.groupId as string;
  const username = normalizeUsername(req.body.username);

  if (!username) {
    res.status(400).json({ error: "Member username is required" });
    return;
  }

  const group = await prisma.group.findUnique({ where: { id: groupId } });
  if (!group) {
    res.status(404).json({ error: "Group not found" });
    return;
  }

  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) {
    res.status(404).json({ error: "User not found with that username" });
    return;
  }

  const existing = await prisma.groupMember.findUnique({
    where: { group_id_user_id: { group_id: groupId, user_id: user.id } },
  });
  if (existing) {
    res.status(409).json({ error: "User is already a member of this group" });
    return;
  }

  const member = await prisma.groupMember.create({
    data: { group_id: groupId, user_id: user.id },
    include: { user: { select: { id: true, name: true, username: true, email: true } } },
  });

  res.status(201).json(member);
};

export const getGroups = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const userId = req.userId!;

  const groups = await prisma.group.findMany({
    where: { members: { some: { user_id: userId } } },
    include: {
      members: { include: { user: { select: { id: true, name: true, username: true, email: true } } } },
      _count: { select: { expenses: true } },
    },
  });

  res.json(groups);
};

export const deleteGroup = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const userId = req.userId!;
  const groupId = req.params.groupId as string;

  try {
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        expenses: {
          select: {
            id: true,
            receipt_storage_key: true,
          },
        },
      },
    });

    if (!group) {
      res.status(404).json({ error: "Group not found" });
      return;
    }

    if (group.created_by !== userId) {
      res.status(403).json({ error: "Only the group creator can delete this group" });
      return;
    }

    const expenseIds = group.expenses.map((expense) => expense.id);
    const receiptKeys = group.expenses
      .map((expense) => expense.receipt_storage_key)
      .filter(Boolean) as string[];

    await prisma.$transaction(async (tx) => {
      if (expenseIds.length > 0) {
        await tx.expenseComment.deleteMany({
          where: { expense_id: { in: expenseIds } },
        });
        await tx.expenseSplit.deleteMany({
          where: { expense_id: { in: expenseIds } },
        });
        await tx.expense.deleteMany({
          where: { id: { in: expenseIds } },
        });
      }

      await tx.groupMember.deleteMany({
        where: { group_id: groupId },
      });

      await tx.group.delete({
        where: { id: groupId },
      });
    });

    await Promise.all(receiptKeys.map((key) => deleteStoredReceipt(key)));

    res.json({ message: "Group deleted" });
  } catch (error) {
    console.error("Delete group error:", error);
    res.status(500).json({ error: "Failed to delete group" });
  }
};
