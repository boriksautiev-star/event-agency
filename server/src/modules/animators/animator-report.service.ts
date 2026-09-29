import { prisma } from "../../db/prisma";

type ReportQuery = {
  from: string;
  to: string;
  status?: string;
  scope?: "past" | "future" | "all";
};

function toDate(s: string, endOfDay = false): Date {
  return new Date(s + (endOfDay ? "T23:59:59.999" : "T00:00:00"));
}

function hoursBetween(start: string, end: string): number {
  const [sh = 0, sm = 0] = start.split(":").map(Number);
  const [eh = 0, em = 0] = end.split(":").map(Number);
  if ([sh, sm, eh, em].some((x) => !Number.isFinite(x))) return 0;
  return Math.max(0, eh + em / 60 - (sh + sm / 60));
}

export class AnimatorReportService {
  static async report(animatorId: string, query: ReportQuery) {
    const from = toDate(query.from);
    const to = toDate(query.to, true);

    const where: any = {
      animatorId,
      status: { in: ["accepted", "completed"] },
      order: {
        eventDate: { gte: from, lte: to },
        status: { not: "cancelled" },
      },
    };

    if (query.status) {
      where.order.status = query.status;
    }

    const now = new Date();

    const items = await prisma.orderAnimator.findMany({
      where,
      include: {
        animator: { select: { id: true, firstName: true, lastName: true } },
        order: {
          include: {
            client: { select: { name: true, phone: true } },
            slots: { include: { character: true } },
          },
        },
      },
      orderBy: { order: { eventDate: "desc" } },
    });

    // Фильтр по scope
    const filtered = items.filter((x) => {
      if (!query.scope || query.scope === "all") return true;
      const isFuture = x.order.eventDate >= now;
      if (query.scope === "future") return isFuture;
      return !isFuture;
    });

    const mapped = filtered.map((x) => {
      const hours = hoursBetween(x.order.startTime, x.order.endTime);
      return {
        orderId: x.orderId,
        title: x.order.title,
        eventDate: x.order.eventDate,
        startTime: x.order.startTime,
        endTime: x.order.endTime,
        address: x.order.address,
        clientName: x.order.client?.name ?? null,
        clientPhone: x.order.client?.phone ?? null,
        orderStatus: x.order.status,
        assignmentStatus: x.status,
        hours: +hours.toFixed(2),
        payout: Number(x.payout),
        payoutPaidAt: x.payoutPaidAt,
        payoutMethod: x.payoutMethod,
        slots: x.order.slots.map((s) => ({
          characterName: s.character?.name ?? s.characterNameSnapshot ?? "",
          durationMin: s.rateDurationMinutes,
        })),
      };
    });

    // Сводка
    const summary = mapped.reduce(
      (acc, x) => {
        acc.ordersCount += 1;
        acc.hours += x.hours;
        acc.payoutTotal += x.payout;
        if (x.payoutPaidAt) {
          acc.payoutPaid += x.payout;
          if (x.payoutMethod === "cash") acc.payoutPaidCash += x.payout;
          else if (x.payoutMethod === "transfer") acc.payoutPaidTransfer += x.payout;
        } else {
          acc.payoutRemaining += x.payout;
        }
        return acc;
      },
      {
        ordersCount: 0,
        hours: 0,
        payoutTotal: 0,
        payoutPaid: 0,
        payoutPaidCash: 0,
        payoutPaidTransfer: 0,
        payoutRemaining: 0,
      },
    );

    return {
      period: { from: query.from, to: query.to },
      scope: query.scope ?? "all",
      summary: {
        ordersCount: summary.ordersCount,
        hours: +summary.hours.toFixed(2),
        payoutTotal: +summary.payoutTotal.toFixed(2),
        payoutPaid: +summary.payoutPaid.toFixed(2),
        payoutPaidCash: +summary.payoutPaidCash.toFixed(2),
        payoutPaidTransfer: +summary.payoutPaidTransfer.toFixed(2),
        payoutRemaining: +summary.payoutRemaining.toFixed(2),
      },
      items: mapped,
    };
  }
}