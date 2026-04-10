import { Router } from "express";
import {
  deleteAccount,
  login,
  register,
  syncCurrentUser,
  updateProfile,
  resolveUsername,
  validateRegistration,
} from "../controllers/authController";
import { authenticate } from "../middleware/auth";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/validate-registration", validateRegistration);
router.post("/resolve-username", resolveUsername);
router.post("/me/sync", authenticate, syncCurrentUser);
router.patch("/me", authenticate, updateProfile);
router.delete("/me", authenticate, deleteAccount);

export default router;
