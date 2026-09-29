import { NextFunction, Request, Response } from "express";
import { hasPermission, Permission, Role } from "@event-agency/shared";
import { AppError } from "../utils/AppError";

export function requirePermission(permission: Permission) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) return next(new AppError("Требуется авторизация", 401, "NO_USER"));
    if (!hasPermission(user.role as Role, permission)) {
      return next(new AppError("Недостаточно прав", 403, "FORBIDDEN"));
    }
    next();
  };
}
