import { Request, Response } from "express";
import bcrypt from "bcrypt";
import prisma from "../utils/prisma";

export const register = async (req: Request, res: Response): Promise<void> => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    res.status(400).json({ error: "Name, email, and password are required" });
    return;
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    res.status(409).json({ error: "Email already registered" });
    return;
  }

  const password_hash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: { name, email, password_hash },
    select: { id: true, name: true, email: true, created_at: true },
  });

  res.status(201).json(user);
};
