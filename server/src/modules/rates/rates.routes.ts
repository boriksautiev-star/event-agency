import { Router } from "express";
import { requireAuth } from "../../middlewares/requireAuth";
import { requirePermission } from "../../middlewares/requirePermission";
import { PERMISSIONS } from "@event-agency/shared";
import { RatesController } from "./rates.controller";

const router = Router();

// lookup нужен и админу (при создании назначения), и директору
router.get("/lookup", requireAuth, RatesController.lookup);
router.get("/matrix", requireAuth, RatesController.getMatrix);

// Изменение матрицы — только директор
router.put("/matrix", requireAuth, requirePermission(PERMISSIONS.RATES_WRITE), RatesController.saveMatrix);

export default router;