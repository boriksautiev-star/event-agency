import { Router } from "express";
import { requireAuth } from "../../middlewares/requireAuth";
import { HandoverController } from "./handover.controller";

const router = Router();

// ===== Мои заявки (аниматор) =====
router.get("/my-outgoing", requireAuth, HandoverController.myOutgoing);
router.get("/my-incoming", requireAuth, HandoverController.myIncoming);

// ===== Очередь (director/admin) =====
router.get("/pending-approval", requireAuth, HandoverController.pendingApproval);

// ===== Действия =====
router.post("/:id/accept", requireAuth, HandoverController.accept);
router.post("/:id/decline", requireAuth, HandoverController.decline);
router.delete("/:id", requireAuth, HandoverController.cancel);
router.post("/:id/approve", requireAuth, HandoverController.approve);
router.post("/:id/reject", requireAuth, HandoverController.reject);

// ===== Детали =====
router.get("/:id", requireAuth, HandoverController.getById);

export default router;
