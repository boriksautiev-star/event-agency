import { Router } from "express";
import { requireAuth } from "../../middlewares/requireAuth";
import { BackupsController } from "./backups.controller";

const router = Router();
router.get("/", requireAuth, BackupsController.list);
router.get("/status", requireAuth, BackupsController.status);
router.post("/create", requireAuth, BackupsController.createNow);
router.post("/prepare-restore", requireAuth, BackupsController.prepareRestore);

// Storage settings
router.get("/storage-settings", requireAuth, BackupsController.getStorageSettings);
router.patch("/storage-settings", requireAuth, BackupsController.updateBackupDir);

// S3 targets
router.post("/s3-targets", requireAuth, BackupsController.addS3Target);
router.patch("/s3-targets/:id", requireAuth, BackupsController.updateS3Target);
router.delete("/s3-targets/:id", requireAuth, BackupsController.deleteS3Target);
router.post("/s3-targets/test", requireAuth, BackupsController.testS3Uncommitted);
router.post("/s3-targets/:id/test", requireAuth, BackupsController.testS3Saved);

router.get("/browse-dir", requireAuth, BackupsController.browseDir);

export default router;
