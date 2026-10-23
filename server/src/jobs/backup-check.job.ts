import cron from "node-cron";
import { prisma } from "../db/prisma";
import { NotificationService } from "../modules/push/notification.service";

const ALERT_THRESHOLD_HOURS = 25;
const ALERT_COOLDOWN_HOURS = 12;
let lastAlertAt: Date | null = null;

export async function runBackupCheckNow() {
  const cutoff = new Date(Date.now() - ALERT_THRESHOLD_HOURS * 60 * 60 * 1000);
  const recent = await prisma.backupLog.findFirst({
    where: { status: "success", createdAt: { gte: cutoff } },
    orderBy: { createdAt: "desc" },
  });

  if (recent) {
    console.log("[backup-check] OK, last backup:", recent.createdAt.toISOString());
    return { ok: true, lastBackupAt: recent.createdAt };
  }

  // No recent backup — check cooldown
  if (lastAlertAt && Date.now() - lastAlertAt.getTime() < ALERT_COOLDOWN_HOURS * 60 * 60 * 1000) {
    console.log("[backup-check] No recent backup, but alert cooldown active");
    return { ok: false, skipped: true };
  }

  // Find directors
  const directors = await prisma.user.findMany({
    where: { role: "director", status: "active" },
    select: { id: true },
  });

  if (directors.length === 0) {
    console.log("[backup-check] No directors to notify");
    return { ok: false, noRecipients: true };
  }

  const lastAny = await prisma.backupLog.findFirst({
    where: { status: "success" },
    orderBy: { createdAt: "desc" },
  });
  const lastDate = lastAny
    ? lastAny.createdAt.toLocaleString("ru-RU", { dateStyle: "short", timeStyle: "short" })
    : null;

  await NotificationService.notifyBackupMissing(directors.map((d) => d.id), lastDate);
  lastAlertAt = new Date();
  console.log("[backup-check] Alert sent to", directors.length, "director(s)");
  return { ok: false, alerted: true, recipients: directors.length };
}

export function startBackupCheckJob() {
  // Каждый час в 04:00, 05:00, ... (по факту: 0 минут каждого часа)
  cron.schedule("0 * * * *", () => {
    runBackupCheckNow().catch((e) => console.error("[backup-check] failed:", e));
  });
  console.log("[backup-check] job scheduled (every hour)");
}
