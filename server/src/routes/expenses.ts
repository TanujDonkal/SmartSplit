import { Router } from "express";
import { authenticate } from "../middleware/auth";
import {
  addExpense,
  addExpenseComment,
  deleteExpense,
  getExpenseDetail,
  getGroupExpenses,
  updateExpense,
} from "../controllers/expenseController";

const router = Router();

router.use(authenticate);

router.post("/", addExpense);
router.get("/group/:groupId", getGroupExpenses);
router.get("/:expenseId", getExpenseDetail);
router.patch("/:expenseId", updateExpense);
router.delete("/:expenseId", deleteExpense);
router.post("/:expenseId/comments", addExpenseComment);

export default router;
