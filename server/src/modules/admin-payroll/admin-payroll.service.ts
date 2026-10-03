import { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { AppError } from "../../utils/AppError";
import {
  SetCompensationInput,
  AccrualQuery,
  PaymentQuery,
  CreatePaymentInput,
  FixedAccrualInput,
} from "./admin-payroll.schemas";

type Tx = Prisma.TransactionClient | PrismaClient;

function toNum(v: any): number {
  if (v === null || v === undefined) return 0;
  return Number(v);
}
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export class AdminCompensationService {
  static async getActiveAt(
    adminId: string,
    at: Date,
    tx: Tx = prisma,
  ) {
    return tx.adminCompensation.findFirst({
      where: { adminId, effectiveFrom: { lte: at } },
      orderBy: { effectiveFrom: "desc" },
    });
  }

  static async list(adminId: string) {
    return prisma.adminCompensation.findMany({
      where: { adminId },
      orderBy: { effectiveFrom: "desc" },
    });
  }

  static async set(adminId: string, input: SetCompensationInput) {
    const admin = await prisma.user.findUnique({
      where: { id: adminId },
    });
    if (!admin) {
      throw new AppError("Админ не найден", 404, "USER_NOT_FOUND");
    }
    if (admin.role !== "admin") {
      throw new AppError("Не админ", 422, "NOT_ADMIN");
    }
    if (input.type === "percent") {
      if (input.percentValue === null || input.percentValue === undefined) {
        throw new AppError("Укажите процент", 422, "PERCENT_REQUIRED");
      }
    } else {
      if (input.fixedAmount === null || input.fixedAmount === undefined) {
        throw new AppError("Укажите сумму", 422, "AMOUNT_REQUIRED");
      }
    }
    const effectiveFrom = new Date(input.effectiveFrom);
    if (isNaN(effectiveFrom.getTime())) {
      throw new AppError("Дата некорректна", 422, "INVALID_DATE");
    }
    return prisma.adminCompensation.create({
      data: {
        adminId,
        type: input.type,
        percentValue:
          input.type === "percent" ? input.percentValue! : null,
        fixedAmount:
          input.type === "fixed"
            ? new Prisma.Decimal(input.fixedAmount!)
            : null,
        effectiveFrom,
      },
    });
  }
}

export class AdminAccrualService {
  static async syncForOrder(orderId: string, tx: Tx = prisma) {
    const order = await tx.order.findUnique({
      where: { id: orderId },
    });
    if (!order) return;
    const shouldAccrue =
      order.status === "completed" && !!order.adminId;
    if (!shouldAccrue) {
      await tx.adminAccrual.updateMany({
        where: { orderId, status: "active" },
        data: { status: "cancelled" },
      });
      return;
    }
    const at =
      order.finalPaymentHandedAt ??
      order.finalPaymentReceivedAt ??
      new Date();
    const comp = await AdminCompensationService.getActiveAt(
      order.adminId!,
      at,
      tx,
    );
    if (!comp || comp.type !== "percent") {
      await tx.adminAccrual.updateMany({
        where: { orderId, status: "active" },
        data: { status: "cancelled" },
      });
      return;
    }
    const baseAmount = toNum(order.clientPrice);
    const percentValue = comp.percentValue ?? 0;
    const amount = round2((baseAmount * percentValue) / 100);
    const existing = await tx.adminAccrual.findFirst({
      where: { orderId, status: "active" },
    });
    if (existing) {
      if (existing.adminId !== order.adminId) {
        await tx.adminAccrual.update({
          where: { id: existing.id },
          data: { status: "cancelled" },
        });
        await tx.adminAccrual.create({
          data: {
            adminId: order.adminId!,
            orderId,
            type: "percent",
            baseAmount: new Prisma.Decimal(baseAmount),
            percentValue,
            amount: new Prisma.Decimal(amount),
          },
        });
      } else {
        await tx.adminAccrual.update({
          where: { id: existing.id },
          data: {
            type: "percent",
            baseAmount: new Prisma.Decimal(baseAmount),
            percentValue,
            amount: new Prisma.Decimal(amount),
          },
        });
      }
    } else {
      await tx.adminAccrual.create({
        data: {
          adminId: order.adminId!,
          orderId,
          type: "percent",
          baseAmount: new Prisma.Decimal(baseAmount),
          percentValue,
          amount: new Prisma.Decimal(amount),
        },
      });
    }
  }

  static async list(adminId: string, q: AccrualQuery) {
    const where: any = { adminId };
    if (q.status && q.status !== "all") where.status = q.status;
    if (q.from || q.to) {
      where.createdAt = {};
      if (q.from) where.createdAt.gte = new Date(q.from);
      if (q.to) where.createdAt.lte = new Date(q.to);
    }
    const limit = q.limit ?? 200;
    const offset = q.offset ?? 0;
    const [items, total, sumAgg] = await Promise.all([
      prisma.adminAccrual.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
        include: {
          order: {
            select: { id: true, title: true, eventDate: true },
          },
        },
      }),
      prisma.adminAccrual.count({ where }),
      prisma.adminAccrual.aggregate({
        where: { ...where, status: "active" },
        _sum: { amount: true },
      }),
    ]);
    return {
      items,
      total,
      sum: toNum(sumAgg._sum.amount),
      limit,
      offset,
    };
  }

  static async accrueFixed(
    adminId: string,
    input: FixedAccrualInput,
    _createdBy: string,
  ) {
    const admin = await prisma.user.findUnique({
      where: { id: adminId },
    });
    if (!admin || admin.role !== "admin") {
      throw new AppError("Админ не найден", 404, "USER_NOT_FOUND");
    }
    const periodFrom = new Date(input.periodFrom);
    const periodTo = new Date(input.periodTo);
    if (
      isNaN(periodFrom.getTime()) ||
      isNaN(periodTo.getTime())
    ) {
      throw new AppError("Период некорректен", 422, "INVALID_PERIOD");
    }
    if (periodTo < periodFrom) {
      throw new AppError("Конец раньше начала", 422, "INVALID_PERIOD");
    }
    return prisma.adminAccrual.create({
      data: {
        adminId,
        orderId: null,
        type: "fixed",
        baseAmount: new Prisma.Decimal(input.amount),
        percentValue: null,
        amount: new Prisma.Decimal(input.amount),
        periodFrom,
        periodTo,
        comment: input.comment ?? null,
      },
    });
  }

  static async cancel(accrualId: string) {
    const a = await prisma.adminAccrual.findUnique({
      where: { id: accrualId },
    });
    if (!a) {
      throw new AppError("Начисление не найдено", 404, "NOT_FOUND");
    }
    if (a.status === "cancelled") return a;
    return prisma.adminAccrual.update({
      where: { id: accrualId },
      data: { status: "cancelled" },
    });
  }

  static async balance(adminId: string, tx: Tx = prisma) {
    const [accrued, paid] = await Promise.all([
      tx.adminAccrual.aggregate({
        where: { adminId, status: "active" },
        _sum: { amount: true },
      }),
      tx.adminPayment.aggregate({
        where: { adminId },
        _sum: { amount: true },
      }),
    ]);
    const accruedTotal = toNum(accrued._sum.amount);
    const paidTotal = toNum(paid._sum.amount);
    return {
      accruedTotal,
      paidTotal,
      balance: round2(accruedTotal - paidTotal),
    };
  }
}

export class AdminPaymentService {
  static async list(adminId: string, q: PaymentQuery) {
    const where: any = { adminId };
    if (q.from || q.to) {
      where.paidAt = {};
      if (q.from) where.paidAt.gte = new Date(q.from);
      if (q.to) where.paidAt.lte = new Date(q.to);
    }
    const limit = q.limit ?? 200;
    const offset = q.offset ?? 0;
    const [items, total, sumAgg] = await Promise.all([
      prisma.adminPayment.findMany({
        where,
        orderBy: { paidAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.adminPayment.count({ where }),
      prisma.adminPayment.aggregate({
        where,
        _sum: { amount: true },
      }),
    ]);
    return {
      items,
      total,
      sum: toNum(sumAgg._sum.amount),
      limit,
      offset,
    };
  }

  static async create(
    adminId: string,
    input: CreatePaymentInput,
    createdBy: string,
  ) {
    const admin = await prisma.user.findUnique({
      where: { id: adminId },
    });
    if (!admin || admin.role !== "admin") {
      throw new AppError("Админ не найден", 404, "USER_NOT_FOUND");
    }
    const paidAt = new Date(input.paidAt);
    if (isNaN(paidAt.getTime())) {
      throw new AppError("Дата некорректна", 422, "INVALID_DATE");
    }
    const category = await prisma.expenseCategory.findFirst({
      where: {
        name: { contains: "Зарплат", mode: "insensitive" },
      },
    });
    if (!category) {
      throw new AppError(
        "Категория «Зарплаты» не найдена",
        422,
        "CATEGORY_NOT_FOUND",
      );
    }
    return prisma.$transaction(async (tx) => {
      const commentText =
        (input.comment ? input.comment + " — " : "") +
        "Выплата админу " +
        admin.lastName +
        " " +
        admin.firstName;
      const expense = await tx.expense.create({
        data: {
          categoryId: category.id,
          amount: new Prisma.Decimal(input.amount),
          expenseDate: paidAt,
          comment: commentText,
          createdBy,
        },
      });
      return tx.adminPayment.create({
        data: {
          adminId,
          amount: new Prisma.Decimal(input.amount),
          method: input.method,
          paidAt,
          comment: input.comment ?? null,
          expenseId: expense.id,
          createdBy,
        },
      });
    });
  }

  static async remove(id: string) {
    const p = await prisma.adminPayment.findUnique({
      where: { id },
    });
    if (!p) {
      throw new AppError("Выплата не найдена", 404, "NOT_FOUND");
    }
    await prisma.$transaction(async (tx) => {
      await tx.adminPayment.delete({ where: { id } });
      if (p.expenseId) {
        await tx.expense
          .delete({ where: { id: p.expenseId } })
          .catch(() => {});
      }
    });
    return { ok: true };
  }
}

export class AdminPayrollQueryService {
  static async listAdmins() {
    const admins = await prisma.user.findMany({
      where: { role: "admin" },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    });
    const items = await Promise.all(
      admins.map(async (a) => {
        const comp =
          await AdminCompensationService.getActiveAt(
            a.id,
            new Date(),
          );
        const bal = await AdminAccrualService.balance(a.id);
        return {
          id: a.id,
          firstName: a.firstName,
          lastName: a.lastName,
          phone: a.phone,
          email: a.email,
          status: a.status,
          compensation: comp
            ? {
                id: comp.id,
                type: comp.type,
                percentValue: comp.percentValue,
                fixedAmount: comp.fixedAmount
                  ? toNum(comp.fixedAmount)
                  : null,
                effectiveFrom: comp.effectiveFrom,
              }
            : null,
          ...bal,
        };
      }),
    );
    return { items, total: items.length };
  }

  static async getAdmin(adminId: string) {
    const admin = await prisma.user.findUnique({
      where: { id: adminId },
    });
    if (!admin || admin.role !== "admin") {
      throw new AppError("Админ не найден", 404, "USER_NOT_FOUND");
    }
    const compensations =
      await AdminCompensationService.list(adminId);
    const current =
      await AdminCompensationService.getActiveAt(
        adminId,
        new Date(),
      );
    const bal = await AdminAccrualService.balance(adminId);
    return {
      admin: {
        id: admin.id,
        firstName: admin.firstName,
        lastName: admin.lastName,
        phone: admin.phone,
        email: admin.email,
        status: admin.status,
      },
      compensations,
      current: current
        ? {
            id: current.id,
            type: current.type,
            percentValue: current.percentValue,
            fixedAmount: current.fixedAmount
              ? toNum(current.fixedAmount)
              : null,
            effectiveFrom: current.effectiveFrom,
          }
        : null,
      ...bal,
    };
  }

  static async meSummary(
    adminId: string,
    from?: string,
    to?: string,
  ) {
    const admin = await prisma.user.findUnique({
      where: { id: adminId },
    });
    if (!admin) {
      throw new AppError("Пользователь не найден", 404, "NOT_FOUND");
    }
    const now = new Date();
    const fromDate = from
      ? new Date(from)
      : new Date(now.getFullYear(), now.getMonth(), 1);
    const toDate = to ? new Date(to) : now;
    const comp = await AdminCompensationService.getActiveAt(
      adminId,
      new Date(),
    );
    const bal = await AdminAccrualService.balance(adminId);
    const orders = await prisma.order.findMany({
      where: {
        adminId,
        eventDate: { gte: fromDate, lte: toDate },
      },
      orderBy: { eventDate: "desc" },
      select: {
        id: true,
        title: true,
        eventDate: true,
        status: true,
        clientPrice: true,
        adminAccruals: {
          where: { adminId, status: "active" },
          select: {
            amount: true,
            percentValue: true,
            type: true,
          },
        },
      },
    });
    const orderItems = orders.map((o) => {
      const acc = o.adminAccruals[0];
      return {
        id: o.id,
        title: o.title,
        eventDate: o.eventDate,
        status: o.status,
        clientPrice: toNum(o.clientPrice),
        adminPercent: acc?.percentValue ?? null,
        adminAmount: acc ? toNum(acc.amount) : null,
        willAccrue:
          o.status !== "completed" && o.status !== "cancelled",
      };
    });
    const [accruedPeriod, paidPeriod] = await Promise.all([
      prisma.adminAccrual.aggregate({
        where: {
          adminId,
          status: "active",
          createdAt: { gte: fromDate, lte: toDate },
        },
        _sum: { amount: true },
      }),
      prisma.adminPayment.aggregate({
        where: {
          adminId,
          paidAt: { gte: fromDate, lte: toDate },
        },
        _sum: { amount: true },
      }),
    ]);
    return {
      admin: {
        id: admin.id,
        firstName: admin.firstName,
        lastName: admin.lastName,
      },
      period: { from: fromDate, to: toDate },
      compensation: comp
        ? {
            type: comp.type,
            percentValue: comp.percentValue,
            fixedAmount: comp.fixedAmount
              ? toNum(comp.fixedAmount)
              : null,
          }
        : null,
      orders: orderItems,
      accruedPeriod: toNum(accruedPeriod._sum.amount),
      paidPeriod: toNum(paidPeriod._sum.amount),
      ...bal,
    };
  }

  static async meLedger(
    adminId: string,
    from?: string,
    to?: string,
  ) {
    const fromDate = from ? new Date(from) : new Date(2000, 0, 1);
    const toDate = to ? new Date(to) : new Date(2100, 0, 1);
    const [accruals, payments] = await Promise.all([
      prisma.adminAccrual.findMany({
        where: {
          adminId,
          createdAt: { gte: fromDate, lte: toDate },
        },
        orderBy: { createdAt: "desc" },
        include: {
          order: {
            select: { id: true, title: true, eventDate: true },
          },
        },
      }),
      prisma.adminPayment.findMany({
        where: {
          adminId,
          paidAt: { gte: fromDate, lte: toDate },
        },
        orderBy: { paidAt: "desc" },
      }),
    ]);
    const rows: any[] = [
      ...accruals.map((a) => ({
        id: a.id,
        kind: "accrual",
        date: a.createdAt,
        amount: toNum(a.amount),
        status: a.status,
        comment: a.comment,
        orderId: a.orderId,
        orderTitle: a.order?.title ?? null,
        type: a.type,
        percentValue: a.percentValue,
        baseAmount: toNum(a.baseAmount),
      })),
      ...payments.map((p) => ({
        id: p.id,
        kind: "payment",
        date: p.paidAt,
        amount: toNum(p.amount),
        method: p.method,
        comment: p.comment,
      })),
    ].sort((a, b) => +new Date(b.date) - +new Date(a.date));
    const bal = await AdminAccrualService.balance(adminId);
    return { items: rows, ...bal };
  }
}
