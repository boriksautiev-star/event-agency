export const RATE_DURATIONS = [30, 40, 45, 60, 90, 120, 180] as const;
export type RateDuration = (typeof RATE_DURATIONS)[number];

export function formatDuration(min: number): string {
  if (min < 60) return `${min} мин`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (m === 0) return `${h} ч`;
  return `${h} ч ${m} мин`;
}