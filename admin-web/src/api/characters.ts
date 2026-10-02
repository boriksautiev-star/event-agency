import { api } from "./client";
import type { Character, CharacterPriceOption } from "./types";

export type CharacterPriceInput = {
  durationMin: number;
  price: number;
};

export type CharacterInput = {
  name: string;
  rateGroupId: string;
  notes?: string | null;
  isActive?: boolean;
};

export async function fetchCharacters(params?: {
  activeOnly?: boolean;
  includeInactive?: boolean;
  rateGroupId?: string;
  search?: string;
}): Promise<Character[]> {
  const q = new URLSearchParams();
  if (params?.activeOnly) q.set("activeOnly", "true");
  if (params?.includeInactive) q.set("includeInactive", "true");
  if (params?.rateGroupId) q.set("rateGroupId", params.rateGroupId);
  if (params?.search) q.set("search", params.search);
  const suffix = q.toString() ? `?${q.toString()}` : "";
  const { data } = await api.get<{ items: Character[] } | Character[]>(`/characters${suffix}`);
  return Array.isArray(data) ? data : data.items;
}

export async function fetchCharacterById(id: string): Promise<Character> {
  const { data } = await api.get<any>(`/characters/${id}`);
  return (data.character ?? data) as Character;
}

export async function createCharacter(
  input: CharacterInput & { prices: CharacterPriceInput[] },
): Promise<Character> {
  const { data } = await api.post<any>("/characters", input);
  return (data.character ?? data) as Character;
}

export async function updateCharacter(
  id: string,
  input: Partial<CharacterInput>,
): Promise<Character> {
  const { data } = await api.patch<any>(`/characters/${id}`, input);
  return (data.character ?? data) as Character;
}

export async function replaceCharacterPrices(
  id: string,
  prices: CharacterPriceInput[],
): Promise<CharacterPriceOption[]> {
  const { data } = await api.put<any>(`/characters/${id}/prices`, { prices });
  const list = Array.isArray(data) ? data : (data.priceOptions ?? data.items ?? []);
  return list as CharacterPriceOption[];
}

export async function deleteCharacter(id: string): Promise<void> {
  await api.delete(`/characters/${id}`);
}
