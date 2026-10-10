import { Router } from "express";
import { requireAuth } from "../../middlewares/requireAuth";
import { requirePermission } from "../../middlewares/requirePermission";
import { PERMISSIONS } from "@event-agency/shared";
import { AnimatorsController } from "./animators.controller";

const router = Router();

router.get(
  "/availability",
  requireAuth,
  requirePermission(PERMISSIONS.ORDERS_READ),
  AnimatorsController.availability,
);

router.get(
  "/me/report",
  requireAuth,
  AnimatorsController.myReport,
);

router.get(
  "/:id/report",
  requireAuth,
  requirePermission(PERMISSIONS.USERS_READ),
  AnimatorsController.reportById,
);

export default router;