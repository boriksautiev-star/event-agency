import { prisma } from "../../db/prisma";

export class AnimatorsService {
  /**
   * Возвращает всех активных аниматоров с их занятостью на указанную дату.
   */
  static async availability(date: string) {
    const dateStart = new Date(date + "T00:00:00");
    const dateEnd = new Date(date + "T23:59:59.999");

    const animators = await prisma.user.findMany({
      where: { role: "animator", status: "active" },
      select: { id: true, firstName: true, lastName: true, phone: true },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    });

    if (animators.length === 0) return [];

    const assignments = await prisma.orderAnimator.findMany({
      where: {
        animatorId: { in: animators.map((a) => a.id) },
        status: { in: ["invited", "accepted", "completed"] },
        order: {
          eventDate: { gte: dateStart, lte: dateEnd },
          status: { not: "cancelled" },
        },
      },
      include: {
        order: {
          include: {
            slots: { include: { character: true }, orderBy: { sortOrder: "asc" } },
            client: { select: { name: true } },
          },
        },
      },
    });

    return animators.map((a) => ({
      id: a.id,
      firstName: a.firstName,
      lastName: a.lastName,
      phone: a.phone,
      orders: assignments
        .filter((x) => x.animatorId === a.id)
        .map((x) => ({
          orderId: x.orderId,
          title: x.order.title,
          clientName: x.order.client?.name ?? null,
          address: x.order.address,
          startTime: x.order.startTime,
          endTime: x.order.endTime,
          orderStatus: x.order.status,
          assignmentStatus: x.status,
          slots: x.order.slots.map((s) => ({
            characterName: s.character?.name ?? s.characterNameSnapshot ?? "",
            durationMin: s.rateDurationMinutes,
          })),
        }))
        .sort((a, b) => a.startTime.localeCompare(b.startTime)),
    }));
  }
}