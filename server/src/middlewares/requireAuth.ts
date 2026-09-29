import { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/AppError";
import { JwtPayload, verifyAccessToken } from "../utils/jwt";

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return next(new AppError("Требуется авторизация", 401, "NO_TOKEN"));
  }
  const token = header.slice(7);
  try {
    req.user = verifyAccessToken(token);
    next();
  } catch {
    next(new AppError("Недействительный токен", 401, "BAD_TOKEN"));
  }
}
