import { api } from "./client";
import type { AnimatorAvailability } from "./types";

export async function fetchAvailability(date: string): Promise<AnimatorAvailability[]> {
  const { data } = await api.get<{ items: AnimatorAvailability[] }>(
    `/animators/availability?date=${date}`,
  );
  return data.items;
}

export async function fetchRateLookup(
  animatorId: string,
  characterId: string,
  durationMin: number,
): Promise<{ found: boolean; amount: number | null }> {
  const params = new URLSearchParams({
    animatorId,
    characterId,
    durationMin: String(durationMin),
  });
  const { data } = await api.get<{ found: boolean; amount: number | null }>(
    `/rates/lookup?${params.toString()}`,
  );
  return data;
}
