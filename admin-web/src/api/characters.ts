import { api } from "./client";
import type { Character } from "./types";

export async function fetchCharacters(params?: {
  activeOnly?: boolean;
  rateGroupId?: string;
  search?: string;
}): Promise<Character[]> {
  const q = new URLSearchParams();
  if (params?.activeOnly) q.set("activeOnly", "true");
  if (params?.rateGroupId) q.set("rateGroupId", params.rateGroupId);
  if (params?.search) q.set("search", params.search);
  const suffix = q.toString() ? `?${q.toString()}` : "";
  const { data } = await api.get<{ items: Character[] }>(`/characters${suffix}`);
  return data.items;
}

export async function fetchCharacterById(id: string): Promise<Character> {
  const { data } = await api.get<any>(`/characters/${id}`);
  return (data.character ?? data) as Character;
}
