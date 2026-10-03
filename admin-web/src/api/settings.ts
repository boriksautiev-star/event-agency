import { api } from "./client";

export type AgencySettings = {
  id: number;
  name: string;
  legalName: string | null;
  inn: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  website: string | null;
  timezone: string;
  currency: string;
  paymentDetails: string | null;
  logoUrl: string | null;
  defaultPrepaymentPercent: number;
  updatedAt: string;
};

export type SettingsInput = Partial<{
  name: string;
  legalName: string | null;
  inn: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  website: string | null;
  timezone: string;
  currency: string;
  paymentDetails: string | null;
  logoUrl: string | null;
  defaultPrepaymentPercent: number;
}>;

export async function fetchSettings(): Promise<AgencySettings> {
  const { data } = await api.get<AgencySettings>("/settings");
  return data;
}

export async function updateSettings(
  input: SettingsInput,
): Promise<AgencySettings> {
  const { data } = await api.patch<AgencySettings>("/settings", input);
  return data;
}
