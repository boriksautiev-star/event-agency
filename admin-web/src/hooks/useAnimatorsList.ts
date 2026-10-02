import { useQuery } from "@tanstack/react-query";
import { fetchAnimators } from "../api/users";

export function useAnimatorsList() {
  return useQuery({
    queryKey: ["animators-list"],
    queryFn: () => fetchAnimators(),
    staleTime: 60_000,
  });
}
