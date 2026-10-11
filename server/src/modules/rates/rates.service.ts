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

    // 1. Override по (animator, character, duration)?
    const override = await prisma.animatorRateOverride.findUnique({
      where: {
        animatorId_characterId_durationMin: {
          animatorId,
          characterId,
          durationMin,
        },
      },
    });

    if (override) {
      return {
        characterId,
        rateGroupId: character.rateGroupId,
        durationMin,
        amount: Number(override.amount),
        found: true,
        source: "override" as const,
      };
    }

    // 2. Шаблон аниматора по (rateGroup, duration)?
    const animator = await prisma.user.findUnique({
      where: { id: animatorId },
      select: { rateTemplateId: true },
    });

    if (animator?.rateTemplateId) {
      const tplRate = await prisma.rateTemplateRate.findUnique({
        where: {
          templateId_rateGroupId_durationMin: {
            templateId: animator.rateTemplateId,
            rateGroupId: character.rateGroupId,
            durationMin,
          },
        },
      });
      if (tplRate) {
        return {
          characterId,
          rateGroupId: character.rateGroupId,
          durationMin,
          amount: Number(tplRate.amount),
          found: true,
          source: "template" as const,
        };
      }
    }

    return {
      characterId,
      rateGroupId: character.rateGroupId,
      durationMin,
      amount: null,
      found: false,
      source: null,
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
      // Найдём или создадим персональный шаблон аниматора
      let templateId = animator.rateTemplateId;
      if (!templateId) {
        let name = `Персональные ставки ${animator.firstName} ${animator.lastName}`;
        const clash = await tx.rateTemplate.findUnique({ where: { name } });
        if (clash) name = `${name} (${animator.id.slice(0, 4)})`;
        const tpl = await tx.rateTemplate.create({
          data: { name, notes: "Персональный шаблон (авто)" },
        });
        templateId = tpl.id;
        await tx.user.update({
          where: { id: animator.id },
          data: { rateTemplateId: templateId },
        });
      }

      for (const cell of input.cells) {
        if (cell.amount === null) {
          await tx.rateTemplateRate.deleteMany({
            where: {
              templateId,
              rateGroupId: cell.rateGroupId,
              durationMin: cell.durationMin,
            },
          });
        } else {
          await tx.rateTemplateRate.upsert({
            where: {
              templateId_rateGroupId_durationMin: {
                templateId,
                rateGroupId: cell.rateGroupId,
                durationMin: cell.durationMin,
              },
            },
            create: {
              templateId,
              rateGroupId: cell.rateGroupId,
              durationMin: cell.durationMin,
              amount: cell.amount,
            },
            update: { amount: cell.amount },
          });
        }

        // Пересчёт будущих назначений этого аниматора на этот слот (группа+duration)
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const assignments = await tx.orderAnimator.findMany({
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
          include: { slot: { include: { character: { select: { id: true } } } } },
        });

        for (const a of assignments) {
          const characterId = a.slot?.character?.id;
          if (!characterId) continue;

          // Override приоритетнее
          const override = await tx.animatorRateOverride.findUnique({
            where: {
              animatorId_characterId_durationMin: {
                animatorId: input.animatorId,
                characterId,
                durationMin: cell.durationMin,
              },
            },
          });

          const newPayout = override ? Number(override.amount) : cell.amount;
          if (newPayout === null) continue;
          if (Number(a.payout) === newPayout) continue;

          await tx.orderAnimator.update({
            where: { id: a.id },
            data: { payout: newPayout },
          });
          affectedAssignments++;
        }
      }
    });

    return { ok: true, affectedAssignments };
  }
}