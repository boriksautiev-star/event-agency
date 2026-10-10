import { Expo, ExpoPushMessage, ExpoPushTicket } from "expo-server-sdk";
import { prisma } from "../../db/prisma";

const expo = new Expo();

type PushPayload = {
  userIds: string[];
  title: string;
  body: string;
  data?: Record<string, any>;
};

export class PushService {
  static async send({ userIds, title, body, data }: PushPayload) {
    if (userIds.length === 0) return { sent: 0 };

    const users = await prisma.user.findMany({
      where: { id: { in: userIds }, status: "active" },
      select: { id: true, expoPushToken: true },
    });

    const messages: ExpoPushMessage[] = [];
    const invalidUserIds: string[] = [];

    for (const u of users) {
      const token = u.expoPushToken;
      if (!token) continue;

      if (!Expo.isExpoPushToken(token)) {
        console.warn("[push] Invalid token for user " + u.id);
        invalidUserIds.push(u.id);
        continue;
      }

      messages.push({
        to: token,
        sound: "default",
        title,
        body,
        data: data ?? {},
      });
    }

    if (invalidUserIds.length > 0) {
      await prisma.user.updateMany({
        where: { id: { in: invalidUserIds } },
        data: { expoPushToken: null },
      });
    }

    if (messages.length === 0) return { sent: 0 };

    console.log(`[push] Sending to ${messages.length} device(s): ${title} — ${body}`);

    const chunks = expo.chunkPushNotifications(messages);
    let sent = 0;

    for (const chunk of chunks) {
      try {
        const tickets: ExpoPushTicket[] = await expo.sendPushNotificationsAsync(chunk);
        for (const t of tickets) {
          if (t.status === "ok") sent++;
          else console.warn("[push] Ticket error:", t);
        }
      } catch (e) {
        console.error("[push] Chunk send failed:", e);
      }
    }

    console.log(`[push] Sent: ${sent}/${messages.length}`);
    return { sent };
  }

  static async notifyAnimatorAssigned(animatorId: string, orderTitle: string, orderId: string) {
    return this.send({
      userIds: [animatorId],
      title: "Новый заказ",
      body: `Вам назначен заказ: ${orderTitle}`,
      data: { orderId, type: "order_assigned" },
    });
  }

  static async notifyOrderReminder(
    animatorId: string,
    orderTitle: string,
    orderId: string,
    startTime: string,
    endTime: string,
  ) {
    return this.send({
      userIds: [animatorId],
      title: "Напоминание: заказ завтра",
      body: `${orderTitle} · ${startTime}–${endTime}`,
      data: { orderId, type: "order_reminder" },
    });
  }
  static async notifyOrderChanged(animatorIds: string[], orderTitle: string, orderId: string, summary: string) {
    return this.send({
      userIds: animatorIds,
      title: "Изменение в заказе",
      body: `${orderTitle}: ${summary}`,
      data: { orderId, type: "order_changed" },
    });
  }

  static async notifyAdminsAboutResponse(
    adminIds: string[],
    animatorName: string,
    orderTitle: string,
    orderId: string,
    status: "accepted" | "declined",
  ) {
    const verb = status === "accepted" ? "принял(а)" : "отклонил(а)";
    return this.send({
      userIds: adminIds,
      title: "Ответ аниматора",
      body: `${animatorName} ${verb} заказ: ${orderTitle}`,
      data: { orderId, type: "assignment_response" },
    });
  }

  // ===== Handover (передача заказа) =====

  static async notifyHandoverIncoming(
    toAnimatorId: string,
    fromName: string,
    orderTitle: string,
    requestId: string,
    orderId: string,
  ) {
    return this.send({
      userIds: [toAnimatorId],
      title: "Запрос на передачу заказа",
      body: `${fromName} передаёт вам: ${orderTitle}`,
      data: { requestId, orderId, type: "handover_incoming" },
    });
  }

  static async notifyHandoverReminder(
    fromAnimatorId: string,
    toName: string,
    orderTitle: string,
    requestId: string,
    orderId: string,
  ) {
    return this.send({
      userIds: [fromAnimatorId],
      title: "Напоминание о передаче",
      body: `${toName} ещё не подтвердил(а) передачу: ${orderTitle}`,
      data: { requestId, orderId, type: "handover_reminder" },
    });
  }

  static async notifyHandoverAccepted(
    fromAnimatorId: string,
    toName: string,
    orderTitle: string,
    requestId: string,
    orderId: string,
  ) {
    const admins = await prisma.user.findMany({
      where: { role: { in: ["director", "admin"] }, status: "active" },
      select: { id: true },
    });
    const adminIds = admins.map((u) => u.id);

    await this.send({
      userIds: [fromAnimatorId],
      title: "Передача: согласие получено",
      body: `${toName} согласился(ась). Ждём подтверждения руководителя: ${orderTitle}`,
      data: { requestId, orderId, type: "handover_accepted_to_from" },
    });

    if (adminIds.length > 0) {
      await this.send({
        userIds: adminIds,
        title: "Передача ждёт подтверждения",
        body: `${toName} принял(а) передачу заказа: ${orderTitle}`,
        data: { requestId, orderId, type: "handover_pending_approval" },
      });
    }
  }

  static async notifyHandoverDeclined(
    fromAnimatorId: string,
    toName: string,
    orderTitle: string,
    requestId: string,
    orderId: string,
    comment?: string | null,
  ) {
    return this.send({
      userIds: [fromAnimatorId],
      title: "Передача отклонена",
      body: comment
        ? `${toName} отказался(ась): ${comment}`
        : `${toName} отказался(ась) принять заказ: ${orderTitle}`,
      data: { requestId, orderId, type: "handover_declined" },
    });
  }

  static async notifyHandoverApproved(
    fromAnimatorId: string,
    toAnimatorId: string,
    orderTitle: string,
    requestId: string,
    orderId: string,
  ) {
    await this.send({
      userIds: [fromAnimatorId],
      title: "Передача подтверждена",
      body: `Заказ передан: ${orderTitle}. Вы больше не назначены.`,
      data: { requestId, orderId, type: "handover_approved_from" },
    });
    return this.send({
      userIds: [toAnimatorId],
      title: "Заказ передан вам",
      body: `Подтвердите новый заказ: ${orderTitle}`,
      data: { requestId, orderId, type: "handover_approved_to" },
    });
  }

  static async notifyHandoverRejected(
    fromAnimatorId: string,
    toAnimatorId: string,
    orderTitle: string,
    requestId: string,
    orderId: string,
    comment?: string | null,
  ) {
    const admins = await prisma.user.findMany({
      where: { role: { in: ["director", "admin"] }, status: "active" },
      select: { id: true },
    });
    const adminIds = admins.map((u) => u.id);
    const userIds = [fromAnimatorId, toAnimatorId, ...adminIds];
    return this.send({
      userIds,
      title: "Передача отклонена руководителем",
      body: comment
        ? `${orderTitle}: ${comment}`
        : `Передача заказа отклонена: ${orderTitle}`,
      data: { requestId, orderId, type: "handover_rejected" },
    });
  }

  static async notifyHandoverCancelled(
    toAnimatorId: string,
    fromName: string,
    orderTitle: string,
    requestId: string,
    orderId: string,
  ) {
    return this.send({
      userIds: [toAnimatorId],
      title: "Заявка отозвана",
      body: `${fromName} отозвал(а) передачу: ${orderTitle}`,
      data: { requestId, orderId, type: "handover_cancelled" },
    });
  }
}