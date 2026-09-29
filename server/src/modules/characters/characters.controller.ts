import { NextFunction, Request, Response } from "express";
import {
  CreateCharacterSchema,
  UpdateCharacterSchema,
  ReplacePricesSchema,
} from "./characters.schemas";
import { CharactersService } from "./characters.service";

export class CharactersController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const rateGroupId = typeof req.query.rateGroupId === "string" ? req.query.rateGroupId : undefined;
      const activeOnly = req.query.activeOnly === "true";
      const search = typeof req.query.search === "string" ? req.query.search : undefined;
      const items = await CharactersService.list({ rateGroupId, activeOnly, search });
      res.json({ items });
    } catch (e) { next(e); }
  }

  static async get(req: Request, res: Response, next: NextFunction) {
    try {
      const character = await CharactersService.get(req.params.id!);
      res.json({ character });
    } catch (e) { next(e); }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const data = CreateCharacterSchema.parse(req.body);
      const character = await CharactersService.create(data);
      res.status(201).json({ character });
    } catch (e) { next(e); }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const data = UpdateCharacterSchema.parse(req.body);
      const character = await CharactersService.update(req.params.id!, data);
      res.json({ character });
    } catch (e) { next(e); }
  }

  static async replacePrices(req: Request, res: Response, next: NextFunction) {
    try {
      const data = ReplacePricesSchema.parse(req.body);
      const character = await CharactersService.replacePrices(req.params.id!, data);
      res.json({ character });
    } catch (e) { next(e); }
  }

  static async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await CharactersService.delete(req.params.id!);
      res.json(result);
    } catch (e) { next(e); }
  }
}