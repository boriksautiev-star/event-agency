import { prisma } from "../../db/prisma";
import { AppError } from "../../utils/AppError";
import { RatesService } from "../rates/rates.service";
import { PushService } from "../push/push.service";
import {
  CreateHandoverInput,
  RejectHandoverInput,
  HandoverListQuery,
} from "./handover.schemas";

const ACTIVE_STATUSES = ["invited", "accepted", "completed"] as const;

function toNum(v: any): number {
  if (v === null || v === undefined) return 0;
  return Number(v);
}

export class HandoverService {
  // ========== Проверки ==========
  private static async isAnimatorFreeForOrder(
    animatorId: string,
    orderId: string,
    excludeHandoverId?: string,
  ): Promise<{ ok: true } | { ok: false; reason: string }> {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) return { ok: false, reason: "Заказ не найден" };
    if (order.status === "cancelled") {
      return { ok: false, reason: "Заказ отменён" };
    }

    const dayStr = order.eventDate.toISOString().slice(0, 10);
    const dayStart = new Date(dayStr + "T00:00:00");
    const dayEnd = new Date(dayStr + "T23:59:59.999");

    // 1) Не назначен на этот заказ (кроме отклонённых/снятых)
    const alreadyOnOrder = await prisma.orderAnimator.findFirst({
      where: {
        orderId,
        animatorId,
        status: { in: [...ACTIVE_STATUSES] },
      },
    });
    if (alreadyOnOrder) {
      return { ok: false, reason: "Аниматор уже назначен на этот заказ" };
    }

    // 2) Нет другого заказа в тот же день с пересечением времени
    const busy = await prisma.orderAnimator.findFirst({
      where: {
        animatorId,
        status: { in: [...ACTIVE_STATUSES] },
        order: {
          id: { not: orderId },
          status: { not: "cancelled" },
          eventDate: { gte: dayStart, lte: dayEnd },
        },
        AND: [
          { order: { startTime: { lt: order.endTime } } },
          { order: { endTime: { gt: order.startTime } } },
        ],
      },
      include: { order: true },
    });
    if (busy) {
      return {
        ok: false,
        reason: `Занят: «${busy.order.title}» ${busy.order.startTime}–${busy.order.endTime}`,
      };
    }

    // 3) Есть активная заявка на этот слот (другая)
    if (excludeHandoverId) {
      // при повторной проверке — просто пропускаем
    }

    return { ok: true };
  }

  // ========== Создать заявку (аниматор) ==========
  static async create(
    orderId: string,
    slotId: string,
    fromAnimatorId: string,
    input: CreateHandoverInput,
  ) {
    if (input.toAnimatorId === fromAnimatorId) {
      throw new AppError("Нельзя передать заказ самому себе", 400, "SELF_HANDOVER");
    }

    const slot = await prisma.orderSlot.findFirst({
      where: { id: slotId, orderId },
      include: { character: true },
    });
    if (!slot) throw new AppError("Слот не найден", 404, "SLOT_NOT_FOUND");

    // Аня — на этом слоте в статусе accepted/completed
    const myAssignment = await prisma.orderAnimator.findFirst({
      where: {
        slotId,
        animatorId: fromAnimatorId,
        status: { in: ["accepted", "completed"] },
      },
    });
    if (!myAssignment) {
      throw new AppError(
        "Вы не назначены на этот слот (или не подтвердили заказ)",
        403,
        "NOT_ASSIGNED",
      );
    }

    // Петя существует, активен, роль animator
    const toUser = await prisma.user.findUnique({
      where: { id: input.toAnimatorId },
    });
    if (!toUser || toUser.role !== "animator") {
      throw new AppError("Аниматор не найден", 404, "ANIMATOR_NOT_FOUND");
    }
    if (toUser.status !== "active") {
      throw new AppError("Аниматор заблокирован", 400, "ANIMATOR_BLOCKED");
    }

    // У Пети есть ставка в матрице для персонажа слота
    const rateRes = await RatesService.lookup(
      input.toAnimatorId,
      slot.characterId,
      slot.rateDurationMinutes,
    );
    if (!rateRes.found || rateRes.amount === null) {
      throw new AppError(
        "У выбранного аниматора нет ставки в матрице для этого персонажа",
        400,
        "RATE_NOT_FOUND",
      );
    }

    // На этом слоте нет другой активной заявки
    const activeRequest = await prisma.handoverRequest.findFirst({
      where: {
        slotId,
        status: { in: ["pending_receiver", "pending_approval"] },
      },
    });
    if (activeRequest) {
      throw new AppError(
        "На этот слот уже есть активная заявка на передачу",
        409,
        "HANDOVER_ALREADY_EXISTS",
      );
    }

    // Проверка свободы Пети
    const free = await this.isAnimatorFreeForOrder(input.toAnimatorId, orderId);
    if (!free.ok) {
      throw new AppError(free.reason, 409, "ANIMATOR_BUSY");
    }

    const created = await prisma.handoverRequest.create({
      data: {
        orderId,
        slotId,
        fromAnimatorId,
        toAnimatorId: input.toAnimatorId,
        comment: input.comment ?? null,
        status: "pending_receiver",
      },
      include: {
        order: { select: { id: true, title: true, eventDate: true, startTime: true, endTime: true } },
        slot: { include: { character: true } },
        fromAnimator: { select: { id: true, firstName: true, lastName: true, phone: true } },
        toAnimator: { select: { id: true, firstName: true, lastName: true, phone: true } },
      },
    });

    try {
      const fromName = `${created.fromAnimator.firstName} ${created.fromAnimator.lastName}`.trim();
      await PushService.notifyHandoverIncoming(
        created.toAnimatorId,
        fromName,
        created.order.title,
        created.id,
        created.orderId,
      );
    } catch (e) {
      console.warn("[handover] push notifyHandoverIncoming failed:", e);
    }

    return created;
  }

  // ========== Списки ==========
  static async listForFrom(animatorId: string, q: HandoverListQuery) {
    const where: any = { fromAnimatorId: animatorId };
    if (q.status && q.status !== "all") where.status = q.status;
    const limit = q.limit ?? 100;
    const offset = q.offset ?? 0;

    const [items, total] = await Promise.all([
      prisma.handoverRequest.findMany({
        where,
        orderBy: { requestedAt: "desc" },
        take: limit,
        skip: offset,
        include: {
          order: { select: { id: true, title: true, eventDate: true, startTime: true, endTime: true } },
          slot: { include: { character: true } },
          fromAnimator: { select: { id: true, firstName: true, lastName: true } },
          toAnimator: { select: { id: true, firstName: true, lastName: true, phone: true } },
        },
      }),
      prisma.handoverRequest.count({ where }),
    ]);
    return { items, total, limit, offset };
  }

  static async listForTo(animatorId: string, q: HandoverListQuery) {
    const where: any = { toAnimatorId: animatorId };
    if (q.status && q.status !== "all") where.status = q.status;
    const limit = q.limit ?? 100;
    const offset = q.offset ?? 0;

    const [items, total] = await Promise.all([
      prisma.handoverRequest.findMany({
        where,
        orderBy: { requestedAt: "desc" },
        take: limit,
        skip: offset,
        include: {
          order: { select: { id: true, title: true, eventDate: true, startTime: true, endTime: true } },
          slot: { include: { character: true } },
          fromAnimator: { select: { id: true, firstName: true, lastName: true, phone: true } },
          toAnimator: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
      prisma.handoverRequest.count({ where }),
    ]);
    return { items, total, limit, offset };
  }

  static async listPendingApproval(q: HandoverListQuery) {
    const where: any = { status: "pending_approval" };
    const limit = q.limit ?? 100;
    const offset = q.offset ?? 0;

    const [items, total] = await Promise.all([
      prisma.handoverRequest.findMany({
        where,
        orderBy: { acceptedAt: "asc" },
        take: limit,
        skip: offset,
        include: {
          order: { select: { id: true, title: true, eventDate: true, startTime: true, endTime: true } },
          slot: { include: { character: true } },
          fromAnimator: { select: { id: true, firstName: true, lastName: true, phone: true } },
          toAnimator: { select: { id: true, firstName: true, lastName: true, phone: true } },
        },
      }),
      prisma.handoverRequest.count({ where }),
    ]);
    return { items, total, limit, offset };
  }

  // ========== Шаги ==========
  static async accept(requestId: string, toAnimatorId: string) {
    const req = await prisma.handoverRequest.findUnique({ where: { id: requestId } });
    if (!req) throw new AppError("Заявка не найдена", 404, "NOT_FOUND");
    if (req.toAnimatorId !== toAnimatorId) {
      throw new AppError("Это не ваша заявка", 403, "FORBIDDEN");
    }
    if (req.status !== "pending_receiver") {
      throw new AppError("Заявка не в статусе ожидания получателя", 409, "BAD_STATUS");
    }

    // Перепроверка свободы
    const free = await this.isAnimatorFreeForOrder(toAnimatorId, req.orderId);
    if (!free.ok) {
      throw new AppError(free.reason, 409, "ANIMATOR_BUSY");
    }

    const updated = await prisma.handoverRequest.update({
      where: { id: requestId },
      data: {
        status: "pending_approval",
        acceptedAt: new Date(),
      },
      include: {
        order: { select: { id: true, title: true, eventDate: true, startTime: true, endTime: true } },
        fromAnimator: { select: { id: true, firstName: true, lastName: true } },
        toAnimator: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    try {
      const toName = `${updated.toAnimator.firstName} ${updated.toAnimator.lastName}`.trim();
      await PushService.notifyHandoverAccepted(
        updated.fromAnimatorId,
        toName,
        updated.order.title,
        updated.id,
        updated.orderId,
      );
    } catch (e) {
      console.warn("[handover] push notifyHandoverAccepted failed:", e);
    }

    return updated;
  }

  static async decline(
    requestId: string,
    toAnimatorId: string,
    input: RejectHandoverInput,
  ) {
    const req = await prisma.handoverRequest.findUnique({ where: { id: requestId } });
    if (!req) throw new AppError("Заявка не найдена", 404, "NOT_FOUND");
    if (req.toAnimatorId !== toAnimatorId) {
      throw new AppError("Это не ваша заявка", 403, "FORBIDDEN");
    }
    if (req.status !== "pending_receiver") {
      throw new AppError("Заявка не в статусе ожидания получателя", 409, "BAD_STATUS");
    }

    const updated = await prisma.handoverRequest.update({
      where: { id: requestId },
      data: {
        status: "rejected_by_receiver",
        resolvedAt: new Date(),
        rejectComment: input.rejectComment ?? null,
      },
      include: {
        order: { select: { title: true } },
        toAnimator: { select: { firstName: true, lastName: true } },
      },
    });

    try {
      const toName = `${updated.toAnimator.firstName} ${updated.toAnimator.lastName}`.trim();
      await PushService.notifyHandoverDeclined(
        updated.fromAnimatorId,
        toName,
        updated.order.title,
        updated.id,
        updated.orderId,
        updated.rejectComment,
      );
    } catch (e) {
      console.warn("[handover] push notifyHandoverDeclined failed:", e);
    }

    return updated;
  }

  static async cancel(requestId: string, fromAnimatorId: string) {
    const req = await prisma.handoverRequest.findUnique({ where: { id: requestId } });
    if (!req) throw new AppError("Заявка не найдена", 404, "NOT_FOUND");
    if (req.fromAnimatorId !== fromAnimatorId) {
      throw new AppError("Это не ваша заявка", 403, "FORBIDDEN");
    }
    if (req.status !== "pending_receiver" && req.status !== "pending_approval") {
      throw new AppError("Заявку уже нельзя отменить", 409, "BAD_STATUS");
    }

    const updated = await prisma.handoverRequest.update({
      where: { id: requestId },
      data: {
        status: "cancelled",
        resolvedAt: new Date(),
        resolvedBy: fromAnimatorId,
      },
      include: {
        order: { select: { title: true } },
        fromAnimator: { select: { firstName: true, lastName: true } },
      },
    });

    try {
      const fromName = `${updated.fromAnimator.firstName} ${updated.fromAnimator.lastName}`.trim();
      await PushService.notifyHandoverCancelled(
        updated.toAnimatorId,
        fromName,
        updated.order.title,
        updated.id,
        updated.orderId,
      );
    } catch (e) {
      console.warn("[handover] push notifyHandoverCancelled failed:", e);
    }

    return updated;
  }

  static async approve(requestId: string, adminId: string) {
    const req = await prisma.handoverRequest.findUnique({
      where: { id: requestId },
      include: { order: true, slot: true },
    });
    if (!req) throw new AppError("Заявка не найдена", 404, "NOT_FOUND");
    if (req.status !== "pending_approval") {
      throw new AppError("Заявка не ждёт подтверждения админа", 409, "BAD_STATUS");
    }
    if (req.order.status === "cancelled") {
      throw new AppError("Заказ отменён", 409, "ORDER_CANCELLED");
    }

    // Аня всё ещё на этом слоте?
    const fromAssignment = await prisma.orderAnimator.findFirst({
      where: {
        slotId: req.slotId,
        animatorId: req.fromAnimatorId,
        status: { in: ["accepted", "completed"] },
      },
    });
    if (!fromAssignment) {
      throw new AppError(
        "Исходный аниматор уже не на этом слоте — заявка устарела",
        409,
        "STALE_REQUEST",
      );
    }

    // Перепроверка свободы Пети
    const free = await this.isAnimatorFreeForOrder(req.toAnimatorId, req.orderId);
    if (!free.ok) {
      throw new AppError(free.reason, 409, "ANIMATOR_BUSY");
    }

    // Payout из матрицы
    const rateRes = await RatesService.lookup(
      req.toAnimatorId,
      req.slot.characterId,
      req.slot.rateDurationMinutes,
    );
    if (!rateRes.found || rateRes.amount === null) {
      throw new AppError(
        "У нового аниматора нет ставки в матрице для этого персонажа",
        400,
        "RATE_NOT_FOUND",
      );
    }
    const newPayout: number = rateRes.amount;

    const fromUser = await prisma.user.findUnique({
      where: { id: req.fromAnimatorId },
      select: { firstName: true, lastName: true },
    });
    const toUser = await prisma.user.findUnique({
      where: { id: req.toAnimatorId },
      select: { firstName: true, lastName: true },
    });

    const result = await prisma.$transaction(async (tx) => {
      // 1) Аня → removed, handed_over
      await tx.orderAnimator.update({
        where: {
          orderId_animatorId: {
            orderId: req.orderId,
            animatorId: req.fromAnimatorId,
          },
        },
        data: {
          status: "removed",
          releaseReason: "handed_over",
          releaseComment: req.comment
            ? `Передача: ${req.comment}`
            : `Передача на ${toUser?.firstName ?? ""} ${toUser?.lastName ?? ""}`.trim(),
          releasedAt: new Date(),
        },
      });

      // 2) Петя → invited
      const existing = await tx.orderAnimator.findUnique({
        where: {
          orderId_animatorId: {
            orderId: req.orderId,
            animatorId: req.toAnimatorId,
          },
        },
      });
      if (existing) {
        await tx.orderAnimator.update({
          where: { id: existing.id },
          data: {
            slotId: req.slotId,
            payout: newPayout,
            payoutSource: "rate_matrix",
            status: "invited",
            invitedAt: new Date(),
            respondedAt: null,
            completedAt: null,
            releaseReason: null,
            releaseComment: null,
            releasedAt: null,
          },
        });
      } else {
        await tx.orderAnimator.create({
          data: {
            orderId: req.orderId,
            animatorId: req.toAnimatorId,
            slotId: req.slotId,
            payout: newPayout,
            payoutSource: "rate_matrix",
            status: "invited",
            transportPaidBy: req.order.transportPolicy,
          },
        });
      }

      // 3) Заявка → approved
      await tx.handoverRequest.update({
        where: { id: requestId },
        data: {
          status: "approved",
          resolvedAt: new Date(),
          resolvedBy: adminId,
        },
      });

      // 4) Лог в OrderChange
      const fromName = `${fromUser?.firstName ?? ""} ${fromUser?.lastName ?? ""}`.trim();
      const toName = `${toUser?.firstName ?? ""} ${toUser?.lastName ?? ""}`.trim();
      await tx.orderChange.create({
        data: {
          orderId: req.orderId,
          changedBy: adminId,
          field: "handover_approved",
          oldValue: fromName,
          newValue: toName,
          summary: req.comment
            ? `Передача подтверждена: ${req.comment}`
            : `Передача подтверждена: ${fromName} → ${toName}`,
        },
      });

      return {
        ok: true as const,
        requestId,
        fromAnimatorId: req.fromAnimatorId,
        toAnimatorId: req.toAnimatorId,
        orderTitle: req.order.title,
      };
    });

    try {
      await PushService.notifyHandoverApproved(
        result.fromAnimatorId,
        result.toAnimatorId,
        result.orderTitle,
        requestId,
        req.orderId,
      );
    } catch (e) {
      console.warn("[handover] push notifyHandoverApproved failed:", e);
    }

    return result;
  }

  static async reject(
    requestId: string,
    adminId: string,
    input: RejectHandoverInput,
  ) {
    const req = await prisma.handoverRequest.findUnique({ where: { id: requestId } });
    if (!req) throw new AppError("Заявка не найдена", 404, "NOT_FOUND");
    if (req.status !== "pending_approval") {
      throw new AppError("Заявка не ждёт подтверждения админа", 409, "BAD_STATUS");
    }

    const updated = await prisma.handoverRequest.update({
      where: { id: requestId },
      data: {
        status: "rejected_by_admin",
        resolvedAt: new Date(),
        resolvedBy: adminId,
        rejectComment: input.rejectComment ?? null,
      },
      include: { order: { select: { title: true } } },
    });

    try {
      await PushService.notifyHandoverRejected(
        updated.fromAnimatorId,
        updated.toAnimatorId,
        updated.order.title,
        updated.id,
        updated.orderId,
        updated.rejectComment,
      );
    } catch (e) {
      console.warn("[handover] push notifyHandoverRejected failed:", e);
    }

    return updated;
  }

  static async getById(requestId: string) {
    const req = await prisma.handoverRequest.findUnique({
      where: { id: requestId },
      include: {
        order: { select: { id: true, title: true, eventDate: true, startTime: true, endTime: true, address: true } },
        slot: { include: { character: true } },
        fromAnimator: { select: { id: true, firstName: true, lastName: true, phone: true } },
        toAnimator: { select: { id: true, firstName: true, lastName: true, phone: true } },
      },
    });
    if (!req) throw new AppError("Заявка не найдена", 404, "NOT_FOUND");
    return req;
  }

  // ========== Аниматоры, свободные для этого слота (для выбора Пети) ==========
  static async candidates(orderId: string, slotId: string, fromAnimatorId: string) {
    const slot = await prisma.orderSlot.findFirst({
      where: { id: slotId, orderId },
      include: { character: true, order: true },
    });
    if (!slot) throw new AppError("Слот не найден", 404, "SLOT_NOT_FOUND");

    const animators = await prisma.user.findMany({
      where: { role: "animator", status: "active", id: { not: fromAnimatorId } },
      select: { id: true, firstName: true, lastName: true, phone: true },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    });

    const result = [];
    for (const a of animators) {
      const free = await this.isAnimatorFreeForOrder(a.id, orderId);
      if (!free.ok) continue;
      const rate = await RatesService.lookup(
        a.id,
        slot.characterId,
        slot.rateDurationMinutes,
      );
      if (!rate.found || rate.amount === null) continue;
      result.push({
        id: a.id,
        firstName: a.firstName,
        lastName: a.lastName,
        phone: a.phone,
        payout: rate.amount,
      });
    }
    return result;
  }
}
