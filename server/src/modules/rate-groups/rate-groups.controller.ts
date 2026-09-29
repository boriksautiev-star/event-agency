import { NextFunction, Request, Response } from "express";
import { CreateRateGroupSchema, UpdateRateGroupSchema } from "./rate-groups.schemas";
import { RateGroupsService } from "./rate-groups.service";

export class RateGroupsController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const includeInactive = req.query.includeInactive === "true";
      const items = await RateGroupsService.list(includeInactive);
      res.json({ items });
    } catch (e) { next(e); }
  }

  static async get(req: Request, res: Response, next: NextFunction) {
    try {
      const group = await RateGroupsService.get(req.params.id!);
      res.json({ group });
    } catch (e) { next(e); }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const data = CreateRateGroupSchema.parse(req.body);
      const group = await RateGroupsService.create(data);
      res.status(201).json({ group });
    } catch (e) { next(e); }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const data = UpdateRateGroupSchema.parse(req.body);
      const group = await RateGroupsService.update(req.params.id!, data);
      res.json({ group });
    } catch (e) { next(e); }
  }

  static async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await RateGroupsService.delete(req.params.id!);
      res.json(result);
    } catch (e) { next(e); }
  }
}