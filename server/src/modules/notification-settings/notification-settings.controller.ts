import { Request, Response, NextFunction } from "express";
import { NotificationSettingsService } from "./notification-settings.service";
import { AppError } from "../../utils/AppError";

export class NotificationSettingsController {
  static async getMySettings(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new AppError("Требуется авторизация", 401);
      const settings = await NotificationSettingsService.getMySettings(req.user.sub);
      res.json({ settings });
    } catch (e) { next(e); }
  }

  static async updateMySettings(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new AppError("Требуется авторизация", 401);
      const updates = req.body.settings;
      if (!Array.isArray(updates)) throw new AppError("Некорректный формат данных", 400);
      await NotificationSettingsService.updateMySettings(req.user.sub, updates);
      res.json({ success: true });
    } catch (e) { next(e); }
  }
}