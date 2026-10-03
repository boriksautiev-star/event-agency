import { NextFunction, Request, Response } from "express";
import { SettingsService } from "./settings.service";

export class SettingsController {
  static async get(_req: Request, res: Response, next: NextFunction) {
    try {
      const settings = await SettingsService.get();
      res.json(settings);
    } catch (e) {
      next(e);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const settings = await SettingsService.update(req.body ?? {});
      res.json(settings);
    } catch (e) {
      next(e);
    }
  }
}
