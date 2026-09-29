import { Router } from "express";
import { requireAuth } from "../../middlewares/requireAuth";
import { requirePermission } from "../../middlewares/requirePermission";
import { PERMISSIONS } from "@event-agency/shared";
import { RateGroupsController } from "./rate-groups.controller";

const router = Router();

router.get("/", requireAuth, RateGroupsController.list);
router.get("/:id", requireAuth, RateGroupsController.get);
router.post("/", requireAuth, requirePermission(PERMISSIONS.RATE_GROUPS_WRITE), RateGroupsController.create);
router.patch("/:id", requireAuth, requirePermission(PERMISSIONS.RATE_GROUPS_WRITE), RateGroupsController.update);
router.delete("/:id", requireAuth, requirePermission(PERMISSIONS.RATE_GROUPS_WRITE), RateGroupsController.remove);

export default router;