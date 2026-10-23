import { Router } from "express";
import { requireAuth } from "../../middlewares/requireAuth";
import { BackupsController } from "./backups.controller";

const router = Router();
router.get("/", requireAuth, BackupsController.list);
router.get("/status", requireAuth, BackupsController.status);
router.post("/create", requireAuth, BackupsController.createNow);
router.post("/prepare-restore", requireAuth, BackupsController.prepareRestore);

export default router;
