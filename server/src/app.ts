import express from "express";
import cors from "cors";
import { errorHandler } from "./middlewares/errorHandler";
import { notFound } from "./middlewares/notFound";
import healthRoutes from "./modules/health/health.routes";
import setupRoutes from "./modules/setup/setup.routes";
import authRoutes from "./modules/auth/auth.routes";
import usersRoutes from "./modules/users/users.routes";
import clientsRoutes from "./modules/clients/clients.routes";
import ordersRoutes from "./modules/orders/orders.routes";

import animatorsRoutes from "./modules/animators/animators.routes";
import financeRoutes from "./modules/finance/finance.routes";
import pushRoutes from "./modules/push/push.routes";
import rateGroupsRoutes from "./modules/rate-groups/rate-groups.routes";
import charactersRoutes from "./modules/characters/characters.routes";
import ratesRoutes from "./modules/rates/rates.routes";
import settingsRoutes from "./modules/settings/settings.routes";
import adminPayrollRoutes from "./modules/admin-payroll/admin-payroll.routes";
import handoverRoutes from "./modules/handover/handover.routes";

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: "1mb" }));

  app.get("/", (_req, res) => {
    res.json({ name: "Event Agency API", version: "0.0.1" });
  });

  app.use("/api/health", healthRoutes);
  app.use("/api/setup", setupRoutes);
  app.use("/api/auth", authRoutes);
  app.use("/api/users", usersRoutes);
  app.use("/api/clients", clientsRoutes);
  app.use("/api/orders", ordersRoutes);
  app.use("/api/animators", animatorsRoutes);
  app.use("/api/push", pushRoutes);
  app.use("/api/finance", financeRoutes);

  app.use("/api/rate-groups", rateGroupsRoutes);
  app.use("/api/characters", charactersRoutes);
  app.use("/api/rates", ratesRoutes);
  app.use("/api/settings", settingsRoutes);
  app.use("/api/admin-payroll", adminPayrollRoutes);
  app.use("/api/handover", handoverRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}