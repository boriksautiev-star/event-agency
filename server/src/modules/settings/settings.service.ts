import { prisma } from "../../db/prisma";
import { AppError } from "../../utils/AppError";
import { UpdateSettingsInput } from "./settings.schemas";

const DEFAULTS = {
  id: 1,
  name: "Event Agency",
  timezone: "Europe/Moscow",
  currency: "RUB",
  defaultPrepaymentPercent: 30,
};

export class SettingsService {
  static async get() {
    return prisma.agencySettings.upsert({
      where: { id: 1 },
      update: {},
      create: DEFAULTS,
    });
  }

  static async update(data: UpdateSettingsInput) {
    if (data.name !== undefined && data.name.trim().length < 1) {
      throw new AppError("Название не может быть пустым", 422, "INVALID_NAME");
    }
    if (data.timezone !== undefined && data.timezone.trim().length < 1) {
      throw new AppError("Часовой пояс не может быть пустым", 422, "INVALID_TIMEZONE");
    }
    if (data.currency !== undefined && data.currency.trim().length < 1) {
      throw new AppError("Валюта не может быть пустой", 422, "INVALID_CURRENCY");
    }
    if (
      data.defaultPrepaymentPercent !== undefined &&
      (!Number.isInteger(data.defaultPrepaymentPercent) ||
        data.defaultPrepaymentPercent < 0 ||
        data.defaultPrepaymentPercent > 100)
    ) {
      throw new AppError(
        "Процент предоплаты — целое число от 0 до 100",
        422,
        "INVALID_PREPAYMENT_PERCENT",
      );
    }
    if (
      data.email !== undefined &&
      data.email !== null &&
      data.email.trim().length > 0
    ) {
      const e = data.email.trim();
      const at = e.indexOf("@");
      const dot = e.lastIndexOf(".");
      if (at < 1 || dot < at + 2 || dot === e.length - 1) {
        throw new AppError("Некорректный email", 422, "INVALID_EMAIL");
      }
    }

    await this.get();

    const update: any = {};
    const keys: (keyof UpdateSettingsInput)[] = [
      "name",
      "legalName",
      "inn",
      "phone",
      "email",
      "address",
      "website",
      "timezone",
      "currency",
      "paymentDetails",
      "logoUrl",
      "defaultPrepaymentPercent",
    ];
    for (const k of keys) {
      if (data[k] !== undefined) update[k] = data[k];
    }

    return prisma.agencySettings.update({ where: { id: 1 }, data: update });
  }
}
