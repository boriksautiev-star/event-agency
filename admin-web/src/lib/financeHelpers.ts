export type Preset = "this_month" | "last_month" | "this_year" | "custom";

function pad(x: number): string {
  return String(x).padStart(2, "0");
}

function firstDay(y: number, m: number): string {
  return `${y}-${pad(m + 1)}-01`;
}

function lastDay(y: number, m: number): Date {
  return new Date(y, m + 1, 0);
}

function fmtDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function getPreset(preset: Exclude<Preset, "custom">): { from: string; to: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  if (preset === "this_month") return { from: firstDay(y, m), to: fmtDate(lastDay(y, m)) };
  if (preset === "last_month") {
    const lm = m === 0 ? 11 : m - 1;
    const ly = m === 0 ? y - 1 : y;
    return { from: firstDay(ly, lm), to: fmtDate(lastDay(ly, lm)) };
  }
  return { from: `${y}-01-01`, to: `${y}-12-31` };
}

export function fmtMoney(n: number | null | undefined): string {
  const v = Number(n ?? 0);
  if (!Number.isFinite(v)) return "0 ₽";
  return v.toLocaleString("ru-RU", { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + " ₽";
}

export function fmtNumber(n: number | null | undefined): string {
  const v = Number(n ?? 0);
  return v.toLocaleString("ru-RU", { maximumFractionDigits: 2 });
}
