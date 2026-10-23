import { Request, Response, NextFunction } from "express";
import { LicenseService } from "./license.service";
import { AppError } from "../utils/AppError";

export class LicenseController {
  static async getStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const info = await LicenseService.getStatus();
      res.json(info);
    } catch (e) { next(e); }
  }

  static async upload(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user || req.user.role !== "director") throw new AppError("Только директор может загружать лицензию", 403);
      const { key } = req.body;
      if (!key || typeof key !== "string") throw new AppError("Ключ не передан", 400);
      await LicenseService.uploadLicense(key.trim());
      res.json({ ok: true });
    } catch (e) { next(e); }
  }
}
