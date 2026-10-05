import { NextFunction, Request, Response } from "express";
import {
  AssignAnimatorSchema,
  CreateOrderSchema,
  CreateSlotSchema,
  ListOrdersQuerySchema,
  MarkFinalPaymentSchema,
  UpdateAssignmentSchema,
  UpdateOrderSchema,
  UpdateOrderStatusSchema,
  UpdateSlotSchema,
  UpdateTransportSchema,
} from "./orders.schemas";
import { OrdersService } from "./orders.service";
import { AppError } from "../../utils/AppError";

export class OrdersController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new AppError("Требуется авторизация", 401);
      const query = ListOrdersQuerySchema.parse(req.query);
      const result = await OrdersService.list(query, req.user.sub, req.user.role);
      res.json(result);
    } catch (e) { next(e); }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new AppError("Требуется авторизация", 401);
      const order = await OrdersService.getById(req.params.id!, req.user.sub, req.user.role);
      res.json({ order });
    } catch (e) { next(e); }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new AppError("Требуется авторизация", 401);
      const data = CreateOrderSchema.parse(req.body);
      const order = await OrdersService.create(data, req.user.sub);
      res.status(201).json({ order });
    } catch (e) { next(e); }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new AppError("Требуется авторизация", 401);
      const data = UpdateOrderSchema.parse(req.body);
      const order = await OrdersService.update(
        req.params.id!,
        data,
        req.user.sub,
        req.user.role,
      );
      res.json({ order });
    } catch (e) { next(e); }
  }

  static async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new AppError("Требуется авторизация", 401);
      const data = UpdateOrderStatusSchema.parse(req.body);
      const order = await OrdersService.updateStatus(
        req.params.id!,
        data,
        req.user.sub,
        req.user.role,
      );
      res.json({ order });
    } catch (e) { next(e); }
  }

  // ===== Слоты =====
  static async addSlot(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new AppError("Требуется авторизация", 401);
      const data = CreateSlotSchema.parse(req.body);
      const slot = await OrdersService.addSlot(req.params.id!, data, req.user.sub);
      res.status(201).json({ slot });
    } catch (e) { next(e); }
  }

  static async updateSlot(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new AppError("Требуется авторизация", 401);
      const data = UpdateSlotSchema.parse(req.body);
      const result = await OrdersService.updateSlot(
        req.params.id!, req.params.slotId!, data, req.user.sub,
      );
      res.json(result);
    } catch (e) { next(e); }
  }

  static async removeSlot(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new AppError("Требуется авторизация", 401);
      const result = await OrdersService.removeSlot(
        req.params.id!, req.params.slotId!, req.user.sub,
      );
      res.json(result);
    } catch (e) { next(e); }
  }

  static async assignAnimator(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new AppError("Требуется авторизация", 401);
      const data = AssignAnimatorSchema.parse(req.body);
      const assignment = await OrdersService.assignAnimator(req.params.id!, data, req.user.sub);
      res.status(201).json({ assignment });
    } catch (e) { next(e); }
  }

  static async updateAssignment(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new AppError("Требуется авторизация", 401);
      const data = UpdateAssignmentSchema.parse(req.body);
      const assignment = await OrdersService.updateAssignment(
        req.params.id!, req.params.animatorId!, data, req.user.sub, req.user.role,
      );
      res.json({ assignment });
    } catch (e) { next(e); }
  }

  static async updateTransport(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new AppError("Требуется авторизация", 401);
      const data = UpdateTransportSchema.parse(req.body);
      const assignment = await OrdersService.updateTransport(
        req.params.id!, req.params.animatorId!, data, req.user.sub, req.user.role,
      );
      res.json({ assignment });
    } catch (e) { next(e); }
  }

  static async removeAssignment(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new AppError("Требуется авторизация", 401);
      const result = await OrdersService.removeAssignment(
        req.params.id!, req.params.animatorId!, req.user.sub,
      );
      res.json(result);
    } catch (e) { next(e); }
  }

  // ===== Финальная оплата =====
  static async markFinalPayment(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new AppError("Требуется авторизация", 401);
      const data = MarkFinalPaymentSchema.parse(req.body);
      const order = await OrdersService.markFinalPayment(
        req.params.id!, data, req.user.sub, req.user.role,
      );
      res.json({ order });
    } catch (e) { next(e); }
  }

  static async unmarkFinalPayment(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new AppError("Требуется авторизация", 401);
      if (req.user.role !== "director" && req.user.role !== "admin") {
        throw new AppError("Нет доступа", 403, "FORBIDDEN");
      }
      const order = await OrdersService.unmarkFinalPayment(req.params.id!, req.user.sub);
      res.json({ order });
    } catch (e) { next(e); }
  }

  static async handoverFinalPayment(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new AppError("Требуется авторизация", 401);
      if (req.user.role !== "director") {
        throw new AppError(
          "Сдать в кассу / сверить может только директор.",
          403,
          "FORBIDDEN",
        );
      }
      const order = await OrdersService.handoverFinalPayment(req.params.id!, req.user.sub);
      res.json({ order });
    } catch (e) { next(e); }
  }
}