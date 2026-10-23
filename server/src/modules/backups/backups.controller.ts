import { Request, Response, NextFunction } from "express";
import { BackupsService } from "./backups.service";
import { AppError } from "../../utils/AppError";
import { S3Service } from "./s3.service";

function requireDirector(req: Request) {
  if (!req.user) throw new AppError("Требуется авторизация", 401);
  if (req.user.role !== "director") throw new AppError("Только директор", 403, "FORBIDDEN");
}

export class BackupsController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      requireDirector(req);
      const items = await BackupsService.list();
      res.json({ items });
    } catch (e) { next(e); }
  }

  static async status(req: Request, res: Response, next: NextFunction) {
    try {
      requireDirector(req);
      const status = await BackupsService.getStatus();
      res.json(status);
    } catch (e) { next(e); }
  }

  static async createNow(req: Request, res: Response, next: NextFunction) {
    try {
      requireDirector(req);
      const result = await BackupsService.createNow(req.user!.sub);
      res.json(result);
    } catch (e) { next(e); }
  }

  static async prepareRestore(req: Request, res: Response, next: NextFunction) {
    try {
      requireDirector(req);
      const { password, fileName } = req.body || {};
      if (!fileName) throw new AppError("fileName обязателен", 400);
      const result = await BackupsService.prepareRestore(req.user!.sub, password, fileName);
      res.json(result);
    } catch (e) { next(e); }
  }
  static async getStorageSettings(req: Request, res: Response, next: NextFunction) {
    try {
      requireDirector(req);
      const data = await BackupsService.getStorageSettings();
      res.json(data);
    } catch (e) { next(e); }
  }

  static async updateBackupDir(req: Request, res: Response, next: NextFunction) {
    try {
      requireDirector(req);
      const { backupDir } = req.body || {};
      const result = await BackupsService.updateBackupDir(backupDir);
      res.json(result);
    } catch (e) { next(e); }
  }

  static async addS3Target(req: Request, res: Response, next: NextFunction) {
    try {
      requireDirector(req);
      const result = await S3Service.addTarget(req.body || {});
      res.json(result);
    } catch (e) { next(e); }
  }

  static async updateS3Target(req: Request, res: Response, next: NextFunction) {
    try {
      requireDirector(req);
      const result = await S3Service.updateTarget(req.params.id!, req.body || {});
      res.json(result);
    } catch (e) { next(e); }
  }

  static async deleteS3Target(req: Request, res: Response, next: NextFunction) {
    try {
      requireDirector(req);
      const result = await S3Service.deleteTarget(req.params.id!);
      res.json(result);
    } catch (e) { next(e); }
  }

  static async testS3Uncommitted(req: Request, res: Response, next: NextFunction) {
    try {
      requireDirector(req);
      const result = await S3Service.testUncommitted(req.body || {});
      res.json(result);
    } catch (e) { next(e); }
  }

  static async testS3Saved(req: Request, res: Response, next: NextFunction) {
    try {
      requireDirector(req);
      const result = await S3Service.testSaved(req.params.id!);
      res.json(result);
    } catch (e) { next(e); }
  }
  static async browseDir(req: Request, res: Response, next: NextFunction) {
    try {
      requireDirector(req);
      const dirPath = typeof req.query.path === "string" ? req.query.path : null;
      const result = await BackupsService.browseDir(dirPath);
      res.json(result);
    } catch (e) { next(e); }
  }
}
