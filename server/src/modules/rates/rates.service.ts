import { prisma } from "../../db/prisma";
import { AppError } from "../../utils/AppError";

export class RatesService {
  /**
   * Найти базовую ставку для (аниматор, персонаж, длительность).
   * Приоритет:
   *   1) Override по (animatorId, characterId, durationMin)
   *   2) Шаблон аниматора по (character.rateGroupId, durationMin)
   *   3) null (payout вводится вручную)
   */
  static async lookup(animatorId: string, characterId: string, durationMin: number) {
    const character = await prisma.character.findUnique({
      where: { id: characterId },
      select: { id: true, rateGroupId: true },
    });
    if (!character) throw new AppError("Персонаж не найден", 404, "CHARACTER_NOT_FOUND");

    // 1. Override
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

    // 2. Шаблон
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
}
