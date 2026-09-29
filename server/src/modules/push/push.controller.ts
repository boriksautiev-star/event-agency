import { NextFunction, Request, Response } from "express";
import { PushService } from "./push.service";
import { AppError } from "../../utils/AppError";

export class PushController {
  static async test(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new AppError("Требуется авторизация", 401);
      const result = await PushService.send({
        userIds: [req.user.sub],
        title: "Тест push",
        body: "Если вы видите это сообщение — push работают!",
        data: { type: "test" },
      });
      res.json(result);
    } catch (e) { next(e); }
  }
}