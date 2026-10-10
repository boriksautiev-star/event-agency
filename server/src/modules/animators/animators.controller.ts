import { NextFunction, Request, Response } from "express";
import { AnimatorsService } from "./animators.service";
import { AnimatorReportService } from "./animator-report.service";
import { AppError } from "../../utils/AppError";

export class AnimatorsController {
  static async availability(req: Request, res: Response, next: NextFunction) {
    try {
      const date = typeof req.query.date === "string" ? req.query.date : "";
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        throw new AppError("Параметр date обязателен в формате ГГГГ-ММ-ДД", 400, "BAD_DATE");
      }
      const items = await AnimatorsService.availability(date);
      res.json({ items, date });
    } catch (e) { next(e); }
  }

  static async reportById(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new AppError("Требуется авторизация", 401);
      if (req.user.role !== "director" && req.user.role !== "admin") {
        throw new AppError("Нет доступа", 403, "FORBIDDEN");
      }

      const from = typeof req.query.from === "string" ? req.query.from : "";
      const to = typeof req.query.to === "string" ? req.query.to : "";
      if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
        throw new AppError(
          "Параметры from и to обязательны в формате ГГГГ-ММ-ДД",
          400,
          "BAD_PERIOD",
        );
      }

      const status = typeof req.query.status === "string" ? req.query.status : undefined;
      const scopeRaw = typeof req.query.scope === "string" ? req.query.scope : "all";
      const scope = ["past", "future", "all"].includes(scopeRaw)
        ? (scopeRaw as "past" | "future" | "all")
        : "all";

      const result = await AnimatorReportService.report(req.params.id!, {
        from, to, status, scope,
      });
      res.json(result);
    } catch (e) { next(e); }
  }

  static async myReport(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new AppError("Требуется авторизация", 401);

      const from = typeof req.query.from === "string" ? req.query.from : "";
      const to = typeof req.query.to === "string" ? req.query.to : "";

      if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
        throw new AppError(
          "Параметры from и to обязательны в формате ГГГГ-ММ-ДД",
          400,
          "BAD_PERIOD",
        );
      }

      const status = typeof req.query.status === "string" ? req.query.status : undefined;
      const scopeRaw = typeof req.query.scope === "string" ? req.query.scope : "all";
      const scope = ["past", "future", "all"].includes(scopeRaw)
        ? (scopeRaw as "past" | "future" | "all")
        : "all";

      const result = await AnimatorReportService.report(req.user.sub, {
        from,
        to,
        status,
        scope,
      });
      res.json(result);
    } catch (e) { next(e); }
  }
}