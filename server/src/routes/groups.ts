import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { createGroup, addMember, getGroups } from "../controllers/groupController";

const router = Router();

router.use(authenticate);

router.post("/", createGroup);
router.get("/", getGroups);
router.post("/:groupId/members", addMember);

export default router;
