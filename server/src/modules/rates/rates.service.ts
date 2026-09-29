import { prisma } from "../../db/prisma";
import { AppError } from "../../utils/AppError";
import { MatrixCellInput, SaveMatrixInput } from "./rates.schemas";

export class RatesService {
  /**
   * Найти базовую ставку по (аниматор, персонаж, длительность).
   * Возвращает null, если ячейки нет — тогда админ вводит payout вручную.
   */
  static async lookup(animatorId: string, characterId: string, durationMin: number) {
    const character = await prisma.character.findUnique({
      where: { id: characterId },
      select: { id: true, rateGroupId: true },
    });
    if (!character) throw new AppError("Персонаж не найден", 404, "CHARACTER_NOT_FOUND");

    const rate = await prisma.rate.findUnique({
      where: {
        animatorId_rateGroupId_durationMin: {
          animatorId,
          rateGroupId: character.rateGroupId,
          durationMin,
        },
      },
    });

    return {
      characterId,
      rateGroupId: character.rateGroupId,
      durationMin,
      amount: rate ? Number(rate.amount) : null,
      found: !!rate,
    };
  }

  /**
   * Получить всю матрицу ставок для конкретного аниматора.
   */
  static async getMatrix(animatorId: string) {
    const animator = await prisma.user.findUnique({ where: { id: animatorId } });
    if (!animator) throw new AppError("Аниматор не найден", 404, "ANIMATOR_NOT_FOUND");

    const rates = await prisma.rate.findMany({
      where: { animatorId },
      orderBy: [{ rateGroupId: "asc" }, { durationMin: "asc" }],
    });

    return {
      animatorId,
      cells: rates.map((r) => ({
        rateGroupId: r.rateGroupId,
        durationMin: r.durationMin,
        amount: Number(r.amount),
      })),
    };
  }

  /**
   * Сохранить матрицу (bulk upsert/delete) и пересчитать будущие назначения.
   *
   * Автопересчёт затрагивает OrderAnimator, где:
   *   - animatorId совпадает
   *   - character.rateGroupId = изменённая группа
   *   - rateDurationMinutes = изменённая длительность
   *   - payoutSource = 'rate_matrix' (ручные переопределения не трогаем)
   *   - payoutPaidAt IS NULL (уже выплаченные не трогаем)
   *   - order.eventDate >= начало сегодняшнего дня (будущие и сегодняшние)
   *   - order.status NOT IN (completed, cancelled)
   *
   * Возвращает количество затронутых назначений.
   */
  static async saveMatrix(input: SaveMatrixInput) {
    const animator = await prisma.user.findUnique({ where: { id: input.animatorId } });
    if (!animator) throw new AppError("Аниматор не найден", 404, "ANIMATOR_NOT_FOUND");

    // Проверим все rateGroupId
    const groupIds = [...new Set(input.cells.map((c) => c.rateGroupId))];
    const groups = await prisma.rateGroup.findMany({ where: { id: { in: groupIds } } });
    if (groups.length !== groupIds.length) {
      throw new AppError("Одна или несколько групп не найдены", 400, "RATE_GROUP_NOT_FOUND");
    }

    let affectedAssignments = 0;

    await prisma.$transaction(async (tx) => {
      for (const cell of input.cells) {
        if (cell.amount === null) {
          // Удаляем ячейку, если есть
          await tx.rate.deleteMany({
            where: {
              animatorId: input.animatorId,
              rateGroupId: cell.rateGroupId,
              durationMin: cell.durationMin,
            },
          });
        } else {
          // Upsert
          await tx.rate.upsert({
            where: {
              animatorId_rateGroupId_durationMin: {
                animatorId: input.animatorId,
                rateGroupId: cell.rateGroupId,
                durationMin: cell.durationMin,
              },
            },
            create: {
              animatorId: input.animatorId,
              rateGroupId: cell.rateGroupId,
              durationMin: cell.durationMin,
              amount: cell.amount,
            },
            update: { amount: cell.amount },
          });

          // Автопересчёт будущих назначений
          const todayStart = new Date();
          todayStart.setHours(0, 0, 0, 0);

          const result = await tx.orderAnimator.updateMany({
            where: {
              animatorId: input.animatorId,
              payoutSource: "rate_matrix",
              payoutPaidAt: null,
              slot: {
                rateDurationMinutes: cell.durationMin,
                character: { rateGroupId: cell.rateGroupId },
              },
              order: {
                eventDate: { gte: todayStart },
                status: { notIn: ["completed", "cancelled"] },
              },
            },
            data: { payout: cell.amount },
          });

          affectedAssignments += result.count;
        }
      }
    });

    return { ok: true, affectedAssignments };
  }
}