import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { addFriend, getFriends } from "../controllers/friendController";

const router = Router();

router.use(authenticate);

router.get("/", getFriends);
router.post("/", addFriend);

export default router;
