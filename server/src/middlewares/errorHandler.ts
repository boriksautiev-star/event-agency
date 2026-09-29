import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { AppError } from "../utils/AppError";

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (err instanceof ZodError) {
    return res.status(422).json({
      error: "Ошибка валидации",
      code: "VALIDATION_ERROR",
      details: err.flatten(),
    });
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.message,
      code: err.code ?? "APP_ERROR",
    });
  }

  console.error("[UNHANDLED]", err);
  return res.status(500).json({
    error: "Внутренняя ошибка сервера",
    code: "INTERNAL_ERROR",
  });
}
