import { Router } from "express";
import { requireAuth } from "../../middlewares/requireAuth";
import { requirePermission } from "../../middlewares/requirePermission";
import { PERMISSIONS } from "@event-agency/shared";
import { RatesController } from "./rates.controller";

const router = Router();

router.get(
  "/lookup",
  requireAuth,
  requirePermission(PERMISSIONS.RATES_READ),
  RatesController.lookup,
);

router.get(
  "/matrix",
  requireAuth,
  requirePermission(PERMISSIONS.RATES_READ),
  RatesController.getMatrix,
);

router.put(
  "/matrix",
  requireAuth,
  requirePermission(PERMISSIONS.RATES_WRITE),
  RatesController.saveMatrix,
);

export default router;
