import ExcelJS from "exceljs";
import { prisma } from "../../db/prisma";

function toDate(s: string, endOfDay = false): Date {
  return new Date(s + (endOfDay ? "T23:59:59.999" : "T00:00:00"));
}

// ============ CSV ============
function csvCell(v: any): string {
  if (v === null || v === undefined) return "";
  const s = String(v).replace(/"/g, '""');
  return `"${s}"`;
}

function toCSV(headers: string[], rows: any[][]): string {
  const lines: string[] = [];
  lines.push(headers.map(csvCell).join(";"));
  for (const r of rows) lines.push(r.map(csvCell).join(";"));
  return "\uFEFF" + lines.join("\r\n");
}

// ============ Excel ============
type Sheet = { name: string; headers: string[]; rows: any[][] };

async function buildExcel(sheets: Sheet[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Event Agency";
  workbook.created = new Date();

  for (const s of sheets) {
    const ws = workbook.addWorksheet(s.name, {
      views: [{ state: "frozen", ySplit: 1 }],
    });

    ws.addRow(s.headers);
    const headerRow = ws.getRow(1);
    headerRow.font = { bold: true };
    headerRow.alignment = { vertical: "middle", horizontal: "center" };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFEEF2FF" },
    };
    headerRow.border = {
      bottom: { style: "thin", color: { argb: "FFCBD5E1" } },
    };
    headerRow.height = 20;

    for (const r of s.rows) ws.addRow(r);

    // Автоширина
    ws.columns.forEach((col, idx) => {
      const header = s.headers[idx] ?? "";
      const maxRow = s.rows.reduce((m, r) => {
        const v = r[idx];
        return Math.max(m, v === null || v === undefined ? 0 : String(v).length);
      }, 0);
      const width = Math.max(10, Math.min(50, Math.max(header.length, maxRow) + 3));
      col.width = width;
    });
  }

  const arr = await workbook.xlsx.writeBuffer();
  return Buffer.from(arr);
}

// ============ Данные ============
async function loadOrders(from: string, to: string) {
  return prisma.order.findMany({
    where: {
      eventDate: { gte: toDate(from), lte: toDate(to, true) },
      status: { not: "cancelled" },
    },
    include: {
      client: { select: { name: true, phone: true } },
      slots: { include: { character: true }, orderBy: { sortOrder: "asc" } },
      animators: {
        include: { animator: { select: { firstName: true, lastName: true } } },
      },
    },
    orderBy: { eventDate: "asc" },
  });
}

async function loadPayouts(from: string, to: string, paid: string) {
  const where: any = {};
  if (paid === "true") where.payoutPaidAt = { not: null };
  else if (paid === "false") where.payoutPaidAt = null;
  where.order = { eventDate: { gte: toDate(from), lte: toDate(to, true) } };

  return prisma.orderAnimator.findMany({
    where,
    include: {
      animator: { select: { firstName: true, lastName: true, phone: true } },
      order: { select: { title: true, eventDate: true, startTime: true, endTime: true } },
    },
    orderBy: { order: { eventDate: "asc" } },
  });
}

async function loadExpenses(from: string, to: string, categoryId?: string) {
  const where: any = {
    expenseDate: { gte: toDate(from), lte: toDate(to, true) },
  };
  if (categoryId) where.categoryId = categoryId;
  return prisma.expense.findMany({
    where,
    include: {
      category: { select: { name: true } },
      order: { select: { title: true } },
    },
    orderBy: { expenseDate: "asc" },
  });
}

// ============ Экспорт: Заказы ============
export class FinanceExportService {
  // CSV
  static async ordersCSV(from: string, to: string) {
    const orders = await loadOrders(from, to);
    const headers = [
      "ID", "Дата", "Начало", "Конец", "Название", "Клиент", "Телефон",
      "Адрес", "Статус", "Сумма услуг", "Скидка %", "Скидка ₽",
      "Итого для клиента", "Предоплата", "Предоплата получена",
      "Услуги", "Аниматоры", "Выплаты аниматорам",
    ];
    const rows = orders.map((o) => [
      o.id,
      o.eventDate.toISOString().slice(0, 10),
      o.startTime,
      o.endTime,
      o.title,
      o.client?.name ?? "",
      o.client?.phone ?? "",
      o.address ?? "",
      o.status,
      Number(o.subtotal).toFixed(2),
      Number(o.discountPercent).toFixed(2),
      Number(o.discountAmount).toFixed(2),
      Number(o.clientPrice).toFixed(2),
      Number(o.prepaymentAmount).toFixed(2),
      o.prepaymentPaidAt ? "Да" : "Нет",
      o.slots.map((s) => `${s.character?.name ?? s.characterNameSnapshot} (${s.rateDurationMinutes} мин)`).join(", "),
      o.animators
        .filter((a) => a.status !== "removed")
        .map((a) => `${a.animator.firstName} ${a.animator.lastName} — ${Number(a.payout).toFixed(0)} ₽`)
        .join(", "),
      o.animators
        .filter((a) => a.status !== "removed")
        .reduce((s, a) => s + Number(a.payout), 0)
        .toFixed(2),
    ]);
    return toCSV(headers, rows);
  }

  static async payoutsCSV(from: string, to: string, paid: string) {
    const items = await loadPayouts(from, to, paid);
    const headers = [
      "Аниматор", "Телефон", "Дата заказа", "Время", "Заказ",
      "Сумма к выплате", "Статус выплаты", "Дата выплаты",
      "Такси (факт)", "Такси (на клиенте)",
    ];
    const rows = items.map((x) => [
      `${x.animator.firstName} ${x.animator.lastName}`,
      x.animator.phone,
      x.order.eventDate.toISOString().slice(0, 10),
      `${x.order.startTime}-${x.order.endTime}`,
      x.order.title,
      Number(x.payout).toFixed(2),
      x.payoutPaidAt ? "Выплачено" : "К выплате",
      x.payoutPaidAt ? x.payoutPaidAt.toISOString().slice(0, 10) : "",
      Number(x.transportCost).toFixed(2),
      Number(x.transportClientAmount).toFixed(2),
    ]);
    return toCSV(headers, rows);
  }

  static async expensesCSV(from: string, to: string, categoryId?: string) {
    const items = await loadExpenses(from, to, categoryId);
    const headers = ["Дата", "Категория", "Заказ", "Сумма", "Комментарий"];
    const rows = items.map((e) => [
      e.expenseDate.toISOString().slice(0, 10),
      e.category.name,
      e.order?.title ?? "",
      Number(e.amount).toFixed(2),
      e.comment ?? "",
    ]);
    return toCSV(headers, rows);
  }

  // Excel
  static async ordersExcel(from: string, to: string) {
    const orders = await loadOrders(from, to);
    const headers = [
      "ID", "Дата", "Начало", "Конец", "Название", "Клиент", "Телефон",
      "Адрес", "Статус", "Сумма услуг", "Скидка %", "Скидка ₽",
      "Итого для клиента", "Предоплата", "Предоплата получена",
      "Услуги", "Аниматоры", "Выплаты аниматорам",
    ];
    const rows = orders.map((o) => [
      o.id,
      o.eventDate.toISOString().slice(0, 10),
      o.startTime,
      o.endTime,
      o.title,
      o.client?.name ?? "",
      o.client?.phone ?? "",
      o.address ?? "",
      o.status,
      Number(o.subtotal),
      Number(o.discountPercent),
      Number(o.discountAmount),
      Number(o.clientPrice),
      Number(o.prepaymentAmount),
      o.prepaymentPaidAt ? "Да" : "Нет",
      o.slots.map((s) => `${s.character?.name ?? s.characterNameSnapshot} (${s.rateDurationMinutes} мин)`).join(", "),
      o.animators
        .filter((a) => a.status !== "removed")
        .map((a) => `${a.animator.firstName} ${a.animator.lastName} — ${Number(a.payout).toFixed(0)} ₽`)
        .join(", "),
      o.animators
        .filter((a) => a.status !== "removed")
        .reduce((s, a) => s + Number(a.payout), 0),
    ]);
    return buildExcel([{ name: "Заказы", headers, rows }]);
  }

  static async payoutsExcel(from: string, to: string, paid: string) {
    const items = await loadPayouts(from, to, paid);
    const headers = [
      "Аниматор", "Телефон", "Дата заказа", "Время", "Заказ",
      "Сумма к выплате", "Статус выплаты", "Дата выплаты",
      "Такси (факт)", "Такси (на клиенте)",
    ];
    const rows = items.map((x) => [
      `${x.animator.firstName} ${x.animator.lastName}`,
      x.animator.phone,
      x.order.eventDate.toISOString().slice(0, 10),
      `${x.order.startTime}-${x.order.endTime}`,
      x.order.title,
      Number(x.payout),
      x.payoutPaidAt ? "Выплачено" : "К выплате",
      x.payoutPaidAt ? x.payoutPaidAt.toISOString().slice(0, 10) : "",
      Number(x.transportCost),
      Number(x.transportClientAmount),
    ]);
    return buildExcel([{ name: "Выплаты", headers, rows }]);
  }

  static async expensesExcel(from: string, to: string, categoryId?: string) {
    const items = await loadExpenses(from, to, categoryId);
    const headers = ["Дата", "Категория", "Заказ", "Сумма", "Комментарий"];
    const rows = items.map((e) => [
      e.expenseDate.toISOString().slice(0, 10),
      e.category.name,
      e.order?.title ?? "",
      Number(e.amount),
      e.comment ?? "",
    ]);
    return buildExcel([{ name: "Расходы", headers, rows }]);
  }
}