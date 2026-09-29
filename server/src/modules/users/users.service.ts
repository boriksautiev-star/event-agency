import { prisma } from "../../db/prisma";
import { AppError } from "../../utils/AppError";
import { hashPassword } from "../../utils/password";
import { publicUser } from "../../utils/publicUser";
import {
  CreateUserInput,
  ListUsersQuery,
  UpdatePasswordInput,
  UpdatePushTokenInput,
  UpdateUserInput,
} from "./users.schemas";

export class UsersService {
  static async list(query: ListUsersQuery) {
    const where: any = {};
    if (query.role) where.role = query.role;
    if (query.status) where.status = query.status;
    if (query.search) {
      where.OR = [
        { firstName: { contains: query.search, mode: "insensitive" } },
        { lastName: { contains: query.search, mode: "insensitive" } },
        { phone: { contains: query.search } },
        { email: { contains: query.search, mode: "insensitive" } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: "asc" },
        take: query.limit,
        skip: query.offset,
      }),
      prisma.user.count({ where }),
    ]);

    return {
      items: items.map(publicUser),
      total,
      limit: query.limit,
      offset: query.offset,
    };
  }

  static async getById(id: string) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw new AppError("Пользователь не найден", 404, "USER_NOT_FOUND");
    return publicUser(user);
  }

  static async create(data: CreateUserInput) {
    const existing = await prisma.user.findUnique({ where: { phone: data.phone } });
    if (existing) throw new AppError("Телефон уже занят", 409, "PHONE_TAKEN");

    if (data.email) {
      const emailTaken = await prisma.user.findUnique({ where: { email: data.email } });
      if (emailTaken) throw new AppError("Email уже занят", 409, "EMAIL_TAKEN");
    }

    const passwordHash = await hashPassword(data.password);

    const user = await prisma.user.create({
      data: {
        role: data.role as any,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        email: data.email ?? null,
        passwordHash,
        status: "active",
      },
    });

    return publicUser(user);
  }

  static async update(id: string, data: UpdateUserInput) {
    await this.getById(id);

    const updateData: any = {};
    if (data.firstName !== undefined) updateData.firstName = data.firstName;
    if (data.lastName !== undefined) updateData.lastName = data.lastName;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.status !== undefined) updateData.status = data.status;

    const user = await prisma.user.update({ where: { id }, data: updateData });
    return publicUser(user);
  }

  static async updatePassword(id: string, data: UpdatePasswordInput) {
    await this.getById(id);
    const passwordHash = await hashPassword(data.password);
    const user = await prisma.user.update({
      where: { id },
      data: { passwordHash },
    });
    return publicUser(user);
  }

  static async updatePushToken(id: string, data: UpdatePushTokenInput) {
    await this.getById(id);
    const user = await prisma.user.update({
      where: { id },
      data: { expoPushToken: data.expoPushToken },
    });
    return publicUser(user);
  }

  static async remove(id: string) {
    await this.getById(id);
    await prisma.user.update({
      where: { id },
      data: { status: "blocked" },
    });
    return { ok: true };
  }
}
