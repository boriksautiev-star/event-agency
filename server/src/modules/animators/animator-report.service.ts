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

    // Релизы (отказы + снятия) за период — по releasedAt (fallback respondedAt)
    const releasesRaw = await prisma.orderAnimator.findMany({
      where: {
        animatorId,
        status: { in: ["declined", "removed"] },
      },
      include: {
        order: {
          select: {
            id: true,
            title: true,
            eventDate: true,
            startTime: true,
            endTime: true,
          },
        },
      },
    });

    const releases = releasesRaw
      .map((r) => {
        const at = r.releasedAt ?? r.respondedAt ?? r.invitedAt;
        const payout = Number(r.payout);
        return {
          assignmentId: r.id,
          orderId: r.orderId,
          orderTitle: r.order.title,
          eventDate: r.order.eventDate,
          status: r.status as "declined" | "removed",
          releaseReason: r.releaseReason,
          releaseComment: r.releaseComment,
          releasedAt: at,
          payout,
        };
      })
      .filter((r) => r.releasedAt && r.releasedAt >= from && r.releasedAt <= to)
      .sort((a, b) => +b.releasedAt! - +a.releasedAt!);

    const byReason = {
      declined: 0,
      handed_over: 0,
      removed_rotation: 0,
      removed_quality: 0,
      order_cancelled: 0,
    } as Record<string, number>;
    let lostPayout = 0;
    for (const r of releases) {
      const key = r.releaseReason ?? "declined";
      byReason[key] = (byReason[key] ?? 0) + 1;
      lostPayout += r.payout;
    }

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

    const acceptedCount = summary.ordersCount;
    const declinedCount = releases.filter((r) => r.status === "declined").length;
    const removedCount = releases.filter((r) => r.status === "removed").length;
    const offersCount = acceptedCount + declinedCount + removedCount;
    const acceptRate =
      offersCount > 0 ? +((acceptedCount / offersCount) * 100).toFixed(1) : 0;

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
        acceptedCount,
        declinedCount,
        removedCount,
        offersCount,
        acceptRate,
        lostPayout: +lostPayout.toFixed(2),
        byReason,
      },
      releases,
      items: mapped,
    };
  }
}