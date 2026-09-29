import { Router } from "express";
import { SetupController } from "./setup.controller";

const router = Router();

router.get("/status", SetupController.status);
router.post("/", SetupController.setup);

export default router;
