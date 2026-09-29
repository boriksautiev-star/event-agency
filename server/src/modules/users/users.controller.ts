import { NextFunction, Request, Response } from "express";
import {
  CreateUserSchema,
  ListUsersQuerySchema,
  UpdatePasswordSchema,
  UpdatePushTokenSchema,
  UpdateUserSchema,
} from "./users.schemas";
import { UsersService } from "./users.service";
import { AppError } from "../../utils/AppError";

export class UsersController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const query = ListUsersQuerySchema.parse(req.query);
      const result = await UsersService.list(query);
      res.json(result);
    } catch (e) {
      next(e);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await UsersService.getById(req.params.id!);
      res.json({ user });
    } catch (e) {
      next(e);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const data = CreateUserSchema.parse(req.body);
      const user = await UsersService.create(data);
      res.status(201).json({ user });
    } catch (e) {
      next(e);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const data = UpdateUserSchema.parse(req.body);
      const user = await UsersService.update(req.params.id!, data);
      res.json({ user });
    } catch (e) {
      next(e);
    }
  }

  static async updatePassword(req: Request, res: Response, next: NextFunction) {
    try {
      const data = UpdatePasswordSchema.parse(req.body);
      const user = await UsersService.updatePassword(req.params.id!, data);
      res.json({ user });
    } catch (e) {
      next(e);
    }
  }

  static async updatePushToken(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new AppError("Требуется авторизация", 401);
      if (req.user.sub !== req.params.id && req.user.role !== "director") {
        throw new AppError("Нет доступа", 403, "FORBIDDEN");
      }
      const data = UpdatePushTokenSchema.parse(req.body);
      const user = await UsersService.updatePushToken(req.params.id!, data);
      res.json({ user });
    } catch (e) {
      next(e);
    }
  }

  static async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await UsersService.remove(req.params.id!);
      res.json(result);
    } catch (e) {
      next(e);
    }
  }
}
