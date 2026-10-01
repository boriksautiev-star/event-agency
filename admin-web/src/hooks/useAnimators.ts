import { useQuery } from "@tanstack/react-query";
import { fetchAvailability } from "../api/animators";

export function useAvailability(date: string | undefined) {
  return useQuery({
    queryKey: ["availability", date],
    queryFn: () => fetchAvailability(date!),
    enabled: !!date && /^\d{4}-\d{2}-\d{2}$/.test(date),
  });
}
