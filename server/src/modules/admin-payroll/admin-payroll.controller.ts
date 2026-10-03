import { NextFunction, Request, Response } from "express";
import { AppError } from "../../utils/AppError";
import {
  SetCompensationSchema,
  AccrualQuerySchema,
  PaymentQuerySchema,
  CreatePaymentSchema,
  FixedAccrualSchema,
} from "./admin-payroll.schemas";
import {
  AdminAccrualService,
  AdminCompensationService,
  AdminPaymentService,
  AdminPayrollQueryService,
} from "./admin-payroll.service";

export class AdminPayrollController {
  static async listAdmins(
    _req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      res.json(await AdminPayrollQueryService.listAdmins());
    } catch (e) {
      next(e);
    }
  }

  static async getAdmin(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      res.json(
        await AdminPayrollQueryService.getAdmin(req.params.id!),
      );
    } catch (e) {
      next(e);
    }
  }

  static async setCompensation(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const input = SetCompensationSchema.parse(req.body);
      res.json(
        await AdminCompensationService.set(req.params.id!, input),
      );
    } catch (e) {
      next(e);
    }
  }

  static async listAccruals(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const q = AccrualQuerySchema.parse(req.query);
      res.json(
        await AdminAccrualService.list(req.params.id!, q),
      );
    } catch (e) {
      next(e);
    }
  }

  static async accrueFixed(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const input = FixedAccrualSchema.parse(req.body);
      res.json(
        await AdminAccrualService.accrueFixed(
          req.params.id!,
          input,
          (req.user as any).sub,
        ),
      );
    } catch (e) {
      next(e);
    }
  }

  static async cancelAccrual(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      res.json(
        await AdminAccrualService.cancel(req.params.accrualId!),
      );
    } catch (e) {
      next(e);
    }
  }

  static async listPayments(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const q = PaymentQuerySchema.parse(req.query);
      res.json(
        await AdminPaymentService.list(req.params.id!, q),
      );
    } catch (e) {
      next(e);
    }
  }

  static async createPayment(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const input = CreatePaymentSchema.parse(req.body);
      res.json(
        await AdminPaymentService.create(
          req.params.id!,
          input,
          (req.user as any).sub,
        ),
      );
    } catch (e) {
      next(e);
    }
  }

  static async removePayment(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      res.json(
        await AdminPaymentService.remove(req.params.paymentId!),
      );
    } catch (e) {
      next(e);
    }
  }

  static async meSummary(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const u = req.user!;
      if (u.role !== "admin") {
        throw new AppError("Только для админа", 403, "NOT_ADMIN");
      }
      const from = req.query.from as string | undefined;
      const to = req.query.to as string | undefined;
      res.json(
        await AdminPayrollQueryService.meSummary((u as any).sub, from, to),
      );
    } catch (e) {
      next(e);
    }
  }

  static async meLedger(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const u = req.user!;
      if (u.role !== "admin") {
        throw new AppError("Только для админа", 403, "NOT_ADMIN");
      }
      const from = req.query.from as string | undefined;
      const to = req.query.to as string | undefined;
      res.json(
        await AdminPayrollQueryService.meLedger((u as any).sub, from, to),
      );
    } catch (e) {
      next(e);
    }
  }
}
