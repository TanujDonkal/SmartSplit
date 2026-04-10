import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { verifySupabaseAccessToken } from "../utils/supabaseAuth";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";

export interface AuthRequest extends Request {
  userId?: string;
  userEmail?: string;
  userName?: string;
  userUsername?: string;
}

export const authenticate = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    res.status(401).json({ error: "Authorization token required" });
    return;
  }

  const token = header.split(" ")[1];

  void (async () => {
    try {
      const payload = await verifySupabaseAccessToken(token);
      req.userId = String(payload.sub ?? "");
      req.userEmail = payload.email;
      req.userName = payload.user_metadata?.name;
      req.userUsername = payload.user_metadata?.username;

      if (!req.userId) {
        res.status(401).json({ error: "Invalid or expired token" });
        return;
      }

      next();
      return;
    } catch {
      try {
        const payload = jwt.verify(token, JWT_SECRET) as { userId: string; email?: string };
        req.userId = payload.userId;
        req.userEmail = payload.email;
        next();
      } catch {
        res.status(401).json({ error: "Invalid or expired token" });
      }
    }
  })();
};
