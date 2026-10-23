import { Router } from "express";
import { requireAuth } from "../../middlewares/requireAuth";
import { NotificationSettingsController } from "./notification-settings.controller";

const router = Router();
router.get("/", requireAuth, NotificationSettingsController.getMySettings);
router.put("/", requireAuth, NotificationSettingsController.updateMySettings);

export default router;