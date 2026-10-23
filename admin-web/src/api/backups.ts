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

export type S3TargetMasked = {
  id: string;
  name: string;
  enabled: boolean;
  endpoint: string;
  region: string;
  bucket: string;
  accessKey: string;
  secretKeyMasked: string;
  pathPrefix: string;
  retentionDays: number;
};

export type StorageSettings = {
  backupDir: string;
  s3Targets: S3TargetMasked[];
};

export type BrowseDirResult = {
  currentPath: string | null;
  parent: string | null;
  roots: { name: string; path: string }[];
  items: { name: string; path: string }[];
};

export async function browseDir(path: string | null): Promise<BrowseDirResult> {
  const q = path ? `?path=${encodeURIComponent(path)}` : "";
  const { data } = await api.get<BrowseDirResult>(`/backups/browse-dir${q}`);
  return data;
}

export async function fetchStorageSettings(): Promise<StorageSettings> {
  const { data } = await api.get<StorageSettings>("/backups/storage-settings");
  return data;
}

export async function updateBackupDir(backupDir: string): Promise<{ ok: boolean; backupDir: string }> {
  const { data } = await api.patch("/backups/storage-settings", { backupDir });
  return data;
}

export async function addS3Target(input: any): Promise<{ id: string }> {
  const { data } = await api.post("/backups/s3-targets", input);
  return data;
}

export async function updateS3Target(id: string, input: any): Promise<{ ok: boolean }> {
  const { data } = await api.patch(`/backups/s3-targets/${id}`, input);
  return data;
}

export async function deleteS3Target(id: string): Promise<{ ok: boolean }> {
  const { data } = await api.delete(`/backups/s3-targets/${id}`);
  return data;
}

export async function testS3Uncommitted(input: any): Promise<{ ok: boolean; error?: string }> {
  const { data } = await api.post("/backups/s3-targets/test", input);
  return data;
}

export async function testS3Saved(id: string): Promise<{ ok: boolean; error?: string }> {
  const { data } = await api.post(`/backups/s3-targets/${id}/test`);
  return data;
}

export async function prepareRestore(password: string, fileName: string): Promise<{ ok: boolean; command: string; message: string }> {
  const { data } = await api.post("/backups/prepare-restore", { password, fileName });
  return data;
}
