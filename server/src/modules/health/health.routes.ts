import { Router } from "express";
import { prisma } from "../../db/prisma";

const router = Router();

router.get("/", async (_req, res, next) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ok", db: "ok", time: new Date().toISOString() });
  } catch (e) {
    next(e);
  }
});

export default router;
