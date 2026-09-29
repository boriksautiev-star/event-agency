import { prisma } from "../../db/prisma";
import { AppError } from "../../utils/AppError";
import { hashPassword } from "../../utils/password";
import { publicUser } from "../../utils/publicUser";
import { SetupInput } from "./setup.schemas";

export class SetupService {
  static async isSetup(): Promise<boolean> {
    const count = await prisma.user.count();
    return count > 0;
  }

  static async setup(data: SetupInput) {
    if (await this.isSetup()) {
      throw new AppError("Система уже настроена", 409, "ALREADY_SETUP");
    }

    const passwordHash = await hashPassword(data.password);

    const user = await prisma.user.create({
      data: {
        role: "director",
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        email: data.email ?? null,
        passwordHash,
        status: "active",
      },
    });

    await prisma.appSetting.createMany({
      data: [
        { key: "app.name", value: data.agencyName },
        { key: "app.timezone", value: data.timezone },
        { key: "app.currency", value: data.currency },
      ],
      skipDuplicates: true,
    });

    return { user: publicUser(user) };
  }
}
