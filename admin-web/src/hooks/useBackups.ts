import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchBackupStatus, fetchBackups, createBackup, prepareRestore } from "../api/backups";

export function useBackupStatus() {
  return useQuery({
    queryKey: ["backup-status"],
    queryFn: fetchBackupStatus,
    staleTime: 60_000,
  });
}

export function useBackups() {
  return useQuery({
    queryKey: ["backups"],
    queryFn: fetchBackups,
    staleTime: 30_000,
  });
}

export function useCreateBackup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createBackup,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["backup-status"] });
      qc.invalidateQueries({ queryKey: ["backups"] });
    },
  });
}

export function usePrepareRestore() {
  return useMutation({
    mutationFn: ({ password, fileName }: { password: string; fileName: string }) =>
      prepareRestore(password, fileName),
  });
}
