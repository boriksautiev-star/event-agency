import { prisma } from "../../db/prisma";
import { AppError } from "../../utils/AppError";
import {
  CreateCharacterInput,
  UpdateCharacterInput,
  ReplacePricesInput,
} from "./characters.schemas";

export class CharactersService {
  static async list(opts: { rateGroupId?: string; activeOnly?: boolean; search?: string }) {
    const where: any = {};
    if (opts.rateGroupId) where.rateGroupId = opts.rateGroupId;
    if (opts.activeOnly) where.isActive = true;
    if (opts.search) {
      where.name = { contains: opts.search, mode: "insensitive" };
    }
    return prisma.character.findMany({
      where,
      orderBy: [{ name: "asc" }],
      include: {
        rateGroup: { select: { id: true, name: true } },
        priceOptions: {
          where: { isActive: true },
          orderBy: { durationMin: "asc" },
        },
      },
    });
  }

  static async get(id: string) {
    const ch = await prisma.character.findUnique({
      where: { id },
      include: {
        rateGroup: { select: { id: true, name: true } },
        priceOptions: { orderBy: { durationMin: "asc" } },
      },
    });
    if (!ch) throw new AppError("Персонаж не найден", 404, "CHARACTER_NOT_FOUND");
    return ch;
  }

  static async create(data: CreateCharacterInput) {
    const grp = await prisma.rateGroup.findUnique({ where: { id: data.rateGroupId } });
    if (!grp) throw new AppError("Группа не найдена", 404, "RATE_GROUP_NOT_FOUND");

    return prisma.character.create({
      data: {
        name: data.name,
        rateGroupId: data.rateGroupId,
        notes: data.notes ?? null,
        isActive: data.isActive,
        priceOptions: data.prices.length > 0
          ? {
              create: data.prices.map((p) => ({
                durationMin: p.durationMin,
                price: p.price,
              })),
            }
          : undefined,
      },
      include: {
        rateGroup: { select: { id: true, name: true } },
        priceOptions: { orderBy: { durationMin: "asc" } },
      },
    });
  }

  static async update(id: string, data: UpdateCharacterInput) {
    await this.get(id);
    if (data.rateGroupId) {
      const grp = await prisma.rateGroup.findUnique({ where: { id: data.rateGroupId } });
      if (!grp) throw new AppError("Группа не найдена", 404, "RATE_GROUP_NOT_FOUND");
    }
    return prisma.character.update({
      where: { id },
      data,
      include: {
        rateGroup: { select: { id: true, name: true } },
        priceOptions: { orderBy: { durationMin: "asc" } },
      },
    });
  }

  /** Bulk-замена цен: удаляем всё, что не пришло, и upsert-им пришедшее. */
  static async replacePrices(id: string, data: ReplacePricesInput) {
    await this.get(id);

    // Проверка дублей durationMin
    const seen = new Set<number>();
    for (const p of data.prices) {
      if (seen.has(p.durationMin)) {
        throw new AppError(
          `Длительность ${p.durationMin} мин указана несколько раз`,
          400,
          "DUPLICATE_DURATION",
        );
      }
      seen.add(p.durationMin);
    }

    return prisma.$transaction(async (tx) => {
      // Удалить всё, чего нет в новом массиве
      const incoming = data.prices.map((p) => p.durationMin);
      await tx.characterPriceOption.deleteMany({
        where: {
          characterId: id,
          durationMin: { notIn: incoming.length > 0 ? incoming : [-1] },
        },
      });

      // Upsert
      for (const p of data.prices) {
        await tx.characterPriceOption.upsert({
          where: {
            characterId_durationMin: { characterId: id, durationMin: p.durationMin },
          },
          create: { characterId: id, durationMin: p.durationMin, price: p.price },
          update: { price: p.price, isActive: true },
        });
      }

      return tx.character.findUnique({
        where: { id },
        include: {
          rateGroup: { select: { id: true, name: true } },
          priceOptions: { orderBy: { durationMin: "asc" } },
        },
      });
    });
  }

  static async delete(id: string) {
    await this.get(id);
    const slotsCount = await prisma.orderSlot.count({ where: { characterId: id } });
    if (slotsCount > 0) {
      throw new AppError(
        `Персонаж используется в ${slotsCount} слоте(ах) заказов. Деактивируйте вместо удаления.`,
        400,
        "CHARACTER_IN_USE",
      );
    }
    await prisma.character.delete({ where: { id } });
    return { ok: true };
  }
}