import { Response } from "express";
import prisma from "../utils/prisma";
import { AuthRequest } from "../middleware/auth";
import { normalizeUsername } from "../utils/username";

function toPair(userId: string, friendId: string) {
  return userId < friendId
    ? { user_a_id: userId, user_b_id: friendId }
    : { user_a_id: friendId, user_b_id: userId };
}

export const addFriend = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const userId = req.userId!;
  const username = normalizeUsername(req.body.username);

  if (!username) {
    res.status(400).json({ error: "Friend username is required" });
    return;
  }

  const friend = await prisma.user.findUnique({
    where: { username },
    select: { id: true, name: true, username: true, email: true },
  });

  if (!friend) {
    res.status(404).json({ error: "User not found with that username" });
    return;
  }

  if (friend.id === userId) {
    res.status(400).json({ error: "You cannot add yourself as a friend" });
    return;
  }

  const pair = toPair(userId, friend.id);

  const existing = await prisma.friendship.findUnique({
    where: { user_a_id_user_b_id: pair },
  });

  if (existing) {
    res.status(409).json({ error: "You are already friends with this user" });
    return;
  }

  await prisma.friendship.create({
    data: pair,
  });

  res.status(201).json(friend);
};

export const getFriends = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const userId = req.userId!;

  const friendships = await prisma.friendship.findMany({
    where: {
      OR: [{ user_a_id: userId }, { user_b_id: userId }],
    },
    include: {
      userA: { select: { id: true, name: true, username: true, email: true } },
      userB: { select: { id: true, name: true, username: true, email: true } },
    },
    orderBy: { created_at: "desc" },
  });

  const friends = friendships.map((friendship) =>
    friendship.user_a_id === userId ? friendship.userB : friendship.userA
  );

  res.json(friends);
};
