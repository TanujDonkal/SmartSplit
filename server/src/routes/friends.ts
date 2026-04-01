import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { addFriend, getFriends } from "../controllers/friendController";
import {
  addFriendExpense,
  addFriendExpenseComment,
  deleteFriendExpense,
  getFriendExpenseDetail,
  getFriendSummary,
  getFriendExpenses,
  settleUpFriend,
  updateFriendExpense,
} from "../controllers/friendExpenseController";

const router = Router();

router.use(authenticate);

router.get("/", getFriends);
router.post("/", addFriend);
router.get("/:friendId/summary", getFriendSummary);
router.post("/:friendId/settle", settleUpFriend);
router.get("/:friendId/expenses", getFriendExpenses);
router.post("/:friendId/expenses", addFriendExpense);
router.get("/:friendId/expenses/:expenseId", getFriendExpenseDetail);
router.patch("/:friendId/expenses/:expenseId", updateFriendExpense);
router.delete("/:friendId/expenses/:expenseId", deleteFriendExpense);
router.post("/:friendId/expenses/:expenseId/comments", addFriendExpenseComment);

export default router;
