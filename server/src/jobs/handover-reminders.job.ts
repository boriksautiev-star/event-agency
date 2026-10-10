import cron from "node-cron";
import { prisma } from "../db/prisma";
import { PushService } from "../modules/push/push.service";

async function sendHandoverReminders() {
  const pending = await prisma.handoverRequest.findMany({
    where: { status: "pending_receiver" },
    include: {
      order: { select: { id: true, title: true } },
      fromAnimator: { select: { id: true, firstName: true, lastName: true } },
      toAnimator: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  if (pending.length === 0) return;

  console.log(`[handover-reminders] Running for ${pending.length} request(s)`);

  let sent = 0;
  for (const r of pending) {
    const toName = `${r.toAnimator.firstName} ${r.toAnimator.lastName}`.trim();
    try {
      await PushService.notifyHandoverReminder(
        r.fromAnimatorId,
        toName,
        r.order.title,
        r.id,
        r.orderId,
      );
      sent++;
    } catch (e) {
      console.warn("[handover-reminders] push failed for " + r.fromAnimatorId + ":", e);
    }
  }
  console.log(`[handover-reminders] Sent ${sent} reminder(s)`);
}

export function startHandoverRemindersJob() {
  // Каждые 30 минут
  cron.schedule("*/30 * * * *", () => {
    void sendHandoverReminders().catch((e) =>
      console.error("[handover-reminders] error:", e),
    );
  });
  console.log("[handover-reminders] job scheduled (every 30 min)");
}

export async function runHandoverRemindersNow() {
  await sendHandoverReminders();
}
