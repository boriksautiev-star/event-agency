import { prisma } from "../../db/prisma";
import { AppError } from "../../utils/AppError";
import {
  CreateExpenseInput,
  ExpenseCategoryInput,
  ListExpensesQuery,
  PayoutsQuery,
  PeriodQuery,
  UpdateExpenseCategoryInput,
  UpdateExpenseInput,
  PaymentsQuery,
} from "./finance.schemas";

function toDate(s: string, endOfDay = false): Date {
  return new Date(s + (endOfDay ? "T23:59:59.999" : "T00:00:00"));
}

function hoursBetween(start: string, end: string): number {
  const [sh = 0, sm = 0] = start.split(":").map(Number);
  const [eh = 0, em = 0] = end.split(":").map(Number);
  if ([sh, sm, eh, em].some((x) => !Number.isFinite(x))) return 0;
  return Math.max(0, eh + em / 60 - (sh + sm / 60));
}

export class FinanceService {
  // ==== Сводка за период ====
  static async summary(query: PeriodQuery) {
    const from = toDate(query.from);
    const to = toDate(query.to, true);

    const orders = await prisma.order.findMany({
      where: {
        eventDate: { gte: from, lte: to },
        status: { in: ["new", "confirmed", "in_progress", "completed"] },
      },
      include: {
        animators: true,
        expenses: true,
      },
    });

    const expenses = await prisma.expense.findMany({
      where: { expenseDate: { gte: from, lte: to } },
    });

    // Фактические поступления от клиентов (ledger order_payments)
    const payments = await prisma.orderPayment.findMany({
      where: { paidAt: { gte: from, lte: to } },
    });

    let revenue = 0;
    let payouts = 0;
    let transportAgency = 0;
    let transportClient = 0;
    let workHours = 0;
    const animatorIds = new Set<string>();

    for (const o of orders) {
      revenue += Number(o.clientPrice);
      for (const a of o.animators) {
        if (a.status === "removed" || a.status === "declined") continue;
        payouts += Number(a.payout);
        transportAgency += Number(a.transportCost);
        workHours += hoursBetween(o.startTime, o.endTime);
        animatorIds.add(a.animatorId);
      }
    }

    const otherExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0);

    let prepayments = 0;
    let finals = 0;
    let refunds = 0;
    let byTransfer = 0;
    let byCash = 0;
    for (const p of payments) {
      const amt = Number(p.amount);
      if (p.type === "prepayment") prepayments += amt;
      else if (p.type === "final") finals += amt;
      else if (p.type === "refund") refunds += amt;
      if (p.type !== "refund") {
        if (p.method === "transfer") byTransfer += amt;
        else if (p.method === "cash") byCash += amt;
      }
    }
    const incomeTotal = prepayments + finals - refunds;
    const cashProfit = incomeTotal - payouts - transportAgency - otherExpenses;

    const profit = revenue - payouts - transportAgency - otherExpenses;

    return {
      period: { from: query.from, to: query.to },
      revenue: +revenue.toFixed(2),
      income: {
        total: +incomeTotal.toFixed(2),
        prepayments: +prepayments.toFixed(2),
        finals: +finals.toFixed(2),
        refunds: +refunds.toFixed(2),
        byMethod: {
          transfer: +byTransfer.toFixed(2),
          cash: +byCash.toFixed(2),
        },
      },
      cashProfit: +cashProfit.toFixed(2),
      payouts: +payouts.toFixed(2),
      transportAgency: +transportAgency.toFixed(2),
      transportClient: +transportClient.toFixed(2),
      otherExpenses: +otherExpenses.toFixed(2),
      profit: +profit.toFixed(2),
      ordersCount: orders.length,
      animatorsCount: animatorIds.size,
      workHours: +workHours.toFixed(2),
    };
  }

  // ==== Выплаты ====
  static async listPayments(query: PaymentsQuery) {
    const where: any = {};
    if (query.type) where.type = query.type;
    if (query.method) where.method = query.method;
    if (query.orderId) where.orderId = query.orderId;

    if (query.from || query.to) {
      where.paidAt = {};
      if (query.from) where.paidAt.gte = toDate(query.from);
      if (query.to) where.paidAt.lte = toDate(query.to, true);
    }

    const [items, total, sum] = await Promise.all([
      prisma.orderPayment.findMany({
        where,
        include: {
          order: {
            select: {
              id: true, title: true, eventDate: true, status: true,
              client: { select: { id: true, name: true, phone: true } },
            },
          },
        },
        orderBy: { paidAt: "desc" },
        take: query.limit,
        skip: query.offset,
      }),
      prisma.orderPayment.count({ where }),
      prisma.orderPayment.aggregate({ where, _sum: { amount: true } }),
    ]);

    return {
      items: items.map((p) => ({
        id: p.id,
        orderId: p.orderId,
        order: p.order,
        type: p.type,
        amount: Number(p.amount),
        method: p.method,
        paidAt: p.paidAt,
        comment: p.comment,
        createdBy: p.createdBy,
        createdAt: p.createdAt,
      })),
      total,
      sum: +(Number(sum._sum.amount ?? 0)).toFixed(2),
      limit: query.limit,
      offset: query.offset,
    };
  }
  static async listPayouts(query: PayoutsQuery) {
    const where: any = {};

    if (query.paid === "true") where.payoutPaidAt = { not: null };
    else if (query.paid === "false") where.payoutPaidAt = null;

    if (query.animatorId) where.animatorId = query.animatorId;

    if (query.from || query.to) {
      where.order = { eventDate: {} };
      if (query.from) where.order.eventDate.gte = toDate(query.from);
      if (query.to) where.order.eventDate.lte = toDate(query.to, true);
    }

    const items = await prisma.orderAnimator.findMany({
      where,
      include: {
        animator: { select: { id: true, firstName: true, lastName: true, phone: true } },
        order: { select: { id: true, title: true, eventDate: true, startTime: true, endTime: true, status: true } },
      },
      orderBy: { order: { eventDate: "desc" } },
    });

    const total = items.reduce((s, x) => s + Number(x.payout), 0);

    return {
      items: items.map((x) => ({
        id: x.id,
        animatorId: x.animatorId,
        animator: x.animator,
        orderId: x.orderId,
        order: x.order,
        payout: Number(x.payout),
        transportCost: Number(x.transportCost),
        transportClientAmount: Number(x.transportClientAmount),
        payoutPaidAt: x.payoutPaidAt,
        payoutPaidBy: x.payoutPaidBy,
        payoutMethod: x.payoutMethod,
        status: x.status,
      })),
      total: +total.toFixed(2),
    };
  }

  static async markPaid(
    orderAnimatorId: string,
    userId: string,
    method: "cash" | "transfer",
  ) {
    const existing = await prisma.orderAnimator.findUnique({
      where: { id: orderAnimatorId },
      include: { animator: { select: { firstName: true, lastName: true } } },
    });
    if (!existing) throw new AppError("\u041D\u0430\u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u043E", 404, "NOT_FOUND");

    const methodLabel = method === "cash"
      ? "\u043D\u0430\u043B\u0438\u0447\u043D\u044B\u043C\u0438"
      : "\u043F\u0435\u0440\u0435\u0432\u043E\u0434\u043E\u043C";

    return prisma.$transaction(async (tx) => {
      const updated = await tx.orderAnimator.update({
        where: { id: orderAnimatorId },
        data: {
          payoutPaidAt: new Date(),
          payoutPaidBy: userId,
          payoutMethod: method as any,
        },
      });

      await tx.orderChange.create({
        data: {
          orderId: existing.orderId,
          changedBy: userId,
          field: "payoutPaid",
          oldValue: existing.payoutPaidAt ? "\u041E\u0442\u043C\u0435\u0447\u0435\u043D\u043E" : "\u041D\u0435 \u043E\u0442\u043C\u0435\u0447\u0435\u043D\u043E",
          newValue: "\u041E\u0442\u043C\u0435\u0447\u0435\u043D\u043E",
          summary: `\u0412\u044B\u043F\u043B\u0430\u0442\u0430 ${existing.animator.firstName} ${existing.animator.lastName}: ${Number(existing.payout).toFixed(0)} \u20BD \u00B7 ${methodLabel}`,
        },
      });

      return updated;
    });
  }

  static async unmarkPaid(orderAnimatorId: string, userId: string) {
    const existing = await prisma.orderAnimator.findUnique({
      where: { id: orderAnimatorId },
      include: { animator: { select: { firstName: true, lastName: true } } },
    });
    if (!existing) throw new AppError("\u041D\u0430\u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u043E", 404, "NOT_FOUND");

    const methodLabel =
      existing.payoutMethod === "cash"
        ? "\u043D\u0430\u043B\u0438\u0447\u043D\u044B\u043C\u0438"
        : existing.payoutMethod === "transfer"
        ? "\u043F\u0435\u0440\u0435\u0432\u043E\u0434\u043E\u043C"
        : "\u2014";
    const paidAtLabel = existing.payoutPaidAt
      ? new Date(existing.payoutPaidAt).toLocaleString("ru-RU", {
          day: "2-digit", month: "2-digit", year: "numeric",
          hour: "2-digit", minute: "2-digit",
        })
      : "\u2014";

    return prisma.$transaction(async (tx) => {
      const updated = await tx.orderAnimator.update({
        where: { id: orderAnimatorId },
        data: { payoutPaidAt: null, payoutPaidBy: null, payoutMethod: null },
      });

      await tx.orderChange.create({
        data: {
          orderId: existing.orderId,
          changedBy: userId,
          field: "payoutPaid",
          oldValue: "\u041E\u0442\u043C\u0435\u0447\u0435\u043D\u043E",
          newValue: "\u041D\u0435 \u043E\u0442\u043C\u0435\u0447\u0435\u043D\u043E",
          summary: `\u041E\u0442\u043C\u0435\u043D\u0435\u043D\u0430 \u0432\u044B\u043F\u043B\u0430\u0442\u0430 ${existing.animator.firstName} ${existing.animator.lastName}: ${Number(existing.payout).toFixed(0)} \u20BD \u00B7 ${methodLabel} \u00B7 \u0431\u044B\u043B\u043E \u043E\u0442\u043C\u0435\u0447\u0435\u043D\u043E ${paidAtLabel}`,
        },
      });

      return updated;
    });
  }

  static async listCategories() {
    return prisma.expenseCategory.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: { _count: { select: { expenses: true } } },
    });
  }

  static async createCategory(data: ExpenseCategoryInput) {
    return prisma.expenseCategory.create({ data });
  }

  static async updateCategory(id: string, data: UpdateExpenseCategoryInput) {
    const existing = await prisma.expenseCategory.findUnique({ where: { id } });
    if (!existing) throw new AppError("Категория не найдена", 404, "NOT_FOUND");
    return prisma.expenseCategory.update({ where: { id }, data });
  }

  static async deleteCategory(id: string) {
    const existing = await prisma.expenseCategory.findUnique({
      where: { id },
      include: { _count: { select: { expenses: true } } },
    });
    if (!existing) throw new AppError("Категория не найдена", 404, "NOT_FOUND");
    if (existing._count.expenses > 0) {
      throw new AppError(
        `Нельзя удалить: в категории ${existing._count.expenses} расход(ов). Сначала перенесите их.`,
        409,
        "CATEGORY_IN_USE",
      );
    }
    await prisma.expenseCategory.delete({ where: { id } });
    return { ok: true };
  }

  // ==== Расходы ====
  static async listExpenses(query: ListExpensesQuery) {
    const where: any = {};
    if (query.categoryId) where.categoryId = query.categoryId;
    if (query.orderId) where.orderId = query.orderId;

    if (query.from || query.to) {
      where.expenseDate = {};
      if (query.from) where.expenseDate.gte = toDate(query.from);
      if (query.to) where.expenseDate.lte = toDate(query.to, true);
    }

    const [items, total, sum] = await Promise.all([
      prisma.expense.findMany({
        where,
        include: {
          category: { select: { id: true, name: true } },
          order: { select: { id: true, title: true, eventDate: true } },
        },
        orderBy: { expenseDate: "desc" },
        take: query.limit,
        skip: query.offset,
      }),
      prisma.expense.count({ where }),
      prisma.expense.aggregate({ where, _sum: { amount: true } }),
    ]);

    return {
      items: items.map((e) => ({
        id: e.id,
        categoryId: e.categoryId,
        category: e.category,
        orderId: e.orderId,
        order: e.order,
        amount: Number(e.amount),
        expenseDate: e.expenseDate,
        comment: e.comment,
        createdAt: e.createdAt,
      })),
      total,
      sum: +(Number(sum._sum.amount ?? 0)).toFixed(2),
      limit: query.limit,
      offset: query.offset,
    };
  }

  static async createExpense(data: CreateExpenseInput, userId: string) {
    const cat = await prisma.expenseCategory.findUnique({ where: { id: data.categoryId } });
    if (!cat) throw new AppError("Категория не найдена", 404, "CATEGORY_NOT_FOUND");

    if (data.orderId) {
      const order = await prisma.order.findUnique({ where: { id: data.orderId } });
      if (!order) throw new AppError("Заказ не найден", 404, "ORDER_NOT_FOUND");
    }

    return prisma.expense.create({
      data: {
        categoryId: data.categoryId,
        orderId: data.orderId ?? null,
        amount: data.amount,
        expenseDate: toDate(data.expenseDate),
        comment: data.comment ?? null,
        createdBy: userId,
      },
      include: {
        category: { select: { id: true, name: true } },
        order: { select: { id: true, title: true } },
      },
    });
  }

  static async updateExpense(id: string, data: UpdateExpenseInput) {
    const existing = await prisma.expense.findUnique({ where: { id } });
    if (!existing) throw new AppError("Расход не найден", 404, "NOT_FOUND");

    const updateData: any = {};
    if (data.categoryId !== undefined) updateData.categoryId = data.categoryId;
    if (data.orderId !== undefined) updateData.orderId = data.orderId;
    if (data.amount !== undefined) updateData.amount = data.amount;
    if (data.expenseDate !== undefined) updateData.expenseDate = toDate(data.expenseDate);
    if (data.comment !== undefined) updateData.comment = data.comment;

    return prisma.expense.update({
      where: { id },
      data: updateData,
      include: {
        category: { select: { id: true, name: true } },
        order: { select: { id: true, title: true } },
      },
    });
  }

  static async deleteExpense(id: string) {
    const existing = await prisma.expense.findUnique({ where: { id } });
    if (!existing) throw new AppError("Расход не найден", 404, "NOT_FOUND");
    await prisma.expense.delete({ where: { id } });
    return { ok: true };
  }

  // ==== Сид базовых категорий ====
  static async ensureDefaultCategories() {
    const count = await prisma.expenseCategory.count();
    if (count > 0) return;
    const defaults = [
      { name: "Аренда", sortOrder: 1 },
      { name: "Коммунальные платежи", sortOrder: 2 },
      { name: "Реклама", sortOrder: 3 },
      { name: "Закупки", sortOrder: 4 },
      { name: "Прочее", sortOrder: 99 },
    ];
    for (const d of defaults) {
      await prisma.expenseCategory.create({ data: d });
    }
  }
}