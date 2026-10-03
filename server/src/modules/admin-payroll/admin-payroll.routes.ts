import { Router } from "express";
import { requireAuth } from "../../middlewares/requireAuth";
import { requirePermission } from "../../middlewares/requirePermission";
import { PERMISSIONS } from "@event-agency/shared";
import { AdminPayrollController } from "./admin-payroll.controller";

const router = Router();

// me (admin)
router.get(
  "/me/summary",
  requireAuth,
  AdminPayrollController.meSummary,
);
router.get(
  "/me/ledger",
  requireAuth,
  AdminPayrollController.meLedger,
);

// management (director)
router.get(
  "/admins",
  requireAuth,
  requirePermission(PERMISSIONS.USERS_READ),
  AdminPayrollController.listAdmins,
);
router.get(
  "/admins/:id",
  requireAuth,
  requirePermission(PERMISSIONS.USERS_READ),
  AdminPayrollController.getAdmin,
);
router.post(
  "/admins/:id/compensation",
  requireAuth,
  requirePermission(PERMISSIONS.USERS_WRITE),
  AdminPayrollController.setCompensation,
);
router.get(
  "/admins/:id/accruals",
  requireAuth,
  requirePermission(PERMISSIONS.FINANCE_READ),
  AdminPayrollController.listAccruals,
);
router.post(
  "/admins/:id/fixed-accruals",
  requireAuth,
  requirePermission(PERMISSIONS.FINANCE_WRITE),
  AdminPayrollController.accrueFixed,
);
router.delete(
  "/accruals/:accrualId",
  requireAuth,
  requirePermission(PERMISSIONS.FINANCE_WRITE),
  AdminPayrollController.cancelAccrual,
);
router.get(
  "/admins/:id/payments",
  requireAuth,
  requirePermission(PERMISSIONS.FINANCE_READ),
  AdminPayrollController.listPayments,
);
router.post(
  "/admins/:id/payments",
  requireAuth,
  requirePermission(PERMISSIONS.FINANCE_WRITE),
  AdminPayrollController.createPayment,
);
router.delete(
  "/payments/:paymentId",
  requireAuth,
  requirePermission(PERMISSIONS.FINANCE_WRITE),
  AdminPayrollController.removePayment,
);

export default router;
