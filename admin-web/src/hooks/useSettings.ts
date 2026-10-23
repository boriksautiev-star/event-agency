import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchSettings,
  updateSettings,
  SettingsInput,
} from "../api/settings";

export function useSettings(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["settings"],
    queryFn: fetchSettings,
    staleTime: 60_000,
    enabled: options?.enabled ?? true,
  });
}

export function useUpdateSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SettingsInput) => updateSettings(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["settings"] }),
  });
}
