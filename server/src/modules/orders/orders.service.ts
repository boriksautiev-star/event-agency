import { prisma } from "../../db/prisma";
import { AssignmentStatus, OrderStatus } from "@prisma/client";
import { PushService } from "../push/push.service";
import { AppError } from "../../utils/AppError";
import {
  AssignAnimatorInput,
  CreateOrderInput,
  ListOrdersQuery,
  MarkFinalPaymentInput,
  UpdateAssignmentInput,
  UpdateOrderInput,
  UpdateOrderStatusInput,
  UpdateTransportInput,
  CreateSlotInput,
  UpdateSlotInput,
} from "./orders.schemas";
import { RatesService } from "../rates/rates.service";
import { AdminAccrualService } from "../admin-payroll/admin-payroll.service";


function calcFinalPayment(clientPrice: number, prepayment: number, prepaymentPaid: boolean) {
  return +Math.max(0, clientPrice - (prepaymentPaid ? prepayment : 0)).toFixed(2);
}

function transportClientAmountFor(
  cost: number,
  policy: string,
  explicit?: number,
): number {
  if (explicit !== undefined) return explicit;
  switch (policy) {
    case "agency_pays": return 0;
    case "client_one_way": return +(cost / 2).toFixed(2);
    case "client_both_ways": return cost;
    default: return 0;
  }
}

const TRANSPORT_LABELS: Record<string, string> = {
  agency_pays: "Оплачивает агентство",
  client_one_way: "Клиент — одна сторона",
  client_both_ways: "Клиент — обе стороны",
};

export class OrdersService {
  /**
   * Резолвит payout для назначения на слот.
   * - explicitPayout задан → manual
   * - slotId задан → lookup в матрице по (animator, character слота, duration слота) → rate_matrix
   * - ничего → manual, 0
   */
  private static async resolveAssignmentData(input: {
    animatorId: string;
    slotId?: string | null;
    explicitPayout?: number;
  }): Promise<{
    payout: number;
    payoutSource: "rate_matrix" | "manual";
    slotId: string | null;
  }> {
    if (input.explicitPayout !== undefined) {
      return {
        payout: input.explicitPayout,
        payoutSource: "manual",
        slotId: input.slotId ?? null,
      };
    }

    if (input.slotId) {
      const slot = await prisma.orderSlot.findUnique({
        where: { id: input.slotId },
      });
      if (!slot) throw new AppError("Слот не найден", 404, "SLOT_NOT_FOUND");

      const res = await RatesService.lookup(
        input.animatorId,
        slot.characterId,
        slot.rateDurationMinutes,
      );
      if (!res.found || res.amount === null) {
        throw new AppError(
          "Ставка для этого слота не задана в матрице. Введите payout вручную.",
          400,
          "RATE_NOT_FOUND",
        );
      }
      return {
        payout: res.amount,
        payoutSource: "rate_matrix",
        slotId: input.slotId,
      };
    }

    return {
      payout: 0,
      payoutSource: "manual",
      slotId: input.slotId ?? null,
    };
  }

  /**
   * Пересчитать итоги заказа по слотам:
   * subtotal = SUM(slot.clientPrice), затем discount, clientPrice, finalPayment.
   */
  private static async recalcOrderTotals(tx: any, orderId: string) {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { slots: true },
    });
    if (!order) return;
    const subtotal = +order.slots
      .reduce((s: number, slot: any) => s + Number(slot.clientPrice), 0)
      .toFixed(2);
    const discountAmount = +(subtotal * (Number(order.discountPercent) / 100)).toFixed(2);
    const clientPrice = +(subtotal - discountAmount).toFixed(2);
    const finalPaymentAmount = calcFinalPayment(
      clientPrice,
      Number(order.prepaymentAmount),
      !!order.prepaymentPaidAt,
    );
    await tx.order.update({
      where: { id: orderId },
      data: { subtotal, discountAmount, clientPrice, finalPaymentAmount },
    });
  }

  static async list(query: ListOrdersQuery, userId: string, role: string) {
    const where: any = {};

    if (query.statusIn) {
      const list = query.statusIn.split(",").map((s) => s.trim()).filter(Boolean);
      if (list.length > 0) where.status = { in: list };
    } else if (query.status) {
      where.status = query.status;
    }
    if (query.clientId) where.clientId = query.clientId;

    if (query.dateFrom || query.dateTo) {
      where.eventDate = {};
      if (query.dateFrom) where.eventDate.gte = new Date(query.dateFrom);
      if (query.dateTo) where.eventDate.lte = new Date(query.dateTo + "T23:59:59");
    }

    if (query.createdFrom || query.createdTo) {
      where.createdAt = {};
      if (query.createdFrom) where.createdAt.gte = new Date(query.createdFrom);
      if (query.createdTo) where.createdAt.lte = new Date(query.createdTo + "T23:59:59.999");
    }

    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: "insensitive" } },
        { address: { contains: query.search, mode: "insensitive" } },
        { client: { name: { contains: query.search, mode: "insensitive" } } },
      ];
    }


    if (query.priceFrom !== undefined || query.priceTo !== undefined) {
      where.clientPrice = {};
      if (query.priceFrom !== undefined) where.clientPrice.gte = query.priceFrom;
      if (query.priceTo !== undefined) where.clientPrice.lte = query.priceTo;
    }

    if (role === "animator") {
      where.animators = { some: { animatorId: userId } };
    } else if (query.animatorId) {
      where.animators = { some: { animatorId: query.animatorId } };
    } else if (query.hasAnimators === "true") {
      where.animators = { some: {} };
    } else if (query.hasAnimators === "false") {
      where.animators = { none: {} };
    }

    if (query.rateGroupId || query.characterId) {
      const slotFilter: any = {};
      if (query.characterId) slotFilter.characterId = query.characterId;
      if (query.rateGroupId) slotFilter.character = { rateGroupId: query.rateGroupId };
      where.slots = { some: slotFilter };
    }

    if (query.prepaymentPaid === "true") {
      where.prepaymentPaidAt = { not: null };
    } else if (query.prepaymentPaid === "false") {
      where.prepaymentPaidAt = null;
    }

    const include = {
      client: { select: { id: true, name: true, phone: true } },
      slots: { include: { character: true }, orderBy: { sortOrder: "asc" as const } },
      animators: {
        where: { status: { in: ["invited", "accepted", "completed"] as AssignmentStatus[] } },
        include: {
          animator: {
            select: { id: true, firstName: true, lastName: true, phone: true },
          },
        },
      },


    };

    // Если в запросе заданы границы по датам — используем простую сортировку по возрастанию.
    // Иначе: будущие заказы (от ближайшего) сверху, затем прошедшие (от свежих).
    let items: any[];
    let total: number;

    if (where.eventDate) {
      [items, total] = await Promise.all([
        prisma.order.findMany({
          where,
          include,
          orderBy: { eventDate: "asc" },
          take: query.limit,
          skip: query.offset,
        }),
        prisma.order.count({ where }),
      ]);
      items = items.map((o: any) => {
        const firstAccepted = (o.animators ?? [])
          .filter((a: any) => a.respondedAt && a.status !== "declined" && a.status !== "removed")
          .sort((a: any, b: any) => +new Date(a.respondedAt) - +new Date(b.respondedAt))[0];
        return {
          ...o,
          acceptedAt: firstAccepted?.respondedAt ?? null,
          acceptedBy: firstAccepted?.animatorId ?? null,
        };
      });
    } else {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const whereFuture = { ...where, eventDate: { gte: today } };
      const wherePast = { ...where, eventDate: { lt: today } };

      const [futureItems, pastItems, futureCount, pastCount] = await Promise.all([
        prisma.order.findMany({
          where: whereFuture,
          include,
          orderBy: { eventDate: "asc" },
        }),
        prisma.order.findMany({
          where: wherePast,
          include,
          orderBy: { eventDate: "desc" },
        }),
        prisma.order.count({ where: whereFuture }),
        prisma.order.count({ where: wherePast }),
      ]);

      const all = [...futureItems, ...pastItems].map((o: any) => {
        const firstAccepted = (o.animators ?? [])
          .filter((a: any) => a.respondedAt && a.status !== "declined" && a.status !== "removed")
          .sort((a: any, b: any) => +new Date(a.respondedAt) - +new Date(b.respondedAt))[0];
        return {
          ...o,
          acceptedAt: firstAccepted?.respondedAt ?? null,
          acceptedBy: firstAccepted?.animatorId ?? null,
        };
      });
      items = all.slice(query.offset, query.offset + query.limit);
      total = futureCount + pastCount;
    }

    return { items, total, limit: query.limit, offset: query.offset };
  }

  static async getById(id: string, userId: string, role: string) {
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        client: true,
        slots: {
          include: { character: true },
          orderBy: { sortOrder: "asc" },
        },
        animators: {
          include: {
            animator: {
              select: { id: true, firstName: true, lastName: true, phone: true },
            },
            slot: { include: { character: true } },
          },
        },
        history: { orderBy: { createdAt: "desc" } },
        changes: {
          orderBy: { changedAt: "desc" },
          include: {
            user: { select: { id: true, firstName: true, lastName: true, role: true } },
          },
        },
      },
    });

    if (!order) throw new AppError("Заказ не найден", 404, "ORDER_NOT_FOUND");

    if (role === "animator" && !order.animators.some((a) => a.animatorId === userId)) {
      throw new AppError("Нет доступа к заказу", 403, "FORBIDDEN");
    }

    const firstAccepted = (order.animators ?? [])
      .filter((a: any) => a.respondedAt && a.status !== "declined" && a.status !== "removed")
      .sort((a: any, b: any) => +new Date(a.respondedAt) - +new Date(b.respondedAt))[0];
    return {
      ...order,
      acceptedAt: firstAccepted?.respondedAt ?? null,
      acceptedBy: firstAccepted?.animatorId ?? null,
    };
  }

  private static async logChange(
    tx: any,
    orderId: string,
    changedBy: string,
    field: string,
    oldValue: string | null,
    newValue: string | null,
    summary?: string,
  ) {
    await tx.orderChange.create({
      data: {
        orderId,
        changedBy,
        field,
        oldValue,
        newValue,
        summary: summary ?? null,
      },
    });
  }


  /**
   * Привести order_payments к текущему состоянию Order.
   * Идемпотентно: можно вызывать при любых изменениях предоплаты/финальной оплаты.
   */
  private static async syncOrderPayments(tx: any, orderId: string, changedBy: string | null) {
    const order = await tx.order.findUnique({ where: { id: orderId } });
    if (!order) return;

    const prepaid = !!order.prepaymentPaidAt;
    const prepayAmount = Number(order.prepaymentAmount);
    const finalPaid = !!order.finalPaymentReceivedAt;
    const finalAmount = Number(order.finalPaymentAmount);

    // --- Предоплата ---
    if (prepaid && prepayAmount > 0) {
      const existing = await tx.orderPayment.findFirst({
        where: { orderId, type: "prepayment" },
      });
      if (existing) {
        if (
          Number(existing.amount) !== prepayAmount ||
          existing.method !== "transfer"
        ) {
          await tx.orderPayment.update({
            where: { id: existing.id },
            data: {
              amount: order.prepaymentAmount,
              method: "transfer",
              paidAt: order.prepaymentPaidAt,
            },
          });
        }
      } else {
        await tx.orderPayment.create({
          data: {
            orderId,
            type: "prepayment",
            amount: order.prepaymentAmount,
            method: "transfer",
            paidAt: order.prepaymentPaidAt,
            createdBy: changedBy ?? null,
          },
        });
      }
    } else {
      await tx.orderPayment.deleteMany({ where: { orderId, type: "prepayment" } });
    }

    // --- Финальная оплата ---
    if (finalPaid && finalAmount > 0) {
      const existing = await tx.orderPayment.findFirst({
        where: { orderId, type: "final" },
      });
      const method = order.finalPaymentMethod ?? "transfer";
      if (existing) {
        if (Number(existing.amount) !== finalAmount || existing.method !== method) {
          await tx.orderPayment.update({
            where: { id: existing.id },
            data: {
              amount: order.finalPaymentAmount,
              method,
              paidAt: order.finalPaymentReceivedAt,
            },
          });
        }
      } else {
        await tx.orderPayment.create({
          data: {
            orderId,
            type: "final",
            amount: order.finalPaymentAmount,
            method,
            paidAt: order.finalPaymentReceivedAt,
            createdBy: order.finalPaymentReceivedBy ?? changedBy ?? null,
          },
        });
      }
    } else {
      await tx.orderPayment.deleteMany({ where: { orderId, type: "final" } });
    }
  }

  static async create(data: CreateOrderInput, createdBy: string) {
    const client = await prisma.client.findUnique({ where: { id: data.clientId } });
    if (!client) throw new AppError("Клиент не найден", 404, "CLIENT_NOT_FOUND");

    // Валидация слотов + загрузка имён персонажей
    const characterMap = new Map<string, string>();
    if (data.slots.length > 0) {
      const charIds = [...new Set(data.slots.map((s) => s.characterId))];
      const found = await prisma.character.findMany({
        where: { id: { in: charIds } },
        select: { id: true, name: true },
      });
      if (found.length !== charIds.length) {
        throw new AppError("Один или несколько персонажей не найдены", 400, "CHARACTER_NOT_FOUND");
      }
      for (const c of found) characterMap.set(c.id, c.name);
    }

    const subtotal = +data.slots
      .reduce((s, slot) => s + slot.clientPrice, 0)
      .toFixed(2);
    const discountAmount = +(subtotal * (data.discountPercent / 100)).toFixed(2);
    const clientPrice = +(subtotal - discountAmount).toFixed(2);
    const finalPaymentAmount = calcFinalPayment(clientPrice, data.prepaymentAmount, data.prepaymentPaid);

    const order = await prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          clientId: data.clientId,
          title: data.title,
          description: data.description ?? null,
          eventDate: new Date(data.eventDate),
          startTime: data.startTime,
          endTime: data.endTime,
          address: data.address ?? null,
          lat: data.lat ?? null,
          lng: data.lng ?? null,
          comment: data.comment ?? null,
          adminId: data.adminId ?? null,
          createdBy,
          subtotal,
          discountPercent: data.discountPercent,
          discountAmount,
          clientPrice,
          transportPolicy: data.transportPolicy as any,
          prepaymentAmount: data.prepaymentAmount,
          prepaymentPaidAt: data.prepaymentPaid ? new Date() : null,
          finalPaymentAmount,
          finalPaymentMethod: data.finalPaymentMethod ?? null,
        },
        include: {
          client: { select: { id: true, name: true, phone: true } },
        },
      });

      for (const s of data.slots) {
        await tx.orderSlot.create({
          data: {
            orderId: created.id,
            characterId: s.characterId,
            rateDurationMinutes: s.rateDurationMinutes,
            clientPrice: s.clientPrice,
            isCustomPrice: s.isCustomPrice,
            characterNameSnapshot: characterMap.get(s.characterId) ?? "",
            sortOrder: s.sortOrder,
          },
        });
      }

      await this.logChange(tx, created.id, createdBy, "created", null, null, "Заказ создан");
      await this.syncOrderPayments(tx, created.id, createdBy);
      return created;
    });

    return order;
  }

  static async update(
    id: string,
    data: UpdateOrderInput,
    changedBy: string,
    role: string,
  ) {
    if (role === "animator") {
      throw new AppError(
        "Аниматор не может редактировать заказ.",
        403,
        "FORBIDDEN",
      );
    }
    if (role === "admin") {
      if (data.prepaymentAmount !== undefined) {
        throw new AppError(
          "Только директор может менять сумму предоплаты.",
          403,
          "FORBIDDEN",
        );
      }
      if (data.prepaymentPaid !== undefined) {
        throw new AppError(
          "Только директор может отмечать предоплату.",
          403,
          "FORBIDDEN",
        );
      }
      if (data.finalPaymentMethod !== undefined) {
        throw new AppError(
          "Только директор может менять метод финальной оплаты.",
          403,
          "FORBIDDEN",
        );
      }
    }
    const existing = await prisma.order.findUnique({ where: { id } });
    if (!existing) throw new AppError("Заказ не найден", 404, "ORDER_NOT_FOUND");

    const updateData: any = {};
    const changes: { field: string; oldValue: string | null; newValue: string | null }[] = [];

    const track = (field: string, oldV: any, newV: any) => {
      if (newV === undefined) return;
      const oldStr = oldV == null ? null : String(oldV);
      const newStr = newV == null ? null : String(newV);
      if (oldStr !== newStr) {
        updateData[field] = newV;
        changes.push({ field, oldValue: oldStr, newValue: newStr });
      }
    };

    track("title", existing.title, data.title);
    track("description", existing.description, data.description);
    if (data.eventDate !== undefined) {
      const oldStr = existing.eventDate.toISOString().slice(0, 10);
      const newStr = new Date(data.eventDate).toISOString().slice(0, 10);
      if (oldStr !== newStr) {
        updateData.eventDate = new Date(data.eventDate);
        changes.push({ field: "eventDate", oldValue: oldStr, newValue: newStr });
      }
    }
    track("startTime", existing.startTime, data.startTime);
    track("endTime", existing.endTime, data.endTime);
    track("address", existing.address, data.address);
    track("lat", existing.lat, data.lat);
    track("lng", existing.lng, data.lng);
    track("comment", existing.comment, data.comment);
    track("adminId", existing.adminId, data.adminId);

    if (data.transportPolicy !== undefined && data.transportPolicy !== existing.transportPolicy) {
      updateData.transportPolicy = data.transportPolicy;
      changes.push({
        field: "transportPolicy",
        oldValue: TRANSPORT_LABELS[existing.transportPolicy] ?? existing.transportPolicy,
        newValue: TRANSPORT_LABELS[data.transportPolicy] ?? data.transportPolicy,
      });
    }

    // Предоплата
    if (data.prepaymentAmount !== undefined) {
      updateData.prepaymentAmount = data.prepaymentAmount;
      changes.push({
        field: "prepaymentAmount",
        oldValue: String(existing.prepaymentAmount),
        newValue: String(data.prepaymentAmount),
      });
    }

    if (data.prepaymentPaid !== undefined) {
      const wasPaid = !!existing.prepaymentPaidAt;
      if (wasPaid !== data.prepaymentPaid) {
        updateData.prepaymentPaidAt = data.prepaymentPaid ? new Date() : null;
        changes.push({
          field: "prepaymentPaid",
          oldValue: wasPaid ? "Да" : "Нет",
          newValue: data.prepaymentPaid ? "Да" : "Нет",
        });
      }
    }

    if (data.finalPaymentMethod !== undefined) {
      updateData.finalPaymentMethod = data.finalPaymentMethod;
    }

    // Дисконт
    if (data.discountPercent !== undefined && Number(existing.discountPercent) !== data.discountPercent) {
      const subtotal = Number(existing.subtotal);
      const discountAmount = +(subtotal * (data.discountPercent / 100)).toFixed(2);
      updateData.discountPercent = data.discountPercent;
      updateData.discountAmount = discountAmount;
      updateData.clientPrice = +(subtotal - discountAmount).toFixed(2);
      changes.push({
        field: "discountPercent",
        oldValue: String(existing.discountPercent),
        newValue: String(data.discountPercent),
      });
    }

    // Пересчёт finalPaymentAmount
    const newClientPrice =
      updateData.clientPrice !== undefined
        ? Number(updateData.clientPrice)
        : Number(existing.clientPrice);
    const newPrepayment =
      updateData.prepaymentAmount !== undefined
        ? Number(updateData.prepaymentAmount)
        : Number(existing.prepaymentAmount);
    const newPrepaymentPaid =
      updateData.prepaymentPaidAt !== undefined
        ? !!updateData.prepaymentPaidAt
        : !!existing.prepaymentPaidAt;
    updateData.finalPaymentAmount = calcFinalPayment(newClientPrice, newPrepayment, newPrepaymentPaid);

    return prisma.$transaction(async (tx) => {
      const updated = await tx.order.update({
        where: { id },
        data: updateData,
        include: {
          client: { select: { id: true, name: true, phone: true } },
          },
      });

      for (const c of changes) {
        await this.logChange(tx, id, changedBy, c.field, c.oldValue, c.newValue);
      }

      await this.syncOrderPayments(tx, id, changedBy);
      return updated;
    }).then(async (r) => {
      await AdminAccrualService.syncForOrder(id).catch(() => {});
      return r;
    });
  }

  static async updateStatus(
    id: string,
    data: UpdateOrderStatusInput,
    changedBy: string,
    role: string,
  ) {
    const order = await prisma.order.findUnique({
      where: { id },
      include: { animators: true },
    });
    if (!order) throw new AppError("Заказ не найден", 404, "ORDER_NOT_FOUND");
    if (order.status === data.status) return order;

    // Проверки прав по ролям
    if (data.status === "completed") {
      if (role === "admin") {
        throw new AppError(
          "Статус «Выполнен» подтверждает аниматор на заказе или директор.",
          403,
          "FORBIDDEN",
        );
      }
      if (role === "animator") {
        const isAssigned = order.animators.some(
          (a) =>
            a.animatorId === changedBy &&
            (a.status === "accepted" || a.status === "completed"),
        );
        if (!isAssigned) {
          throw new AppError(
            "Только аниматор, назначенный на заказ, может подтвердить его выполнение.",
            403,
            "FORBIDDEN",
          );
        }
      }
    } else if (role === "animator") {
      throw new AppError(
        "Аниматор может менять только статус «Выполнен».",
        403,
        "FORBIDDEN",
      );
    }

    return prisma.$transaction(async (tx) => {
      const updated = await tx.order.update({
        where: { id },
        data: { status: data.status as any },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId: id,
          oldStatus: order.status,
          newStatus: data.status as any,
          changedBy,
          comment: data.comment ?? null,
        },
      });

      await tx.orderChange.create({
        data: {
          orderId: id,
          changedBy,
          field: "status",
          oldValue: order.status,
          newValue: data.status,
          summary: data.comment ?? null,
        },
      });

      return updated;
    }).then(async (r) => {
      await AdminAccrualService.syncForOrder(id).catch(() => {});
      return r;
    });
  }

  static async addSlot(orderId: string, data: CreateSlotInput, changedBy: string) {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new AppError("Заказ не найден", 404, "ORDER_NOT_FOUND");

    const character = await prisma.character.findUnique({ where: { id: data.characterId } });
    if (!character) throw new AppError("Персонаж не найден", 404, "CHARACTER_NOT_FOUND");

    const slot = await prisma.orderSlot.create({
      data: {
        orderId,
        characterId: data.characterId,
        rateDurationMinutes: data.rateDurationMinutes,
        clientPrice: data.clientPrice,
        isCustomPrice: data.isCustomPrice,
        characterNameSnapshot: character.name,
        sortOrder: data.sortOrder,
      },
      include: { character: true },
    });

    await this.recalcOrderTotals(prisma, orderId);

    await this.logChange(
      prisma,
      orderId,
      changedBy,
      "slot_added",
      null,
      character.name,
      "Добавлен слот",
    );

    await AdminAccrualService.syncForOrder(orderId).catch(() => {});
    return slot;
  }

  static async updateSlot(
    orderId: string,
    slotId: string,
    data: UpdateSlotInput,
    changedBy: string,
  ) {
    const slot = await prisma.orderSlot.findFirst({
      where: { id: slotId, orderId },
      include: {
        assignments: {
          where: { status: { notIn: ["removed", "declined"] } },
        },
      },
    });
    if (!slot) throw new AppError("Слот не найден", 404, "SLOT_NOT_FOUND");

    if (data.characterId) {
      const ch = await prisma.character.findUnique({ where: { id: data.characterId } });
      if (!ch) throw new AppError("Персонаж не найден", 404, "CHARACTER_NOT_FOUND");
    }

    const slotUpdate: any = {
      characterId: data.characterId,
      rateDurationMinutes: data.rateDurationMinutes,
      clientPrice: data.clientPrice,
      isCustomPrice: data.isCustomPrice,
      sortOrder: data.sortOrder,
    };
    if (data.characterId) {
      const ch = await prisma.character.findUnique({ where: { id: data.characterId } });
      if (ch) slotUpdate.characterNameSnapshot = ch.name;
    }

    await prisma.orderSlot.update({
      where: { id: slotId },
      data: slotUpdate,
    });

    await this.recalcOrderTotals(prisma, orderId);

    // Пересчитать payout у привязанных назначений с rate_matrix
    let affected = 0;
    for (const a of slot.assignments) {
      if (a.payoutSource === "rate_matrix") {
        try {
          const resolved = await this.resolveAssignmentData({
            animatorId: a.animatorId,
            slotId,
          });
          await prisma.orderAnimator.update({
            where: { id: a.id },
            data: { payout: resolved.payout },
          });
          affected++;
        } catch {
          // ставка не найдена в матрице — оставляем старую
        }
      }
    }

    await AdminAccrualService.syncForOrder(orderId).catch(() => {});
    return { ok: true, affectedAssignments: affected };
  }

  static async removeSlot(orderId: string, slotId: string, changedBy: string) {
    const slot = await prisma.orderSlot.findFirst({
      where: { id: slotId, orderId },
      include: {
        assignments: {
          where: { status: { notIn: ["removed", "declined"] } },
        },
      },
    });
    if (!slot) throw new AppError("Слот не найден", 404, "SLOT_NOT_FOUND");

    if (slot.assignments.length > 0) {
      throw new AppError(
        "На слоте есть активное назначение. Сначала снимите аниматора.",
        400,
        "SLOT_HAS_ASSIGNMENTS",
      );
    }

    await prisma.orderSlot.delete({ where: { id: slotId } });
    await this.recalcOrderTotals(prisma, orderId);
    await AdminAccrualService.syncForOrder(orderId).catch(() => {});
    return { ok: true };
  }

  static async assignAnimator(orderId: string, data: AssignAnimatorInput, changedBy: string) {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new AppError("Заказ не найден", 404, "ORDER_NOT_FOUND");

    const animator = await prisma.user.findUnique({ where: { id: data.animatorId } });
    if (!animator || animator.role !== "animator") {
      throw new AppError("Аниматор не найден", 404, "ANIMATOR_NOT_FOUND");
    }

    const slot = await prisma.orderSlot.findFirst({
      where: { id: data.slotId, orderId },
    });
    if (!slot) throw new AppError("Слот не найден в этом заказе", 404, "SLOT_NOT_FOUND");

    // Проверить, что слот свободен (нет активного назначения)
    const slotBusy = await prisma.orderAnimator.findFirst({
      where: {
        slotId: data.slotId,
        status: { in: ["invited", "accepted", "completed"] as AssignmentStatus[] },
      },
    });
    if (slotBusy && slotBusy.animatorId !== data.animatorId) {
      throw new AppError("Слот уже занят другим аниматором", 409, "SLOT_BUSY");
    }

    const existing = await prisma.orderAnimator.findUnique({
      where: { orderId_animatorId: { orderId, animatorId: data.animatorId } },
    });
    if (existing && existing.status !== "removed" && existing.status !== "declined") {
      throw new AppError("Аниматор уже назначен на этот заказ", 409, "ALREADY_ASSIGNED");
    }

    const dayStr = order.eventDate.toISOString().slice(0, 10);
    const dayStart = new Date(dayStr + "T00:00:00");
    const dayEnd = new Date(dayStr + "T23:59:59.999");
    const busy = await prisma.orderAnimator.findFirst({
      where: {
        animatorId: data.animatorId,
        status: { in: ["invited", "accepted", "completed"] as AssignmentStatus[] },
        order: {
          id: { not: orderId },
          eventDate: { gte: dayStart, lte: dayEnd },
          status: { not: "cancelled" },
        },
        AND: [
          { order: { startTime: { lt: order.endTime } } },
          { order: { endTime: { gt: order.startTime } } },
        ],
      },
      include: { order: true },
    });
    if (busy) {
      throw new AppError(
        `Аниматор занят: «${busy.order.title}» ${busy.order.startTime}–${busy.order.endTime}`,
        409,
        "ANIMATOR_BUSY",
      );
    }

    const resolved = await this.resolveAssignmentData({
      animatorId: data.animatorId,
      slotId: data.slotId,
      explicitPayout: data.payout,
    });

    const assignment = await prisma.$transaction(async (tx) => {
      const a = await tx.orderAnimator.upsert({
        where: { orderId_animatorId: { orderId, animatorId: data.animatorId } },
        create: {
          orderId,
          animatorId: data.animatorId,
          slotId: resolved.slotId,
          payout: resolved.payout,
          payoutSource: resolved.payoutSource,
          status: "invited",
          transportPaidBy: order.transportPolicy as any,
        },
        update: {
          slotId: resolved.slotId,
          payout: resolved.payout,
          payoutSource: resolved.payoutSource,
          status: "invited",
          invitedAt: new Date(),
          respondedAt: null,
          completedAt: null,
          transportPaidBy: order.transportPolicy as any,
        },
        include: {
          animator: { select: { id: true, firstName: true, lastName: true, phone: true } },
          slot: { include: { character: true } },
        },
      });

      await this.logChange(
        tx,
        orderId,
        changedBy,
        "animator_added",
        null,
        `${animator.firstName} ${animator.lastName}`,
        "Назначен аниматор",
      );

      return a;
    });

    try {
      await PushService.notifyAnimatorAssigned(data.animatorId, order.title, orderId);
    } catch (e) {
      console.warn("[push] notifyAnimatorAssigned failed:", e);
    }

    return assignment;
  }

  static async updateAssignment(
    orderId: string,
    animatorId: string,
    data: UpdateAssignmentInput,
    currentUserId: string,
    role: string,
  ) {
    if (role === "animator" && animatorId !== currentUserId) {
      throw new AppError("Нет доступа", 403, "FORBIDDEN");
    }

    const assignment = await prisma.orderAnimator.findUnique({
      where: { orderId_animatorId: { orderId, animatorId } },
    });
    if (!assignment) throw new AppError("Назначение не найдено", 404, "ASSIGNMENT_NOT_FOUND");

    // Аниматор может менять только свой статус. Директор/админ — что угодно.
    const updateData: any = {};
    if (data.status !== undefined) {
      updateData.status = data.status;
      if (data.status === "accepted" || data.status === "declined") updateData.respondedAt = new Date();
      if (data.status === "completed") updateData.completedAt = new Date();

      // Расставание: decline (от аниматора) или removed (от staff)
      if (data.status === "declined") {
        const reason = data.releaseReason ?? "declined";
        if (reason !== "declined" && reason !== "handed_over") {
          throw new AppError(
            "Для отказа допустимы причины declined или handed_over.",
            400,
            "BAD_RELEASE_REASON",
          );
        }
        const comment = (data.releaseComment ?? "").trim();
        if (comment.length < 3) {
          throw new AppError(
            "Укажите причину отказа (минимум 3 символа).",
            400,
            "RELEASE_COMMENT_REQUIRED",
          );
        }
        updateData.releaseReason = reason;
        updateData.releaseComment = comment;
        updateData.releasedAt = new Date();
      }

      if (data.status === "removed") {
        if (role === "animator") {
          throw new AppError(
            "Аниматор не может снять себя со своего заказа.",
            403,
            "FORBIDDEN",
          );
        }
        const reason = data.releaseReason;
        if (
          reason !== "removed_rotation" &&
          reason !== "removed_quality" &&
          reason !== "order_cancelled"
        ) {
          throw new AppError(
            "Укажите причину снятия (removed_rotation, removed_quality или order_cancelled).",
            400,
            "RELEASE_REASON_REQUIRED",
          );
        }
        updateData.releaseReason = reason;
        updateData.releaseComment = (data.releaseComment ?? "").trim() || null;
        updateData.releasedAt = new Date();
      }
    }

    if (role !== "animator") {


      // Явный payout → manual
      if (data.payout !== undefined) {
        updateData.payout = data.payout;
        updateData.payoutSource = "manual";
        if (data.slotId !== undefined) updateData.slotId = data.slotId;
      }
      // Меняется слот, payout был из матрицы → пересчитываем по новому слоту
      else if (data.slotId !== undefined && assignment.payoutSource === "rate_matrix") {
        const resolved = await this.resolveAssignmentData({
          animatorId,
          slotId: data.slotId,
        });
        updateData.payout = resolved.payout;
        updateData.payoutSource = resolved.payoutSource;
        updateData.slotId = resolved.slotId;
      }
      // Меняется слот, payout был manual → обновляем только slotId
      else if (data.slotId !== undefined) {
        updateData.slotId = data.slotId;
      }
    }

    const updated = await prisma.orderAnimator.update({
      where: { orderId_animatorId: { orderId, animatorId } },
      data: updateData,
      include: {
        animator: { select: { id: true, firstName: true, lastName: true, phone: true } },
      },
    });

    // Авто-промоушен статуса заказа: если первый аниматор принял, а заказ был "new" → "confirmed"
    if (data.status === "accepted") {
      const order = await prisma.order.findUnique({ where: { id: orderId } });
      if (order && order.status === "new") {
        await prisma.$transaction([
          prisma.order.update({ where: { id: orderId }, data: { status: "confirmed" } }),
          prisma.orderStatusHistory.create({
            data: {
              orderId,
              oldStatus: "new",
              newStatus: "confirmed" as OrderStatus,
              changedBy: currentUserId,
              comment: "Автоматически: аниматор принял заказ",
            },
          }),
        ]);
      }
    }

    if (data.status === "accepted" || data.status === "declined") {
      try {
        const order = await prisma.order.findUnique({
          where: { id: orderId },
          select: { title: true, createdBy: true },
        });
        const adminIds: string[] = [];
        if (order?.createdBy) adminIds.push(order.createdBy);
        if (adminIds.length > 0) {
          const animatorName = `${updated.animator.firstName} ${updated.animator.lastName}`;
          await PushService.notifyAdminsAboutResponse(
            adminIds,
            animatorName,
            order?.title ?? "Заказ",
            orderId,
            data.status as "accepted" | "declined",
          );
        }
      } catch (e) {
        console.warn("[push] notifyAdminsAboutResponse failed:", e);
      }
    }

    return updated;
  }

  static async updateTransport(
    orderId: string,
    animatorId: string,
    data: UpdateTransportInput,
    currentUserId: string,
    role: string,
  ) {
    if (role === "animator" && animatorId !== currentUserId) {
      throw new AppError("Нет доступа", 403, "FORBIDDEN");
    }

    const assignment = await prisma.orderAnimator.findUnique({
      where: { orderId_animatorId: { orderId, animatorId } },
    });
    if (!assignment) throw new AppError("Назначение не найдено", 404, "ASSIGNMENT_NOT_FOUND");

    // Аниматор может сохранить сумму только один раз
    if (role === "animator" && assignment.transportLockedAt) {
      throw new AppError(
        "Сумма уже сохранена. Изменение только через директора.",
        403,
        "TRANSPORT_LOCKED",
      );
    }

    const policy = (data.transportPaidBy ?? (assignment.transportPaidBy as string)) as string;

    // Если обе стороны платит клиент — расход агентства 0
    const cost = policy === "client_both_ways" ? 0 : data.transportCost;

    return prisma.orderAnimator.update({
      where: { orderId_animatorId: { orderId, animatorId } },
      data: {
        transportCost: cost,
        transportPaidBy: policy as any,
        transportClientAmount: 0,
        transportLockedAt:
          role === "animator" ? new Date() : assignment.transportLockedAt ?? new Date(),
      },
      include: {
        animator: { select: { id: true, firstName: true, lastName: true, phone: true } },
      },
    });
  }

  static async removeAssignment(
    orderId: string,
    animatorId: string,
    changedBy: string,
    release?: { releaseReason: string; releaseComment?: string | null },
  ) {
    const assignment = await prisma.orderAnimator.findUnique({
      where: { orderId_animatorId: { orderId, animatorId } },
      include: { animator: { select: { firstName: true, lastName: true } } },
    });
    if (!assignment) throw new AppError("Назначение не найдено", 404, "ASSIGNMENT_NOT_FOUND");

    const reason = release?.releaseReason;
    if (reason !== "removed_rotation" && reason !== "removed_quality" && reason !== "order_cancelled") {
      throw new AppError(
        "Укажите причину снятия (removed_rotation, removed_quality или order_cancelled).",
        400,
        "RELEASE_REASON_REQUIRED",
      );
    }

    return prisma.$transaction(async (tx) => {
      await tx.orderAnimator.update({
        where: { orderId_animatorId: { orderId, animatorId } },
        data: {
          status: "removed",
          releaseReason: reason as any,
          releaseComment: (release?.releaseComment ?? '').trim() || null,
          releasedAt: new Date(),
        },
      });

      await this.logChange(
        tx,
        orderId,
        changedBy,
        "animator_removed",
        `${assignment.animator.firstName} ${assignment.animator.lastName}`,
        null,
        "Снят аниматор",
      );

      return { ok: true };
    });
  }

  // ============ ФИНАЛЬНАЯ ОПЛАТА ============
  static async markFinalPayment(
    orderId: string,
    data: MarkFinalPaymentInput,
    currentUserId: string,
    role: string,
  ) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { animators: true },
    });
    if (!order) throw new AppError("Заказ не найден", 404, "ORDER_NOT_FOUND");

    // Аниматор должен быть на этом заказе
    if (role === "animator") {
      const isAssigned = order.animators.some(
        (a) =>
          a.animatorId === currentUserId &&
          (a.status === "accepted" || a.status === "completed"),
      );
      if (!isAssigned) {
        throw new AppError(
          "Вы должны принять заказ, чтобы отметить оплату",
          403,
          "NOT_ASSIGNED",
        );
      }
    }

    if (order.finalPaymentReceivedAt) {
      throw new AppError("Финальная оплата уже отмечена", 409, "ALREADY_RECEIVED");
    }

    if (Number(order.finalPaymentAmount) <= 0) {
      throw new AppError("Нет суммы к получению", 400, "NO_AMOUNT");
    }

    if (order.status === "cancelled") {
      throw new AppError("Заказ отменён", 400, "ORDER_CANCELLED");
    }

    const promoteToInProgress =
      order.status === "new" || order.status === "confirmed";

    return prisma.$transaction(async (tx) => {
      const updated = await tx.order.update({
        where: { id: orderId },
        data: {
          finalPaymentMethod: data.method as any,
          finalPaymentReceivedAt: new Date(),
          finalPaymentReceivedBy: currentUserId,
          ...(promoteToInProgress ? { status: "in_progress" as any } : {}),
        },
      });

      if (promoteToInProgress) {
        await tx.orderStatusHistory.create({
          data: {
            orderId,
            oldStatus: order.status,
            newStatus: "in_progress",
            changedBy: currentUserId,
            comment: "Автоматически: получена финальная оплата",
          },
        });
      }

      await this.logChange(
        tx,
        orderId,
        currentUserId,
        "finalPaymentReceived",
        null,
        `${data.method === "cash" ? "Наличные" : "Перевод"} · ${Number(order.finalPaymentAmount).toFixed(0)} ₽`,
        "Получена финальная оплата",
      );

      await this.syncOrderPayments(tx, orderId, currentUserId);
      return updated;
    });
  }

  static async unmarkFinalPayment(orderId: string, currentUserId: string) {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new AppError("Заказ не найден", 404, "ORDER_NOT_FOUND");
    if (!order.finalPaymentReceivedAt) {
      throw new AppError("Финальная оплата не отмечена", 400, "NOT_MARKED");
    }
    if (order.finalPaymentHandedAt) {
      throw new AppError("Нельзя снять — деньги уже сданы в кассу", 409, "ALREADY_HANDED");
    }

    return prisma.$transaction(async (tx) => {
      const updated = await tx.order.update({
        where: { id: orderId },
        data: {
          finalPaymentMethod: null,
          finalPaymentReceivedAt: null,
          finalPaymentReceivedBy: null,
        },
      });

      await this.logChange(
        tx,
        orderId,
        currentUserId,
        "finalPaymentReceived",
        "Отменено",
        null,
        "Снята отметка получения",
      );

      await this.syncOrderPayments(tx, orderId, currentUserId);
      return updated;
    });
  }

  static async handoverFinalPayment(orderId: string, currentUserId: string) {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new AppError("Заказ не найден", 404, "ORDER_NOT_FOUND");
    if (!order.finalPaymentReceivedAt) {
      throw new AppError("Финальная оплата ещё не получена", 400, "NOT_RECEIVED");
    }
    if (order.finalPaymentHandedAt) {
      throw new AppError("Уже отмечено", 409, "ALREADY_HANDED");
    }

    return prisma.$transaction(async (tx) => {
      const updated = await tx.order.update({
        where: { id: orderId },
        data: {
          finalPaymentHandedAt: new Date(),
          finalPaymentHandedBy: currentUserId,
        },
      });

      await this.logChange(
        tx,
        orderId,
        currentUserId,
        "finalPaymentHanded",
        null,
        `${Number(order.finalPaymentAmount).toFixed(0)} ₽`,
        order.finalPaymentMethod === "cash" ? "Сдано в кассу" : "Сверено по выписке",
      );

      return updated;
    }).then(async (r) => {
      await AdminAccrualService.syncForOrder(orderId).catch(() => {});
      return r;
    });
  }
}