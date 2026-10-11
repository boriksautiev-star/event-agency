import { NextFunction, Request, Response } from "express";
import { AppError } from "../../utils/AppError";
import { RateTemplatesService } from "./rate-templates.service";
import {
  AssignTemplateSchema,
  CreateTemplateSchema,
  SaveOverridesSchema,
  SaveTemplateRatesSchema,
  UpdateTemplateSchema,
} from "./rate-templates.schemas";

function requireDirector(req: Request) {
  if (!req.user) throw new AppError("Требуется авторизация", 401);
  if (req.user.role !== "director") {
    throw new AppError("Доступ только для директора", 403, "FORBIDDEN");
  }
}

export class RateTemplatesController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      requireDirector(req);
      const data = await RateTemplatesService.list();
      res.json({ items: data });
    } catch (e) { next(e); }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      requireDirector(req);
      const data = await RateTemplatesService.getById(req.params.id!);
      res.json(data);
    } catch (e) { next(e); }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      requireDirector(req);
      const input = CreateTemplateSchema.parse(req.body);
      const created = await RateTemplatesService.create(input);
      res.status(201).json(created);
    } catch (e) { next(e); }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      requireDirector(req);
      const input = UpdateTemplateSchema.parse(req.body);
      const updated = await RateTemplatesService.update(req.params.id!, input);
      res.json(updated);
    } catch (e) { next(e); }
  }

  static async remove(req: Request, res: Response, next: NextFunction) {
    try {
      requireDirector(req);
      const result = await RateTemplatesService.remove(req.params.id!);
      res.json(result);
    } catch (e) { next(e); }
  }

  static async saveRates(req: Request, res: Response, next: NextFunction) {
    try {
      requireDirector(req);
      const input = SaveTemplateRatesSchema.parse(req.body);
      const result = await RateTemplatesService.saveRates(req.params.id!, input);
      res.json(result);
    } catch (e) { next(e); }
  }

  static async assign(req: Request, res: Response, next: NextFunction) {
    try {
      requireDirector(req);
      const input = AssignTemplateSchema.parse(req.body);
      const result = await RateTemplatesService.assign(input);
      res.json(result);
    } catch (e) { next(e); }
  }

  static async getOverrides(req: Request, res: Response, next: NextFunction) {
    try {
      requireDirector(req);
      const data = await RateTemplatesService.getOverrides(req.query.animatorId as string);
      res.json(data);
    } catch (e) { next(e); }
  }

  static async saveOverrides(req: Request, res: Response, next: NextFunction) {
    try {
      requireDirector(req);
      const input = SaveOverridesSchema.parse(req.body);
      const result = await RateTemplatesService.saveOverrides(input);
      res.json(result);
    } catch (e) { next(e); }
  }
}
