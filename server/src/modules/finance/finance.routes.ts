import { Router } from "express";
import { requireAuth } from "../../middlewares/requireAuth";
import { requirePermission } from "../../middlewares/requirePermission";
import { PERMISSIONS } from "@event-agency/shared";
import { FinanceController } from "./finance.controller";

const router = Router();

router.get("/summary", requireAuth, requirePermission(PERMISSIONS.FINANCE_READ), FinanceController.summary);

router.get("/payouts", requireAuth, requirePermission(PERMISSIONS.FINANCE_READ), FinanceController.listPayouts);
router.get("/payments", requireAuth, requirePermission(PERMISSIONS.FINANCE_READ), FinanceController.listPayments);
router.post("/payouts/:id/paid", requireAuth, requirePermission(PERMISSIONS.FINANCE_WRITE), FinanceController.markPaid);
router.delete("/payouts/:id/paid", requireAuth, requirePermission(PERMISSIONS.FINANCE_WRITE), FinanceController.unmarkPaid);

router.get("/expense-categories", requireAuth, requirePermission(PERMISSIONS.FINANCE_READ), FinanceController.listCategories);
router.post("/expense-categories", requireAuth, requirePermission(PERMISSIONS.FINANCE_WRITE), FinanceController.createCategory);
router.patch("/expense-categories/:id", requireAuth, requirePermission(PERMISSIONS.FINANCE_WRITE), FinanceController.updateCategory);
router.delete("/expense-categories/:id", requireAuth, requirePermission(PERMISSIONS.FINANCE_WRITE), FinanceController.deleteCategory);

router.get("/expenses", requireAuth, requirePermission(PERMISSIONS.FINANCE_READ), FinanceController.listExpenses);
router.post("/expenses", requireAuth, requirePermission(PERMISSIONS.FINANCE_WRITE), FinanceController.createExpense);
router.patch("/expenses/:id", requireAuth, requirePermission(PERMISSIONS.FINANCE_WRITE), FinanceController.updateExpense);
router.delete("/expenses/:id", requireAuth, requirePermission(PERMISSIONS.FINANCE_WRITE), FinanceController.deleteExpense);

// Экспорт CSV
router.get("/export/orders", requireAuth, requirePermission(PERMISSIONS.FINANCE_READ), FinanceController.exportOrders);
router.get("/export/payouts", requireAuth, requirePermission(PERMISSIONS.FINANCE_READ), FinanceController.exportPayouts);
router.get("/export/expenses", requireAuth, requirePermission(PERMISSIONS.FINANCE_READ), FinanceController.exportExpenses);

export default router;