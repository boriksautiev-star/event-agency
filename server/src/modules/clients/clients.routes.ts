import { Router } from "express";
import { requireAuth } from "../../middlewares/requireAuth";
import { requirePermission } from "../../middlewares/requirePermission";
import { PERMISSIONS } from "@event-agency/shared";
import { ClientsController } from "./clients.controller";

const router = Router();

router.get(
  "/",
  requireAuth,
  requirePermission(PERMISSIONS.CLIENTS_READ),
  ClientsController.list,
);

router.get(
  "/:id",
  requireAuth,
  requirePermission(PERMISSIONS.CLIENTS_READ),
  ClientsController.getById,
);

router.post(
  "/",
  requireAuth,
  requirePermission(PERMISSIONS.CLIENTS_WRITE),
  ClientsController.create,
);

router.patch(
  "/:id",
  requireAuth,
  requirePermission(PERMISSIONS.CLIENTS_WRITE),
  ClientsController.update,
);

router.delete(
  "/:id",
  requireAuth,
  requirePermission(PERMISSIONS.CLIENTS_WRITE),
  ClientsController.remove,
);

export default router;
