import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchRateGroups,
  createRateGroup,
  updateRateGroup,
  deleteRateGroup,
  RateGroupInput,
} from "../api/rate-groups";

export function useRateGroups(includeInactive = false) {
  return useQuery({
    queryKey: ["rate-groups", { includeInactive }],
    queryFn: () => fetchRateGroups(includeInactive),
    staleTime: 60_000,
  });
}

export function useCreateRateGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: RateGroupInput) => createRateGroup(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rate-groups"] }),
  });
}

export function useUpdateRateGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; input: Partial<RateGroupInput> }) =>
      updateRateGroup(vars.id, vars.input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rate-groups"] }),
  });
}

export function useDeleteRateGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteRateGroup(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rate-groups"] }),
  });
}
