import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { chatWithAssistant } from "../controllers/assistantController";

const router = Router();

router.use(authenticate);

router.post("/chat", chatWithAssistant);

export default router;
