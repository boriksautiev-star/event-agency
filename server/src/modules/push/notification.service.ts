import { prisma } from "../../db/prisma";
import { PushService } from "./push.service";

export class NotificationService {
  static async send(
    eventType: string,
    userIds: string[],
    title: string,
    body: string,
    data?: Record<string, any>,
  ) {
    if (userIds.length === 0) return;
    const disabledSettings = await prisma.notificationSetting.findMany({
      where: { userId: { in: userIds }, eventType, isEnabled: false },
      select: { userId: true },
    });
    const disabledIds = new Set(disabledSettings.map((s) => s.userId));
    const allowedUserIds = userIds.filter((id) => !disabledIds.has(id));
    if (allowedUserIds.length === 0) {
      console.log(`[notify] Event '${eventType}' skipped — all users disabled it.`);
      return;
    }
    return PushService.send({ userIds: allowedUserIds, title, body, data });
  }

  static async notifyOrderCompletedByAnimator(
    recipientIds: string[], animatorName: string, orderTitle: string, orderId: string,
  ) {
    return this.send(
      "order_completed_by_animator", recipientIds,
      "Аниматор завершил работу",
      `${animatorName} отметил(а) выполнение: ${orderTitle}`,
      { orderId, type: "order_completed_by_animator" },
    );
  }
}