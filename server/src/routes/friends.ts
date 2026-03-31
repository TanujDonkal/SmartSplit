import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { addFriend, getFriends } from "../controllers/friendController";
import {
  addFriendExpense,
  getFriendSummary,
  getFriendExpenses,
} from "../controllers/friendExpenseController";

const router = Router();

router.use(authenticate);

router.get("/", getFriends);
router.post("/", addFriend);
router.get("/:friendId/summary", getFriendSummary);
router.get("/:friendId/expenses", getFriendExpenses);
router.post("/:friendId/expenses", addFriendExpense);

export default router;
