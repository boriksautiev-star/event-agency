import { api } from "./client";

export type BackupStatus = {
  lastSuccessAt: string | null;
  lastSuccessFile: string | null;
  lastSuccessSize: number | null;
  lastFailAt: string | null;
  lastFailError: string | null;
  ageHours: number | null;
  isStale: boolean;
  thresholdHours: number;
  backupDir: string;
};

export type BackupItem = {
  id: string;
  fileName: string;
  filePath: string;
  sizeBytes: number;
  status: string;
  triggeredBy: string;
  createdAt: string;
  fileExists: boolean;
};

export async function fetchBackupStatus(): Promise<BackupStatus> {
  const { data } = await api.get<BackupStatus>("/backups/status");
  return data;
}

export async function fetchBackups(): Promise<BackupItem[]> {
  const { data } = await api.get<{ items: BackupItem[] }>("/backups");
  return data.items;
}

export async function createBackup(): Promise<{ ok: boolean }> {
  const { data } = await api.post("/backups/create");
  return data;
}

export async function prepareRestore(password: string, fileName: string): Promise<{ ok: boolean; command: string; message: string }> {
  const { data } = await api.post("/backups/prepare-restore", { password, fileName });
  return data;
}
