import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { createGroup, addMember, getGroups } from "../controllers/groupController";
import { getBalances, getSettlements } from "../controllers/settlementController";

const router = Router();

router.use(authenticate);

router.post("/", createGroup);
router.get("/", getGroups);
router.post("/:groupId/members", addMember);
router.get("/:groupId/balances", getBalances);
router.get("/:groupId/settlements", getSettlements);

export default router;
