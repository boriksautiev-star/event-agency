import { NextFunction, Request, Response } from "express";
import { LoginSchema, RefreshSchema } from "./auth.schemas";
import { AuthService } from "./auth.service";
import { AppError } from "../../utils/AppError";

export class AuthController {
  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const data = LoginSchema.parse(req.body);
      const result = await AuthService.login(data);
      res.json(result);
    } catch (e) {
      next(e);
    }
  }

  static async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const data = RefreshSchema.parse(req.body);
      const result = await AuthService.refresh(data);
      res.json(result);
    } catch (e) {
      next(e);
    }
  }

  static async logout(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new AppError("Требуется авторизация", 401);
      const refreshToken = typeof req.body?.refreshToken === "string" ? req.body.refreshToken : undefined;
      const result = await AuthService.logout(req.user.sub, refreshToken);
      res.json(result);
    } catch (e) {
      next(e);
    }
  }

  static async me(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new AppError("Требуется авторизация", 401);
      const user = await AuthService.me(req.user.sub);
      res.json({ user });
    } catch (e) {
      next(e);
    }
  }
}
