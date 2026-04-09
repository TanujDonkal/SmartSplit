import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import prisma from "../utils/prisma";
import { AuthRequest } from "../middleware/auth";
import { sendPasswordResetOtpEmail } from "../utils/mailer";
import { getSupabaseAdminClient } from "../utils/supabaseAdmin";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";

export const register = async (req: Request, res: Response): Promise<void> => {
  const name = String(req.body.name ?? "").trim();
  const email = String(req.body.email ?? "").trim().toLowerCase();
  const password = String(req.body.password ?? "");

  if (!name || !email || !password) {
    res.status(400).json({ error: "Name, email, and password are required" });
    return;
  }

  const existing = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
  });
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

export const login = async (req: Request, res: Response): Promise<void> => {
  const email = String(req.body.email ?? "").trim().toLowerCase();
  const password = String(req.body.password ?? "");

  if (!email || !password) {
    res.status(400).json({ error: "Email and password are required" });
    return;
  }

  const user = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
  });
  if (!user) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, {
    expiresIn: "7d",
  });

  res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email },
  });
};

export const requestPasswordResetOtp = async (
  req: Request,
  res: Response
): Promise<void> => {
  const email = String(req.body.email ?? "").trim().toLowerCase();

  if (!email) {
    res.status(400).json({ error: "Email is required" });
    return;
  }

  try {
    const user = await prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
    });

    if (!user) {
      res.json({ message: "If that account exists, an OTP has been sent." });
      return;
    }

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const otp_hash = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.passwordResetOtp.updateMany({
      where: {
        user_id: user.id,
        used_at: null,
      },
      data: {
        used_at: new Date(),
      },
    });

    await prisma.passwordResetOtp.create({
      data: {
        user_id: user.id,
        otp_hash,
        expires_at: expiresAt,
      },
    });

    await sendPasswordResetOtpEmail({
      to: user.email,
      name: user.name,
      otp,
    });

    res.json({ message: "OTP sent to your registered email." });
  } catch (error) {
    console.error("Request password reset OTP error:", {
      message: error instanceof Error ? error.message : "Unknown OTP mail error",
      name: error instanceof Error ? error.name : undefined,
      email,
    });
    res.status(500).json({ error: "Failed to send OTP email" });
  }
};

export const syncCurrentUser = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  const userId = req.userId!;
  const email = String(req.userEmail ?? req.body.email ?? "").trim().toLowerCase();
  const name = String(req.body.name ?? req.userName ?? "").trim();

  if (!userId || !email) {
    res.status(400).json({ error: "Authenticated user id and email are required" });
    return;
  }

  try {
    const existing = await prisma.user.findFirst({
      where: {
        email: { equals: email, mode: "insensitive" },
        id: { not: userId },
      },
      select: {
        id: true,
        name: true,
        email: true,
        default_currency: true,
      },
    });

    const current = await prisma.user.findUnique({
      where: { id: userId },
      select: { default_currency: true, name: true, email: true },
    });

    if (existing) {
      const migratedUser = await prisma.$transaction(async (tx) => {
        if (!current) {
          await tx.user.create({
            data: {
              id: userId,
              email,
              name: name || existing.name || "SmartSplit User",
              password_hash: "__managed_by_supabase__",
              default_currency: existing.default_currency || "CAD",
            },
          });
        }

        await tx.group.updateMany({
          where: { created_by: existing.id },
          data: { created_by: userId },
        });
        await tx.groupMember.updateMany({
          where: { user_id: existing.id },
          data: { user_id: userId },
        });
        await tx.expense.updateMany({
          where: { payer_id: existing.id },
          data: { payer_id: userId },
        });
        await tx.expenseSplit.updateMany({
          where: { user_id: existing.id },
          data: { user_id: userId },
        });
        await tx.friendship.updateMany({
          where: { user_a_id: existing.id },
          data: { user_a_id: userId },
        });
        await tx.friendship.updateMany({
          where: { user_b_id: existing.id },
          data: { user_b_id: userId },
        });
        await tx.friendExpense.updateMany({
          where: { payer_id: existing.id },
          data: { payer_id: userId },
        });
        await tx.expenseComment.updateMany({
          where: { author_id: existing.id },
          data: { author_id: userId },
        });
        await tx.friendExpenseComment.updateMany({
          where: { author_id: existing.id },
          data: { author_id: userId },
        });
        await tx.passwordResetOtp.updateMany({
          where: { user_id: existing.id },
          data: { user_id: userId },
        });

        await tx.user.delete({
          where: { id: existing.id },
        });

        return tx.user.upsert({
          where: { id: userId },
          update: {
            email,
            name: name || current?.name || existing.name || "SmartSplit User",
            default_currency: current?.default_currency || existing.default_currency || "CAD",
          },
          create: {
            id: userId,
            email,
            name: name || existing.name || "SmartSplit User",
            password_hash: "__managed_by_supabase__",
            default_currency: existing.default_currency || "CAD",
          },
          select: {
            id: true,
            name: true,
            email: true,
            default_currency: true,
          },
        });
      });

      res.json(migratedUser);
      return;
    }
    const user = await prisma.user.upsert({
      where: { id: userId },
      update: {
        email,
        name: name || current?.name || "SmartSplit User",
      },
      create: {
        id: userId,
        email,
        name: name || "SmartSplit User",
        password_hash: "__managed_by_supabase__",
        default_currency: "CAD",
      },
      select: {
        id: true,
        name: true,
        email: true,
        default_currency: true,
      },
    });

    res.json(user);
  } catch (error) {
    console.error("Sync current user error:", error);
    res.status(500).json({ error: "Failed to sync authenticated user" });
  }
};

export const resetPasswordWithOtp = async (
  req: Request,
  res: Response
): Promise<void> => {
  const email = String(req.body.email ?? "").trim().toLowerCase();
  const otp = String(req.body.otp ?? "").trim();
  const password = String(req.body.password ?? "");

  if (!email || !otp || !password) {
    res.status(400).json({ error: "Email, OTP, and new password are required" });
    return;
  }

  if (password.length < 6) {
    res.status(400).json({ error: "Password must be at least 6 characters" });
    return;
  }

  try {
    const user = await prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
    });

    if (!user) {
      res.status(404).json({ error: "No account found with that email" });
      return;
    }

    const otpRecords = await prisma.passwordResetOtp.findMany({
      where: {
        user_id: user.id,
        used_at: null,
        expires_at: { gt: new Date() },
      },
      orderBy: { created_at: "desc" },
      take: 5,
    });

    let matchedId: string | null = null;
    for (const record of otpRecords) {
      const matches = await bcrypt.compare(otp, record.otp_hash);
      if (matches) {
        matchedId = record.id;
        break;
      }
    }

    if (!matchedId) {
      res.status(400).json({ error: "Invalid or expired OTP" });
      return;
    }

    const password_hash = await bcrypt.hash(password, 10);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { password_hash },
      }),
      prisma.passwordResetOtp.update({
        where: { id: matchedId },
        data: { used_at: new Date() },
      }),
      prisma.passwordResetOtp.updateMany({
        where: {
          user_id: user.id,
          used_at: null,
        },
        data: { used_at: new Date() },
      }),
    ]);

    res.json({ message: "Password reset successful. You can log in now." });
  } catch (error) {
    console.error("Reset password with OTP error:", error);
    res.status(500).json({ error: "Failed to reset password" });
  }
};

export const deleteAccount = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const userId = req.userId!;

  try {
    await prisma.$transaction(async (tx) => {
      const friendships = await tx.friendship.findMany({
        where: {
          OR: [{ user_a_id: userId }, { user_b_id: userId }],
        },
        select: { id: true },
      });

      if (friendships.length > 0) {
        const friendshipIds = friendships.map((item) => item.id);
        await tx.friendExpense.deleteMany({
          where: { friendship_id: { in: friendshipIds } },
        });
        await tx.friendship.deleteMany({
          where: { id: { in: friendshipIds } },
        });
      }

      const createdGroups = await tx.group.findMany({
        where: { created_by: userId },
        select: { id: true },
      });

      for (const group of createdGroups) {
        const replacement = await tx.groupMember.findFirst({
          where: {
            group_id: group.id,
            user_id: { not: userId },
          },
          select: { user_id: true },
        });

        if (replacement) {
          await tx.group.update({
            where: { id: group.id },
            data: { created_by: replacement.user_id },
          });
        }
      }

      const paidExpenses = await tx.expense.findMany({
        where: { payer_id: userId },
        select: { id: true },
      });

      if (paidExpenses.length > 0) {
        const paidExpenseIds = paidExpenses.map((expense) => expense.id);
        await tx.expenseSplit.deleteMany({
          where: { expense_id: { in: paidExpenseIds } },
        });
        await tx.expense.deleteMany({
          where: { id: { in: paidExpenseIds } },
        });
      }

      await tx.expenseSplit.deleteMany({
        where: { user_id: userId },
      });

      await tx.groupMember.deleteMany({
        where: { user_id: userId },
      });

      const emptyGroups = await tx.group.findMany({
        where: {
          members: {
            none: {},
          },
        },
        select: { id: true },
      });

      if (emptyGroups.length > 0) {
        const emptyGroupIds = emptyGroups.map((group) => group.id);
        const orphanExpenses = await tx.expense.findMany({
          where: { group_id: { in: emptyGroupIds } },
          select: { id: true },
        });

        if (orphanExpenses.length > 0) {
          const orphanExpenseIds = orphanExpenses.map((expense) => expense.id);
          await tx.expenseSplit.deleteMany({
            where: { expense_id: { in: orphanExpenseIds } },
          });
          await tx.expense.deleteMany({
            where: { id: { in: orphanExpenseIds } },
          });
        }

        await tx.group.deleteMany({
          where: { id: { in: emptyGroupIds } },
        });
      }

      await tx.passwordResetOtp.deleteMany({
        where: { user_id: userId },
      });

      await tx.user.delete({
        where: { id: userId },
      });
    });

    try {
      const supabaseAdmin = getSupabaseAdminClient();
      const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);

      if (error) {
        console.error("Delete Supabase auth user error:", {
          message: error.message,
          userId,
        });
      }
    } catch (error) {
      console.error("Supabase admin delete error:", {
        message: error instanceof Error ? error.message : "Unknown Supabase delete error",
        userId,
      });
    }

    res.json({ message: "Account deleted successfully" });
  } catch (error) {
    console.error("Delete account error:", error);
    res.status(500).json({ error: "Failed to delete account" });
  }
};

export const updateProfile = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const userId = req.userId!;
  const name = String(req.body.name ?? "").trim();
  const email = String(req.body.email ?? "").trim().toLowerCase();
  const defaultCurrency = String(req.body.default_currency ?? "").trim().toUpperCase();

  if (!name || !email || !defaultCurrency) {
    res.status(400).json({ error: "Name, email, and default currency are required" });
    return;
  }

  try {
    const existing = await prisma.user.findFirst({
      where: {
        email: { equals: email, mode: "insensitive" },
        id: { not: userId },
      },
      select: { id: true },
    });

    if (existing) {
      res.status(409).json({ error: "That email is already in use" });
      return;
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        name,
        email,
        default_currency: defaultCurrency,
      },
      select: {
        id: true,
        name: true,
        email: true,
        default_currency: true,
      },
    });

    res.json(user);
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({ error: "Failed to update profile" });
  }
};
