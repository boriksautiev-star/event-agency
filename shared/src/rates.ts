export const RATE_DURATIONS = [30, 40, 45, 60, 90, 120, 180] as const;
export type RateDuration = (typeof RATE_DURATIONS)[number];

export function formatDuration(min: number): string {
  if (min < 60) return `${min} мин`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (m === 0) return `${h} ч`;
  return `${h} ч ${m} мин`;
}

type CharacterWithPrices = {
  priceOptions?: Array<{ durationMin: number } | null> | null;
};

/**
 * Возвращает union: стандартные длительности + кастомные из персонажей + уже сохранённые в шаблоне.
 * Отсортировано по возрастанию.
 */
export function getEffectiveDurations(
  characters: CharacterWithPrices[] = [],
  existingDurations: number[] = [],
): number[] {
  const set = new Set<number>(RATE_DURATIONS);
  for (const c of characters) {
    for (const p of c.priceOptions ?? []) {
      if (p && typeof p.durationMin === "number") set.add(p.durationMin);
    }
  }
  for (const d of existingDurations) {
    if (typeof d === "number") set.add(d);
  }
  return Array.from(set).sort((a, b) => a - b);
}
