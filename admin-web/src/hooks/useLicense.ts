import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchLicense, uploadLicense } from "../api/license";

export function useLicense() {
  return useQuery({
    queryKey: ["license"],
    queryFn: fetchLicense,
    staleTime: 60_000,
  });
}

export function useUploadLicense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (key: string) => uploadLicense(key),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["license"] }),
  });
}
