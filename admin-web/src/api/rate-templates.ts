import { api } from "./client";

export type RateTemplateListItem = {
  id: string;
  name: string;
  notes: string | null;
  isActive: boolean;
  animatorsCount: number;
  ratesCount: number;
  createdAt: string;
  updatedAt: string;
};

export type TemplateCell = {
  rateGroupId: string;
  durationMin: number;
  amount: number;
};

export type RateTemplateDetail = {
  id: string;
  name: string;
  notes: string | null;
  isActive: boolean;
  cells: TemplateCell[];
  animators: { id: string; firstName: string; lastName: string; phone: string }[];
  createdAt: string;
  updatedAt: string;
};

export type SaveTemplateCell = {
  rateGroupId: string;
  durationMin: number;
  amount: number | null;
};

export type SaveResult = { ok: boolean; affectedAssignments: number };

export async function fetchTemplates(): Promise<RateTemplateListItem[]> {
  const { data } = await api.get<{ items: RateTemplateListItem[] }>("/rates/templates");
  return data.items ?? [];
}

export async function fetchTemplateById(id: string): Promise<RateTemplateDetail> {
  const { data } = await api.get<RateTemplateDetail>(`/rates/templates/${id}`);
  return data;
}

export async function createTemplate(input: {
  name: string;
  notes?: string | null;
  copyFromTemplateId?: string | null;
}): Promise<{ id: string; name: string }> {
  const { data } = await api.post<{ id: string; name: string }>("/rates/templates", input);
  return data;
}

export async function updateTemplate(
  id: string,
  patch: { name?: string; notes?: string | null; isActive?: boolean },
): Promise<{ id: string; name: string; isActive: boolean }> {
  const { data } = await api.patch(`/rates/templates/${id}`, patch);
  return data;
}

export async function deleteTemplate(id: string): Promise<{ ok: boolean }> {
  const { data } = await api.delete<{ ok: boolean }>(`/rates/templates/${id}`);
  return data;
}

export async function saveTemplateRates(
  id: string,
  cells: SaveTemplateCell[],
): Promise<SaveResult> {
  const { data } = await api.put<SaveResult>(`/rates/templates/${id}/rates`, { cells });
  return data;
}

export async function assignTemplate(
  animatorId: string,
  templateId: string | null,
): Promise<SaveResult> {
  const { data } = await api.post<SaveResult>("/rates/templates/assign", {
    animatorId,
    templateId,
  });
  return data;
}

export type OverrideCell = {
  characterId: string;
  durationMin: number;
  amount: number;
};

export type OverridesResponse = {
  animatorId: string;
  templateId: string | null;
  cells: OverrideCell[];
};

export async function fetchOverrides(animatorId: string): Promise<OverridesResponse> {
  const { data } = await api.get<OverridesResponse>(
    `/rates/overrides?animatorId=${animatorId}`,
  );
  return data;
}

export async function saveOverrides(
  animatorId: string,
  cells: OverrideCell[],
): Promise<SaveResult> {
  const { data } = await api.put<SaveResult>("/rates/overrides", { animatorId, cells });
  return data;
}
