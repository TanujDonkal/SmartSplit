import { Router } from "express";
import {
  deleteAccount,
  login,
  register,
  requestPasswordResetOtp,
  resetPasswordWithOtp,
} from "../controllers/authController";
import { authenticate } from "../middleware/auth";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/forgot-password/request", requestPasswordResetOtp);
router.post("/forgot-password/reset", resetPasswordWithOtp);
router.delete("/me", authenticate, deleteAccount);

export default router;
