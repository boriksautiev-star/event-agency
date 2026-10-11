import { prisma } from "../../db/prisma";
import { AppError } from "../../utils/AppError";
import type {
  AssignTemplateInput,
  CreateTemplateInput,
  SaveOverridesInput,
  SaveTemplateRatesInput,
  UpdateTemplateInput,
} from "./rate-templates.schemas";

async function recalcAssignments(
  tx: any,
  animatorId: string,
): Promise<number> {
  const animator = await tx.user.findUnique({
    where: { id: animatorId },
    select: { rateTemplateId: true },
  });

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  // Получаем все future-назначения этого аниматора
  const assignments = await tx.orderAnimator.findMany({
    where: {
      animatorId,
      payoutSource: "rate_matrix",
      payoutPaidAt: null,
      order: {
        eventDate: { gte: todayStart },
        status: { notIn: ["completed", "cancelled"] },
      },
    },
    include: {
      slot: {
        include: {
          character: { select: { id: true, rateGroupId: true } },
        },
      },
    },
  });

  let updated = 0;

  for (const a of assignments) {
    const characterId = a.slot.character?.id;
    const rateGroupId = a.slot.character?.rateGroupId;
    const durationMin = a.slot.rateDurationMinutes;
    if (!characterId || !rateGroupId) continue;

    // 1. Override?
    const override = await tx.animatorRateOverride.findUnique({
      where: {
        animatorId_characterId_durationMin: {
          animatorId,
          characterId,
          durationMin,
        },
      },
    });

    let newPayout: number | null = override ? Number(override.amount) : null;

    // 2. Шаблон
    if (newPayout === null && animator?.rateTemplateId) {
      const tplRate = await tx.rateTemplateRate.findUnique({
        where: {
          templateId_rateGroupId_durationMin: {
            templateId: animator.rateTemplateId,
            rateGroupId,
            durationMin,
          },
        },
      });
      if (tplRate) newPayout = Number(tplRate.amount);
    }

    if (newPayout === null) continue;
    if (Number(a.payout) === newPayout) continue;

    await tx.orderAnimator.update({
      where: { id: a.id },
      data: { payout: newPayout },
    });
    updated++;
  }

  return updated;
}

export class RateTemplatesService {
  // ============ ШАБЛОНЫ ============

  static async list() {
    const templates = await prisma.rateTemplate.findMany({
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
      include: {
        _count: { select: { animators: true, rates: true } },
      },
    });
    return templates.map((t) => ({
      id: t.id,
      name: t.name,
      notes: t.notes,
      isActive: t.isActive,
      animatorsCount: t._count.animators,
      ratesCount: t._count.rates,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    }));
  }

  static async getById(id: string) {
    const t = await prisma.rateTemplate.findUnique({
      where: { id },
      include: {
        rates: true,
        animators: {
          select: { id: true, firstName: true, lastName: true, phone: true },
        },
      },
    });
    if (!t) throw new AppError("Шаблон не найден", 404, "TEMPLATE_NOT_FOUND");
    return {
      id: t.id,
      name: t.name,
      notes: t.notes,
      isActive: t.isActive,
      cells: t.rates.map((r) => ({
        rateGroupId: r.rateGroupId,
        durationMin: r.durationMin,
        amount: Number(r.amount),
      })),
      animators: t.animators,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    };
  }

  static async create(input: CreateTemplateInput) {
    const existing = await prisma.rateTemplate.findUnique({
      where: { name: input.name },
    });
    if (existing) {
      throw new AppError("Шаблон с таким именем уже существует", 400, "NAME_TAKEN");
    }

    const tpl = await prisma.$transaction(async (tx) => {
      const created = await tx.rateTemplate.create({
        data: {
          name: input.name,
          notes: input.notes ?? null,
        },
      });

      if (input.copyFromTemplateId) {
        const source = await tx.rateTemplateRate.findMany({
          where: { templateId: input.copyFromTemplateId },
        });
        if (source.length > 0) {
          await tx.rateTemplateRate.createMany({
            data: source.map((r) => ({
              templateId: created.id,
              rateGroupId: r.rateGroupId,
              durationMin: r.durationMin,
              amount: r.amount,
            })),
          });
        }
      }

      return created;
    });

    return { id: tpl.id, name: tpl.name };
  }

  static async update(id: string, input: UpdateTemplateInput) {
    const t = await prisma.rateTemplate.findUnique({ where: { id } });
    if (!t) throw new AppError("Шаблон не найден", 404, "TEMPLATE_NOT_FOUND");

    if (input.name && input.name !== t.name) {
      const clash = await prisma.rateTemplate.findUnique({
        where: { name: input.name },
      });
      if (clash) {
        throw new AppError("Шаблон с таким именем уже существует", 400, "NAME_TAKEN");
      }
    }

    const updated = await prisma.rateTemplate.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      },
    });

    return { id: updated.id, name: updated.name, isActive: updated.isActive };
  }

  static async remove(id: string) {
    const t = await prisma.rateTemplate.findUnique({
      where: { id },
      include: { _count: { select: { animators: true } } },
    });
    if (!t) throw new AppError("Шаблон не найден", 404, "TEMPLATE_NOT_FOUND");

    if (t._count.animators > 0) {
      throw new AppError(
        `Нельзя удалить: шаблон используется ${t._count.animators} аниматором(ами)`,
        400,
        "TEMPLATE_IN_USE",
      );
    }

    await prisma.rateTemplate.delete({ where: { id } });
    return { ok: true };
  }

  // ============ СТАВКИ В ШАБЛОНЕ ============

  static async saveRates(id: string, input: SaveTemplateRatesInput) {
    const t = await prisma.rateTemplate.findUnique({ where: { id } });
    if (!t) throw new AppError("Шаблон не найден", 404, "TEMPLATE_NOT_FOUND");

    const groupIds = [...new Set(input.cells.map((c) => c.rateGroupId))];
    const groups = await prisma.rateGroup.findMany({
      where: { id: { in: groupIds } },
    });
    if (groups.length !== groupIds.length) {
      throw new AppError("Одна или несколько групп не найдены", 400, "GROUP_NOT_FOUND");
    }

    let affected = 0;

    await prisma.$transaction(async (tx) => {
      for (const cell of input.cells) {
        if (cell.amount === null) {
          await tx.rateTemplateRate.deleteMany({
            where: {
              templateId: id,
              rateGroupId: cell.rateGroupId,
              durationMin: cell.durationMin,
            },
          });
        } else {
          await tx.rateTemplateRate.upsert({
            where: {
              templateId_rateGroupId_durationMin: {
                templateId: id,
                rateGroupId: cell.rateGroupId,
                durationMin: cell.durationMin,
              },
            },
            create: {
              templateId: id,
              rateGroupId: cell.rateGroupId,
              durationMin: cell.durationMin,
              amount: cell.amount,
            },
            update: { amount: cell.amount },
          });
        }
      }

      // Пересчитать всех аниматоров на этом шаблоне
      const animators = await tx.user.findMany({
        where: { rateTemplateId: id },
        select: { id: true },
      });
      for (const a of animators) {
        affected += await recalcAssignments(tx, a.id);
      }
    });

    return { ok: true, affectedAssignments: affected };
  }

  // ============ НАЗНАЧЕНИЕ ============

  static async assign(input: AssignTemplateInput) {
    const animator = await prisma.user.findUnique({
      where: { id: input.animatorId },
    });
    if (!animator) throw new AppError("Аниматор не найден", 404, "ANIMATOR_NOT_FOUND");
    if (animator.role !== "animator") {
      throw new AppError("Шаблон можно назначить только аниматору", 400, "NOT_ANIMATOR");
    }

    if (input.templateId !== null) {
      const t = await prisma.rateTemplate.findUnique({
        where: { id: input.templateId },
      });
      if (!t) throw new AppError("Шаблон не найден", 404, "TEMPLATE_NOT_FOUND");
    }

    let affected = 0;

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: input.animatorId },
        data: { rateTemplateId: input.templateId },
      });
      affected = await recalcAssignments(tx, input.animatorId);
    });

    return { ok: true, affectedAssignments: affected };
  }

  // ============ OVERRIDES ============

  static async getOverrides(animatorId: string) {
    const animator = await prisma.user.findUnique({
      where: { id: animatorId },
      select: { id: true, rateTemplateId: true },
    });
    if (!animator) throw new AppError("Аниматор не найден", 404, "ANIMATOR_NOT_FOUND");

    const overrides = await prisma.animatorRateOverride.findMany({
      where: { animatorId },
      orderBy: [{ characterId: "asc" }, { durationMin: "asc" }],
    });

    return {
      animatorId,
      templateId: animator.rateTemplateId,
      cells: overrides.map((o) => ({
        characterId: o.characterId,
        durationMin: o.durationMin,
        amount: Number(o.amount),
      })),
    };
  }

  static async saveOverrides(input: SaveOverridesInput) {
    const animator = await prisma.user.findUnique({
      where: { id: input.animatorId },
    });
    if (!animator) throw new AppError("Аниматор не найден", 404, "ANIMATOR_NOT_FOUND");

    if (input.cells.length > 0) {
      const charIds = [...new Set(input.cells.map((c) => c.characterId))];
      const chars = await prisma.character.findMany({
        where: { id: { in: charIds } },
      });
      if (chars.length !== charIds.length) {
        throw new AppError("Один или несколько персонажей не найдены", 400, "CHARACTER_NOT_FOUND");
      }
    }

    let affected = 0;

    await prisma.$transaction(async (tx) => {
      // Удаляем все существующие override, потом создаём новые
      await tx.animatorRateOverride.deleteMany({
        where: { animatorId: input.animatorId },
      });

      if (input.cells.length > 0) {
        await tx.animatorRateOverride.createMany({
          data: input.cells.map((c) => ({
            animatorId: input.animatorId,
            characterId: c.characterId,
            durationMin: c.durationMin,
            amount: c.amount,
          })),
        });
      }

      affected = await recalcAssignments(tx, input.animatorId);
    });

    return { ok: true, affectedAssignments: affected };
  }
}
