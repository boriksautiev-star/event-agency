import { prisma } from "../../db/prisma";
import { AppError } from "../../utils/AppError";
import { CreateRateGroupInput, UpdateRateGroupInput } from "./rate-groups.schemas";

export class RateGroupsService {
  static async list(includeInactive = false) {
    return prisma.rateGroup.findMany({
      where: includeInactive ? undefined : { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: {
        _count: { select: { characters: true, rates: true } },
      },
    });
  }

  static async get(id: string) {
    const group = await prisma.rateGroup.findUnique({
      where: { id },
      include: {
        characters: { orderBy: [{ name: "asc" }] },
        _count: { select: { rates: true } },
      },
    });
    if (!group) throw new AppError("Группа не найдена", 404, "RATE_GROUP_NOT_FOUND");
    return group;
  }

  static async create(data: CreateRateGroupInput) {
    return prisma.rateGroup.create({ data });
  }

  static async update(id: string, data: UpdateRateGroupInput) {
    await this.get(id);
    return prisma.rateGroup.update({ where: { id }, data });
  }

  static async delete(id: string) {
    await this.get(id);
    const charsCount = await prisma.character.count({ where: { rateGroupId: id } });
    if (charsCount > 0) {
      throw new AppError(
        `В группе ${charsCount} персонаж(ей). Сначала переназначьте или удалите их, либо деактивируйте группу.`,
        400,
        "RATE_GROUP_HAS_CHARACTERS",
      );
    }
    await prisma.rateGroup.delete({ where: { id } });
    return { ok: true };
  }
}