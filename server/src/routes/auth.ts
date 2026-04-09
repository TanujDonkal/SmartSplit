import { Router } from "express";
import {
  deleteAccount,
  login,
  register,
  syncCurrentUser,
  updateProfile,
} from "../controllers/authController";
import { authenticate } from "../middleware/auth";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/me/sync", authenticate, syncCurrentUser);
router.patch("/me", authenticate, updateProfile);
router.delete("/me", authenticate, deleteAccount);

export default router;
