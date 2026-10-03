import { Router } from "express";
import { requireAuth } from "../../middlewares/requireAuth";
import { requirePermission } from "../../middlewares/requirePermission";
import { PERMISSIONS } from "@event-agency/shared";
import { SettingsController } from "./settings.controller";

const router = Router();

router.get(
  "/",
  requireAuth,
  requirePermission(PERMISSIONS.SETTINGS_READ),
  SettingsController.get,
);

router.patch(
  "/",
  requireAuth,
  requirePermission(PERMISSIONS.SETTINGS_WRITE),
  SettingsController.update,
);

export default router;
