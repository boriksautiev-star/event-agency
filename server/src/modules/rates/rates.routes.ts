import { Router } from "express";
import { requireAuth } from "../../middlewares/requireAuth";
import { RateTemplatesController } from "./rate-templates.controller";

const router = Router();

// === Шаблоны ставок (только директор) ===
router.get("/templates", requireAuth, RateTemplatesController.list);
router.get("/templates/:id", requireAuth, RateTemplatesController.getById);
router.post("/templates", requireAuth, RateTemplatesController.create);
router.patch("/templates/:id", requireAuth, RateTemplatesController.update);
router.delete("/templates/:id", requireAuth, RateTemplatesController.remove);
router.put("/templates/:id/rates", requireAuth, RateTemplatesController.saveRates);
router.post("/templates/assign", requireAuth, RateTemplatesController.assign);

// === Override (только директор) ===
router.get("/overrides", requireAuth, RateTemplatesController.getOverrides);
router.put("/overrides", requireAuth, RateTemplatesController.saveOverrides);

export default router;
