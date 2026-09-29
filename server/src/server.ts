import { createApp } from "./app";
import { env } from "./config/env";
import { prisma } from "./db/prisma";
import { startRemindersJob } from "./jobs/reminders.job";

async function main() {
  const app = createApp();

  const server = app.listen(env.port, () => {
    console.log(`[server] listening on http://localhost:${env.port}`);
    console.log(`[server] env: ${env.nodeEnv}`);
    startRemindersJob();
  });

  const shutdown = async (signal: string) => {
    console.log(`[server] ${signal} received, shutting down...`);
    server.close(async () => {
      await prisma.$disconnect();
      process.exit(0);
    });
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

main().catch((e) => {
  console.error("[server] fatal", e);
  process.exit(1);
});
