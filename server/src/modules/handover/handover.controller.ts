import { NextFunction, Request, Response } from "express";
import { AppError } from "../../utils/AppError";
import {
  CreateHandoverSchema,
  RejectHandoverSchema,
  HandoverListQuerySchema,
} from "./handover.schemas";
import { HandoverService } from "./handover.service";

function requireRole(req: Request, roles: string[]) {
  if (!req.user) throw new AppError("Требуется авторизация", 401);
  if (!roles.includes(req.user.role as string)) {
    throw new AppError("Нет доступа", 403, "FORBIDDEN");
  }
}

export class HandoverController {
  // ===== Аниматор: создать заявку =====
  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new AppError("Требуется авторизация", 401);
      if (req.user.role !== "animator") {
        throw new AppError("Только аниматор может создать заявку", 403, "FORBIDDEN");
      }
      const input = CreateHandoverSchema.parse(req.body);
      const result = await HandoverService.create(
        req.params.id!,
        req.params.slotId!,
        req.user.sub,
        input,
      );
      res.status(201).json(result);
    } catch (e) { next(e); }
  }

  // ===== Списки =====
  static async myOutgoing(req: Request, res: Response, next: NextFunction) {
    try {
      requireRole(req, ["animator"]);
      const q = HandoverListQuerySchema.parse(req.query);
      const result = await HandoverService.listForFrom(req.user!.sub, q);
      res.json(result);
    } catch (e) { next(e); }
  }

  static async myIncoming(req: Request, res: Response, next: NextFunction) {
    try {
      requireRole(req, ["animator"]);
      const q = HandoverListQuerySchema.parse(req.query);
      const result = await HandoverService.listForTo(req.user!.sub, q);
      res.json(result);
    } catch (e) { next(e); }
  }

  static async pendingApproval(req: Request, res: Response, next: NextFunction) {
    try {
      requireRole(req, ["director", "admin"]);
      const q = HandoverListQuerySchema.parse(req.query);
      const result = await HandoverService.listPendingApproval(q);
      res.json(result);
    } catch (e) { next(e); }
  }

  // ===== Действия =====
  static async accept(req: Request, res: Response, next: NextFunction) {
    try {
      requireRole(req, ["animator"]);
      const result = await HandoverService.accept(req.params.id!, req.user!.sub);
      res.json(result);
    } catch (e) { next(e); }
  }

  static async decline(req: Request, res: Response, next: NextFunction) {
    try {
      requireRole(req, ["animator"]);
      const input = RejectHandoverSchema.parse(req.body ?? {});
      const result = await HandoverService.decline(
        req.params.id!,
        req.user!.sub,
        input,
      );
      res.json(result);
    } catch (e) { next(e); }
  }

  static async cancel(req: Request, res: Response, next: NextFunction) {
    try {
      requireRole(req, ["animator"]);
      const result = await HandoverService.cancel(req.params.id!, req.user!.sub);
      res.json(result);
    } catch (e) { next(e); }
  }

  static async approve(req: Request, res: Response, next: NextFunction) {
    try {
      requireRole(req, ["director", "admin"]);
      const result = await HandoverService.approve(req.params.id!, req.user!.sub);
      res.json(result);
    } catch (e) { next(e); }
  }

  static async reject(req: Request, res: Response, next: NextFunction) {
    try {
      requireRole(req, ["director", "admin"]);
      const input = RejectHandoverSchema.parse(req.body ?? {});
      const result = await HandoverService.reject(
        req.params.id!,
        req.user!.sub,
        input,
      );
      res.json(result);
    } catch (e) { next(e); }
  }

  // ===== Детали =====
  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new AppError("Требуется авторизация", 401);
      const req_ = await HandoverService.getById(req.params.id!);
      const uid = req.user.sub;
      const role = req.user.role;
      const isStaff = role === "director" || role === "admin";
      const isParty =
        req_.fromAnimatorId === uid || req_.toAnimatorId === uid;
      if (!isStaff && !isParty) {
        throw new AppError("Нет доступа", 403, "FORBIDDEN");
      }
      res.json(req_);
    } catch (e) { next(e); }
  }

  // ===== Кандидаты (свободные аниматоры) =====
  static async candidates(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new AppError("Требуется авторизация", 401);
      const list = await HandoverService.candidates(
        req.params.id!,
        req.params.slotId!,
        req.user.sub,
      );
      res.json({ items: list });
    } catch (e) { next(e); }
  }
}
