import { NextFunction, Request, Response } from "express";
import {
  CreateExpenseSchema,
  ExpenseCategorySchema,
  ListExpensesQuerySchema,
  MarkPaidSchema,
  PayoutsQuerySchema,
  PeriodQuerySchema,
  UpdateExpenseCategorySchema,
  UpdateExpenseSchema,
  PaymentsQuerySchema,
} from "./finance.schemas";
import { FinanceService } from "./finance.service";
import { FinanceExportService } from "./finance.export.service";
import { AppError } from "../../utils/AppError";

function sendCSV(res: Response, filename: string, csv: string) {
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}.csv"`);
  res.send(csv);
}

function sendExcel(res: Response, filename: string, buffer: Buffer) {
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );
  res.setHeader("Content-Disposition", `attachment; filename="${filename}.xlsx"`);
  res.send(buffer);
}

function getFormat(req: Request): "xlsx" | "csv" {
  const f = String(req.query.format ?? "xlsx").toLowerCase();
  return f === "csv" ? "csv" : "xlsx";
}

export class FinanceController {
  static async summary(req: Request, res: Response, next: NextFunction) {
    try {
      const query = PeriodQuerySchema.parse(req.query);
      const result = await FinanceService.summary(query);
      res.json(result);
    } catch (e) { next(e); }
  }

  static async listPayments(req: Request, res: Response, next: NextFunction) {
    try {
      const query = PaymentsQuerySchema.parse(req.query);
      const result = await FinanceService.listPayments(query);
      res.json(result);
    } catch (e) { next(e); }
  }
  static async listPayouts(req: Request, res: Response, next: NextFunction) {
    try {
      const query = PayoutsQuerySchema.parse(req.query);
      const result = await FinanceService.listPayouts(query);
      res.json(result);
    } catch (e) { next(e); }
  }

  static async markPaid(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new AppError("Требуется авторизация", 401);
      const { method } = MarkPaidSchema.parse(req.body);
      const result = await FinanceService.markPaid(req.params.id!, req.user.sub, method);
      res.json(result);
    } catch (e) { next(e); }
  }

  static async unmarkPaid(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new AppError("\u0422\u0440\u0435\u0431\u0443\u0435\u0442\u0441\u044F \u0430\u0432\u0442\u043E\u0440\u0438\u0437\u0430\u0446\u0438\u044F", 401);
      const result = await FinanceService.unmarkPaid(req.params.id!, req.user.sub);
      res.json(result);
    } catch (e) { next(e); }
  }

  static async listCategories(_req: Request, res: Response, next: NextFunction) {
    try {
      const items = await FinanceService.listCategories();
      res.json({ items });
    } catch (e) { next(e); }
  }

  static async createCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const data = ExpenseCategorySchema.parse(req.body);
      const category = await FinanceService.createCategory(data);
      res.status(201).json({ category });
    } catch (e) { next(e); }
  }

  static async updateCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const data = UpdateExpenseCategorySchema.parse(req.body);
      const category = await FinanceService.updateCategory(req.params.id!, data);
      res.json({ category });
    } catch (e) { next(e); }
  }

  static async deleteCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await FinanceService.deleteCategory(req.params.id!);
      res.json(result);
    } catch (e) { next(e); }
  }

  static async listExpenses(req: Request, res: Response, next: NextFunction) {
    try {
      const query = ListExpensesQuerySchema.parse(req.query);
      const result = await FinanceService.listExpenses(query);
      res.json(result);
    } catch (e) { next(e); }
  }

  static async createExpense(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new AppError("Требуется авторизация", 401);
      const data = CreateExpenseSchema.parse(req.body);
      const expense = await FinanceService.createExpense(data, req.user.sub);
      res.status(201).json({ expense });
    } catch (e) { next(e); }
  }

  static async updateExpense(req: Request, res: Response, next: NextFunction) {
    try {
      const data = UpdateExpenseSchema.parse(req.body);
      const expense = await FinanceService.updateExpense(req.params.id!, data);
      res.json({ expense });
    } catch (e) { next(e); }
  }

  static async deleteExpense(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await FinanceService.deleteExpense(req.params.id!);
      res.json(result);
    } catch (e) { next(e); }
  }

  // ==== Экспорт ====
  static async exportOrders(req: Request, res: Response, next: NextFunction) {
    try {
      const query = PeriodQuerySchema.parse(req.query);
      const format = getFormat(req);
      const filename = `orders_${query.from}_${query.to}`;
      if (format === "csv") {
        const csv = await FinanceExportService.ordersCSV(query.from, query.to);
        return sendCSV(res, filename, csv);
      }
      const buffer = await FinanceExportService.ordersExcel(query.from, query.to);
      sendExcel(res, filename, buffer);
    } catch (e) { next(e); }
  }

  static async exportPayouts(req: Request, res: Response, next: NextFunction) {
    try {
      const query = PayoutsQuerySchema.parse(req.query);
      const format = getFormat(req);
      const from = query.from ?? "2020-01-01";
      const to = query.to ?? new Date().toISOString().slice(0, 10);
      const filename = `payouts_${from}_${to}`;
      if (format === "csv") {
        const csv = await FinanceExportService.payoutsCSV(from, to, query.paid);
        return sendCSV(res, filename, csv);
      }
      const buffer = await FinanceExportService.payoutsExcel(from, to, query.paid);
      sendExcel(res, filename, buffer);
    } catch (e) { next(e); }
  }

  static async exportExpenses(req: Request, res: Response, next: NextFunction) {
    try {
      const query = ListExpensesQuerySchema.parse(req.query);
      const format = getFormat(req);
      const from = query.from ?? "2020-01-01";
      const to = query.to ?? new Date().toISOString().slice(0, 10);
      const filename = `expenses_${from}_${to}`;
      if (format === "csv") {
        const csv = await FinanceExportService.expensesCSV(from, to, query.categoryId);
        return sendCSV(res, filename, csv);
      }
      const buffer = await FinanceExportService.expensesExcel(from, to, query.categoryId);
      sendExcel(res, filename, buffer);
    } catch (e) { next(e); }
  }
}