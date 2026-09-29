import { NextFunction, Request, Response } from "express";
import { MatrixQuerySchema, RateLookupQuerySchema, SaveMatrixSchema } from "./rates.schemas";
import { RatesService } from "./rates.service";

export class RatesController {
  static async lookup(req: Request, res: Response, next: NextFunction) {
    try {
      const q = RateLookupQuerySchema.parse(req.query);
      const result = await RatesService.lookup(q.animatorId, q.characterId, q.durationMin);
      res.json(result);
    } catch (e) { next(e); }
  }

  static async getMatrix(req: Request, res: Response, next: NextFunction) {
    try {
      const q = MatrixQuerySchema.parse(req.query);
      const matrix = await RatesService.getMatrix(q.animatorId);
      res.json(matrix);
    } catch (e) { next(e); }
  }

  static async saveMatrix(req: Request, res: Response, next: NextFunction) {
    try {
      const data = SaveMatrixSchema.parse(req.body);
      const result = await RatesService.saveMatrix(data);
      res.json(result);
    } catch (e) { next(e); }
  }
}