import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { parseReceipt } from "../controllers/receiptController";

const router = Router();

router.use(authenticate);

router.post("/parse", parseReceipt);

export default router;
