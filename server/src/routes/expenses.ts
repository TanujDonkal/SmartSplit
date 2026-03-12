import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { addExpense, getGroupExpenses } from "../controllers/expenseController";

const router = Router();

router.use(authenticate);

router.post("/", addExpense);
router.get("/:groupId", getGroupExpenses);

export default router;
