import { api } from "./client";
import type { RateGroup } from "./types";

export type RateGroupInput = {
  name: string;
  sortOrder?: number;
  isActive?: boolean;
};

export async function fetchRateGroups(includeInactive = false): Promise<RateGroup[]> {
  const suffix = includeInactive ? "?includeInactive=true" : "";
  const { data } = await api.get<{ items: RateGroup[] } | RateGroup[]>(`/rate-groups${suffix}`);
  return Array.isArray(data) ? data : data.items;
}

export async function createRateGroup(input: RateGroupInput): Promise<RateGroup> {
  const { data } = await api.post<{ rateGroup?: RateGroup; item?: RateGroup } | RateGroup>(
    "/rate-groups",
    input,
  );
  return ((data as any).rateGroup ?? (data as any).item ?? data) as RateGroup;
}

export async function updateRateGroup(
  id: string,
  input: Partial<RateGroupInput>,
): Promise<RateGroup> {
  const { data } = await api.patch<{ rateGroup?: RateGroup; item?: RateGroup } | RateGroup>(
    `/rate-groups/${id}`,
    input,
  );
  return ((data as any).rateGroup ?? (data as any).item ?? data) as RateGroup;
}

export async function deleteRateGroup(id: string): Promise<void> {
  await api.delete(`/rate-groups/${id}`);
}
