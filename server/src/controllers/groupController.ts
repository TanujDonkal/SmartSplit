import { Response } from "express";
import prisma from "../utils/prisma";
import { AuthRequest } from "../middleware/auth";
import { normalizeUsername } from "../utils/username";

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
