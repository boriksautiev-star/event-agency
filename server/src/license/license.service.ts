import fs from "fs";
import path from "path";
import jwt from "jsonwebtoken";
import { prisma } from "../db/prisma";

const PUBLIC_KEY = fs.readFileSync(path.join(__dirname, "public.pem"), "utf8");

export type LicenseStatus = "active" | "expiring" | "grace" | "expired" | "invalid" | "none";

export type LicenseInfo = {
  status: LicenseStatus;
  agencyName: string | null;
  expiresAt: string | null;
  daysLeft: number | null;
  reason: string | null;
};

export class LicenseService {
  static async getStatus(): Promise<LicenseInfo> {
    const settings = await prisma.agencySettings.findFirst();
    const now = new Date();
    
    // Защита от отката времени
    if (settings?.lastSeenAt && now < settings.lastSeenAt) {
      return { status: "invalid", agencyName: null, expiresAt: null, daysLeft: null, reason: "Обнаружен откат системного времени" };
    }
    
    // Обновляем lastSeenAt (только если время идет вперед)
    if (!settings?.lastSeenAt || now > settings.lastSeenAt) {
      await prisma.agencySettings.updateMany({ data: { lastSeenAt: now } });
    }

    const licensePath = path.join(process.cwd(), "license.key");
    if (!fs.existsSync(licensePath)) {
      return { status: "none", agencyName: null, expiresAt: null, daysLeft: null, reason: "Файл лицензии не найден" };
    }

    const token = fs.readFileSync(licensePath, "utf8").trim();
    try {
      const payload = jwt.verify(token, PUBLIC_KEY, { algorithms: ["RS256"] }) as any;
      const expiresAt = new Date(payload.expiresAt);
      const diffMs = expiresAt.getTime() - now.getTime();
      const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      let status: LicenseStatus = "active";
      let reason: string | null = null;

      if (daysLeft < 0) {
        if (daysLeft >= -10) {
          status = "grace";
          reason = `Лицензия истекла. Осталось ${10 + daysLeft} дн. льготного периода.`;
        } else {
          status = "expired";
          reason = "Лицензия истекла. Создание новых заказов заблокировано.";
        }
      } else if (daysLeft <= 30) {
        status = "expiring";
        reason = `Лицензия истекает через ${daysLeft} дн.`;
      }

      return { status, agencyName: payload.agencyName, expiresAt: payload.expiresAt, daysLeft, reason };
    } catch (e: any) {
      return { status: "invalid", agencyName: null, expiresAt: null, daysLeft: null, reason: "Неверная подпись лицензии" };
    }
  }

  static async uploadLicense(token: string) {
    try {
      jwt.verify(token, PUBLIC_KEY, { algorithms: ["RS256"] });
      const licensePath = path.join(process.cwd(), "license.key");
      fs.writeFileSync(licensePath, token, "utf8");
      return { ok: true };
    } catch {
      throw new Error("Неверная подпись лицензии");
    }
  }
}
