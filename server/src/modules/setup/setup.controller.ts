import { NextFunction, Request, Response } from "express";
import { SetupSchema } from "./setup.schemas";
import { SetupService } from "./setup.service";

export class SetupController {
  static async status(_req: Request, res: Response, next: NextFunction) {
    try {
      const setup = await SetupService.isSetup();
      res.json({ setup });
    } catch (e) {
      next(e);
    }
  }

  static async setup(req: Request, res: Response, next: NextFunction) {
    try {
      const data = SetupSchema.parse(req.body);
      const result = await SetupService.setup(data);
      res.status(201).json(result);
    } catch (e) {
      next(e);
    }
  }
}
