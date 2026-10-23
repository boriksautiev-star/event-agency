import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchNotificationSettings, updateNotificationSettings } from "../api/notificationSettings";

export function useNotificationSettings() {
  return useQuery({
    queryKey: ["notification-settings"],
    queryFn: fetchNotificationSettings,
    staleTime: 60_000,
  });
}

export function useUpdateNotificationSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (settings: { eventType: string; isEnabled: boolean }[]) =>
      updateNotificationSettings(settings),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notification-settings"] }),
  });
}
