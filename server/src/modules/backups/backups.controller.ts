import { Request, Response, NextFunction } from "express";
import { BackupsService } from "./backups.service";
import { AppError } from "../../utils/AppError";

function requireDirector(req: Request) {
  if (!req.user) throw new AppError("Требуется авторизация", 401);
  if (req.user.role !== "director") throw new AppError("Только директор", 403, "FORBIDDEN");
}

export class BackupsController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      requireDirector(req);
      const items = await BackupsService.list();
      res.json({ items });
    } catch (e) { next(e); }
  }

  static async status(req: Request, res: Response, next: NextFunction) {
    try {
      requireDirector(req);
      const status = await BackupsService.getStatus();
      res.json(status);
    } catch (e) { next(e); }
  }

  static async createNow(req: Request, res: Response, next: NextFunction) {
    try {
      requireDirector(req);
      const result = await BackupsService.createNow(req.user!.sub);
      res.json(result);
    } catch (e) { next(e); }
  }

  static async prepareRestore(req: Request, res: Response, next: NextFunction) {
    try {
      requireDirector(req);
      const { password, fileName } = req.body || {};
      if (!fileName) throw new AppError("fileName обязателен", 400);
      const result = await BackupsService.prepareRestore(req.user!.sub, password, fileName);
      res.json(result);
    } catch (e) { next(e); }
  }
}
