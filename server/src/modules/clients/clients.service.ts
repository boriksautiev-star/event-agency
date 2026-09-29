import { prisma } from "../../db/prisma";
import { AppError } from "../../utils/AppError";
import {
  CreateClientInput,
  ListClientsQuery,
  UpdateClientInput,
} from "./clients.schemas";

export class ClientsService {
  static async list(query: ListClientsQuery, _userId: string) {
    const where: any = {};

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: "insensitive" } },
        { phone: { contains: query.search } },
        { email: { contains: query.search, mode: "insensitive" } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.client.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: query.limit,
        skip: query.offset,
      }),
      prisma.client.count({ where }),
    ]);

    return { items, total, limit: query.limit, offset: query.offset };
  }

  static async getById(id: string) {
    const client = await prisma.client.findUnique({ where: { id } });
    if (!client) throw new AppError("Клиент не найден", 404, "CLIENT_NOT_FOUND");
    return client;
  }

  static async create(data: CreateClientInput, createdBy: string) {
    return prisma.client.create({
      data: {
        name: data.name,
        phone: data.phone,
        email: data.email ?? null,
        address: data.address ?? null,
        notes: data.notes ?? null,
        createdBy,
      },
    });
  }

  static async update(id: string, data: UpdateClientInput) {
    await this.getById(id);
    return prisma.client.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.phone !== undefined ? { phone: data.phone } : {}),
        ...(data.email !== undefined ? { email: data.email } : {}),
        ...(data.address !== undefined ? { address: data.address } : {}),
        ...(data.notes !== undefined ? { notes: data.notes } : {}),
      },
    });
  }

  static async remove(id: string) {
    await this.getById(id);
    await prisma.client.delete({ where: { id } });
    return { ok: true };
  }
}
