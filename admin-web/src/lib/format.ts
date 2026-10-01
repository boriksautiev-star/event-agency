export function formatMoney(v: string | number | null | undefined): string {
  const n = Number(v ?? 0);
  if (!Number.isFinite(n)) return "0 ₽";
  return n.toLocaleString("ru-RU", { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + " ₽";
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatTimeRange(start: string, end: string): string {
  return `${start}–${end}`;
}
