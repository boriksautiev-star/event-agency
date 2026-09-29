import { createHash } from "crypto";
import { prisma } from "../../db/prisma";
import { AppError } from "../../utils/AppError";
import { verifyPassword } from "../../utils/password";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../../utils/jwt";
import { publicUser } from "../../utils/publicUser";
import { LoginInput, RefreshInput } from "./auth.schemas";
import { Role } from "@event-agency/shared";

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function refreshExpiryDate(): Date {
  return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
}

export class AuthService {
  static async login(data: LoginInput) {
    const user = await prisma.user.findUnique({ where: { phone: data.phone } });
    if (!user) throw new AppError("Неверный телефон или пароль", 401, "BAD_CREDENTIALS");
    if (user.status !== "active") throw new AppError("Пользователь заблокирован", 403, "BLOCKED");

    const ok = await verifyPassword(data.password, user.passwordHash);
    if (!ok) throw new AppError("Неверный телефон или пароль", 401, "BAD_CREDENTIALS");

    const payload = { sub: user.id, role: user.role as Role };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(refreshToken),
        expiresAt: refreshExpiryDate(),
      },
    });

    return { user: publicUser(user), accessToken, refreshToken };
  }

  static async refresh(data: RefreshInput) {
    let payload;
    try {
      payload = verifyRefreshToken(data.refreshToken);
    } catch {
      throw new AppError("Недействительный refresh-токен", 401, "BAD_REFRESH");
    }

    const stored = await prisma.refreshToken.findFirst({
      where: {
        userId: payload.sub,
        tokenHash: hashToken(data.refreshToken),
        expiresAt: { gt: new Date() },
      },
    });
    if (!stored) throw new AppError("Refresh-токен не найден", 401, "REFRESH_NOT_FOUND");

    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || user.status !== "active") {
      throw new AppError("Пользователь недоступен", 401, "USER_UNAVAILABLE");
    }

    // Ротация: удаляем старый, выдаём новый
    await prisma.refreshToken.delete({ where: { id: stored.id } });

    const newPayload = { sub: user.id, role: user.role as Role };
    const accessToken = signAccessToken(newPayload);
    const refreshToken = signRefreshToken(newPayload);

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(refreshToken),
        expiresAt: refreshExpiryDate(),
      },
    });

    return { user: publicUser(user), accessToken, refreshToken };
  }

  static async logout(userId: string, refreshToken?: string) {
    if (refreshToken) {
      await prisma.refreshToken.deleteMany({
        where: { userId, tokenHash: hashToken(refreshToken) },
      });
    } else {
      await prisma.refreshToken.deleteMany({ where: { userId } });
    }
    return { ok: true };
  }

  static async me(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError("Пользователь не найден", 404, "USER_NOT_FOUND");
    return publicUser(user);
  }
}
