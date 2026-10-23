import { api } from "./client";

export type NotificationSetting = {
  eventType: string;
  label: string;
  isEnabled: boolean;
};

export async function fetchNotificationSettings(): Promise<NotificationSetting[]> {
  const { data } = await api.get<{ settings: NotificationSetting[] }>("/settings/notifications");
  return data.settings;
}

export async function updateNotificationSettings(
  settings: { eventType: string; isEnabled: boolean }[],
): Promise<void> {
  await api.put("/settings/notifications", { settings });
}
