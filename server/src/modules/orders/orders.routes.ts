import { Router } from "express";
import { requireAuth } from "../../middlewares/requireAuth";
import { requirePermission } from "../../middlewares/requirePermission";
import { PERMISSIONS } from "@event-agency/shared";
import { OrdersController } from "./orders.controller";
import { HandoverController } from "../handover/handover.controller";

const router = Router();

router.get("/", requireAuth, requirePermission(PERMISSIONS.ORDERS_READ), OrdersController.list);
router.get("/:id", requireAuth, requirePermission(PERMISSIONS.ORDERS_READ), OrdersController.getById);

router.post("/", requireAuth, requirePermission(PERMISSIONS.ORDERS_WRITE), OrdersController.create);
router.patch("/:id", requireAuth, requirePermission(PERMISSIONS.ORDERS_WRITE), OrdersController.update);
router.patch("/:id/status", requireAuth, requirePermission(PERMISSIONS.ORDERS_WRITE), OrdersController.updateStatus);

// Слоты (персонаж + длительность)
router.post("/:id/slots", requireAuth, requirePermission(PERMISSIONS.ORDERS_ASSIGN), OrdersController.addSlot);
router.patch("/:id/slots/:slotId", requireAuth, requirePermission(PERMISSIONS.ORDERS_ASSIGN), OrdersController.updateSlot);
router.delete("/:id/slots/:slotId", requireAuth, requirePermission(PERMISSIONS.ORDERS_ASSIGN), OrdersController.removeSlot);

router.post("/:id/animators", requireAuth, requirePermission(PERMISSIONS.ORDERS_ASSIGN), OrdersController.assignAnimator);
router.patch("/:id/animators/:animatorId", requireAuth, OrdersController.updateAssignment);
router.patch("/:id/animators/:animatorId/transport", requireAuth, OrdersController.updateTransport);

// ===== Передача заказа (handover) на конкретном слоте =====
router.get(
  "/:id/slots/:slotId/handover-candidates",
  requireAuth,
  HandoverController.candidates,
);
router.post(
  "/:id/slots/:slotId/handover",
  requireAuth,
  HandoverController.create,
);
router.delete("/:id/animators/:animatorId", requireAuth, requirePermission(PERMISSIONS.ORDERS_ASSIGN), OrdersController.removeAssignment);

// Финальная оплата
router.post("/:id/final-payment", requireAuth, OrdersController.markFinalPayment);
router.delete("/:id/final-payment", requireAuth, OrdersController.unmarkFinalPayment);
router.post("/:id/final-payment/handover", requireAuth, OrdersController.handoverFinalPayment);

export default router;