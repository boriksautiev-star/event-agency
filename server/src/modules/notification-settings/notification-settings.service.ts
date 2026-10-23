import { prisma } from "../../db/prisma";
import { NOTIFICATION_EVENTS, NOTIFICATION_EVENT_LABELS } from "@event-agency/shared";

export class NotificationSettingsService {
  static async getMySettings(userId: string) {
    const settings = await prisma.notificationSetting.findMany({ where: { userId } });
    const settingsMap = new Map(settings.map((s) => [s.eventType, s.isEnabled]));

    return Object.values(NOTIFICATION_EVENTS).map((eventType) => ({
      eventType,
      label: NOTIFICATION_EVENT_LABELS[eventType] || eventType,
      isEnabled: settingsMap.has(eventType) ? settingsMap.get(eventType) : true,
    }));
  }

  static async updateMySettings(userId: string, updates: { eventType: string; isEnabled: boolean }[]) {
    return prisma.$transaction(
      updates.map((update) =>
        prisma.notificationSetting.upsert({
          where: { userId_eventType: { userId, eventType: update.eventType } },
          create: { userId, eventType: update.eventType, isEnabled: update.isEnabled },
          update: { isEnabled: update.isEnabled },
        })
      )
    );
  }
}