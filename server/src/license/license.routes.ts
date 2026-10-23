import { Router } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { LicenseController } from "./license.controller";

const router = Router();
router.get("/status", requireAuth, LicenseController.getStatus);
router.post("/upload", requireAuth, LicenseController.upload);

export default router;
