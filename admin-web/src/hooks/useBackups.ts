import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchBackupStatus, fetchBackups, createBackup, prepareRestore, fetchStorageSettings, updateBackupDir, addS3Target, updateS3Target, deleteS3Target, testS3Uncommitted, testS3Saved , browseDir } from "../api/backups";

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

export function useStorageSettings() {
  return useQuery({ queryKey: ["storage-settings"], queryFn: fetchStorageSettings, staleTime: 30_000 });
}

export function useUpdateBackupDir() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (backupDir: string) => updateBackupDir(backupDir),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["storage-settings"] });
      qc.invalidateQueries({ queryKey: ["backup-status"] });
    },
  });
}

export function useAddS3Target() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: any) => addS3Target(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["storage-settings"] }),
  });
}

export function useUpdateS3Target() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: any }) => updateS3Target(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["storage-settings"] }),
  });
}

export function useDeleteS3Target() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteS3Target(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["storage-settings"] }),
  });
}

export function useTestS3Uncommitted() {
  return useMutation({ mutationFn: (input: any) => testS3Uncommitted(input) });
}

export function useTestS3Saved() {
  return useMutation({ mutationFn: (id: string) => testS3Saved(id) });
}

export function useBrowseDir(path: string | null) {
  return useQuery({
    queryKey: ["browse-dir", path],
    queryFn: () => browseDir(path),
    staleTime: 5_000,
  });
}
