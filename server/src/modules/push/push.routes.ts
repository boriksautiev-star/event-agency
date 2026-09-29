import { Router } from "express";
import { requireAuth } from "../../middlewares/requireAuth";
import { PushController } from "./push.controller";

const router = Router();

router.post("/test", requireAuth, PushController.test);

export default router;