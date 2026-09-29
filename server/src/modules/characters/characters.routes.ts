import { Router } from "express";
import { requireAuth } from "../../middlewares/requireAuth";
import { requirePermission } from "../../middlewares/requirePermission";
import { PERMISSIONS } from "@event-agency/shared";
import { CharactersController } from "./characters.controller";

const router = Router();

router.get("/", requireAuth, CharactersController.list);
router.get("/:id", requireAuth, CharactersController.get);
router.post("/", requireAuth, requirePermission(PERMISSIONS.CHARACTERS_WRITE), CharactersController.create);
router.patch("/:id", requireAuth, requirePermission(PERMISSIONS.CHARACTERS_WRITE), CharactersController.update);
router.put("/:id/prices", requireAuth, requirePermission(PERMISSIONS.CHARACTERS_WRITE), CharactersController.replacePrices);
router.delete("/:id", requireAuth, requirePermission(PERMISSIONS.CHARACTERS_WRITE), CharactersController.remove);

export default router;