import { Router } from "express";
import { requireAuth } from "../../middlewares/requireAuth";
import { requirePermission } from "../../middlewares/requirePermission";
import { PERMISSIONS } from "@event-agency/shared";
import { UsersController } from "./users.controller";

const router = Router();

router.get(
  "/",
  requireAuth,
  requirePermission(PERMISSIONS.USERS_READ),
  UsersController.list,
);

router.get(
  "/:id",
  requireAuth,
  requirePermission(PERMISSIONS.USERS_READ),
  UsersController.getById,
);

router.post(
  "/",
  requireAuth,
  requirePermission(PERMISSIONS.USERS_WRITE),
  UsersController.create,
);

router.patch(
  "/:id",
  requireAuth,
  requirePermission(PERMISSIONS.USERS_WRITE),
  UsersController.update,
);

router.patch(
  "/:id/password",
  requireAuth,
  requirePermission(PERMISSIONS.USERS_WRITE),
  UsersController.updatePassword,
);

router.patch(
  "/:id/push-token",
  requireAuth,
  UsersController.updatePushToken,
);

router.delete(
  "/:id",
  requireAuth,
  requirePermission(PERMISSIONS.USERS_WRITE),
  UsersController.remove,
);

export default router;
