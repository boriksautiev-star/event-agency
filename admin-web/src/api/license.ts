import { api } from "./client";

export type LicenseStatus = "active" | "expiring" | "grace" | "expired" | "invalid" | "none";

export type LicenseInfo = {
  status: LicenseStatus;
  agencyName: string | null;
  expiresAt: string | null;
  daysLeft: number | null;
  reason: string | null;
};

export async function fetchLicense(): Promise<LicenseInfo> {
  const { data } = await api.get<LicenseInfo>("/license/status");
  return data;
}

export async function uploadLicense(key: string): Promise<void> {
  await api.post("/license/upload", { key });
}
