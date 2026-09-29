import { NextFunction, Request, Response } from "express";
import {
  CreateClientSchema,
  ListClientsQuerySchema,
  UpdateClientSchema,
} from "./clients.schemas";
import { ClientsService } from "./clients.service";
import { AppError } from "../../utils/AppError";

export class ClientsController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new AppError("Требуется авторизация", 401);
      const query = ListClientsQuerySchema.parse(req.query);
      const result = await ClientsService.list(query, req.user.sub);
      res.json(result);
    } catch (e) {
      next(e);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const client = await ClientsService.getById(req.params.id!);
      res.json({ client });
    } catch (e) {
      next(e);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new AppError("Требуется авторизация", 401);
      const data = CreateClientSchema.parse(req.body);
      const client = await ClientsService.create(data, req.user.sub);
      res.status(201).json({ client });
    } catch (e) {
      next(e);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const data = UpdateClientSchema.parse(req.body);
      const client = await ClientsService.update(req.params.id!, data);
      res.json({ client });
    } catch (e) {
      next(e);
    }
  }

  static async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await ClientsService.remove(req.params.id!);
      res.json(result);
    } catch (e) {
      next(e);
    }
  }
}
