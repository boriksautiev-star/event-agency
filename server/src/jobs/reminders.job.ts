import cron from "node-cron";
import { prisma } from "../db/prisma";
import { PushService } from "../modules/push/push.service";

function localDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

async function sendReminders() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayStr = localDateStr(tomorrow);
  const dayStart = new Date(dayStr + "T00:00:00.000Z");
  const dayEnd = new Date(dayStr + "T23:59:59.999Z");

  console.log(`[reminders] Running for ${dayStr}`);

  const orders = await prisma.order.findMany({
    where: {
      eventDate: { gte: dayStart, lte: dayEnd },
      status: { notIn: ["cancelled", "completed"] },
    },
    include: {
      animators: {
        where: { status: "accepted" },
        select: { animatorId: true },
      },
    },
  });

  let sent = 0;
  for (const o of orders) {
    for (const a of o.animators) {
      try {
        await PushService.notifyOrderReminder(
          a.animatorId,
          o.title,
          o.id,
          o.startTime,
          o.endTime,
        );
        sent++;
      } catch (e) {
        console.warn("[reminders] push failed for " + a.animatorId + ":", e);
      }
    }
  }

  console.log(`[reminders] Sent ${sent} reminder(s) for ${dayStr}`);
}

export function startRemindersJob() {
  // Два раза в день по локальному времени: 10:00 и 20:00
  cron.schedule("0 10 * * *", () => {
    void sendReminders().catch((e) => console.error("[reminders] error:", e));
  });
  cron.schedule("0 20 * * *", () => {
    void sendReminders().catch((e) => console.error("[reminders] error:", e));
  });
  console.log("[reminders] job scheduled (10:00 and 20:00)");
}

export async function runRemindersNow() {
  await sendReminders();
}
