import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  approveHandover,
  fetchPendingApproval,
  rejectHandover,
} from "../api/handover";

export function usePendingApproval() {
  const query = useQuery({
    queryKey: ["handover", "pending-approval"],
    queryFn: fetchPendingApproval,
    refetchInterval: 60_000,
  });
  const items = query.data ?? [];
  return {
    ...query,
    items,
    count: items.length,
  };
}

export function useApproveHandover() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => approveHandover(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["handover"] });
      qc.invalidateQueries({ queryKey: ["orders"] });
    },
  });
}

export function useRejectHandover() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, rejectComment }: { id: string; rejectComment: string | null }) =>
      rejectHandover(id, rejectComment),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["handover"] });
      qc.invalidateQueries({ queryKey: ["orders"] });
    },
  });
}
