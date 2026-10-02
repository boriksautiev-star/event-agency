import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchMatrix,
  saveMatrix,
  SaveMatrixInput,
} from "../api/rates";

export function useMatrix(animatorId: string | undefined) {
  return useQuery({
    queryKey: ["rate-matrix", animatorId],
    queryFn: () => fetchMatrix(animatorId!),
    enabled: !!animatorId,
    staleTime: 30_000,
  });
}

export function useSaveMatrix() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SaveMatrixInput) => saveMatrix(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rate-matrix"] });
    },
  });
}
