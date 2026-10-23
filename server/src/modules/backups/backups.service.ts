import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import { prisma } from "../../db/prisma";
import { AppError } from "../../utils/AppError";
import { verifyPassword } from "../../utils/password";

const SERVER_DIR = path.resolve(__dirname, "../../..");
const BACKUP_THRESHOLD_HOURS = 25;

function getBackupDir(): string {
  const envDir = process.env.BACKUP_DIR || "./backups";
  return path.isAbsolute(envDir) ? envDir : path.join(SERVER_DIR, envDir);
}

function runPowerShellScript(scriptName: string, args: string[]): Promise<{ code: number; output: string }> {
  return new Promise((resolve) => {
    const scriptPath = path.join(SERVER_DIR, "scripts", scriptName);
    const allArgs = ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", scriptPath, ...args];
    const child = spawn("powershell.exe", allArgs, { cwd: SERVER_DIR });
    let output = "";
    child.stdout.on("data", (d) => { output += d.toString(); });
    child.stderr.on("data", (d) => { output += d.toString(); });
    child.on("close", (code) => resolve({ code: code ?? -1, output }));
    child.on("error", (e) => resolve({ code: -1, output: e.message }));
  });
}

export type BackupListItem = {
  id: string;
  fileName: string;
  filePath: string;
  sizeBytes: number;
  status: string;
  triggeredBy: string;
  createdAt: string;
  fileExists: boolean;
};

export class BackupsService {
  static async list(limit = 50): Promise<BackupListItem[]> {
    const logs = await prisma.backupLog.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return logs.map((l) => ({
      id: l.id,
      fileName: l.fileName,
      filePath: l.filePath,
      sizeBytes: l.sizeBytes,
      status: l.status,
      triggeredBy: l.triggeredBy,
      createdAt: l.createdAt.toISOString(),
      fileExists: fs.existsSync(l.filePath),
    }));
  }

  static async getStatus() {
    const lastSuccess = await prisma.backupLog.findFirst({
      where: { status: "success" },
      orderBy: { createdAt: "desc" },
    });
    const lastFail = await prisma.backupLog.findFirst({
      where: { status: "failed" },
      orderBy: { createdAt: "desc" },
    });
    const now = Date.now();
    const ageHours = lastSuccess ? (now - lastSuccess.createdAt.getTime()) / (1000 * 60 * 60) : null;
    const isStale = !lastSuccess || (ageHours !== null && ageHours > BACKUP_THRESHOLD_HOURS);
    return {
      lastSuccessAt: lastSuccess ? lastSuccess.createdAt.toISOString() : null,
      lastSuccessFile: lastSuccess ? lastSuccess.fileName : null,
      lastSuccessSize: lastSuccess ? lastSuccess.sizeBytes : null,
      lastFailAt: lastFail ? lastFail.createdAt.toISOString() : null,
      lastFailError: lastFail ? lastFail.errorMsg : null,
      ageHours: ageHours !== null ? Math.round(ageHours * 10) / 10 : null,
      isStale,
      thresholdHours: BACKUP_THRESHOLD_HOURS,
      backupDir: getBackupDir(),
    };
  }

  static async createNow(userId: string) {
    const res = await runPowerShellScript("backup-db.ps1", ["-TriggeredBy", "manual"]);
    if (res.code !== 0) {
      throw new AppError("Не удалось создать бэкап: " + res.output.slice(-500), 500, "BACKUP_FAILED");
    }
    const log = await prisma.backupLog.findFirst({ orderBy: { createdAt: "desc" } });
    return { ok: true, log };
  }

  static async prepareRestore(userId: string, password: string, fileName: string) {
    if (!password || password.length < 1) {
      throw new AppError("Введите пароль", 400, "PASSWORD_REQUIRED");
    }
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError("Пользователь не найден", 404);
    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) throw new AppError("Неверный пароль", 403, "INVALID_PASSWORD");

    const backupDir = getBackupDir();
    const filePath = path.join(backupDir, fileName);
    if (!fs.existsSync(filePath)) {
      throw new AppError("Файл бэкапа не найден на диске: " + fileName, 404, "FILE_NOT_FOUND");
    }

    // Safety backup через сервис бэкапа
    const safetyRes = await runPowerShellScript("backup-db.ps1", ["-Label", "pre-restore", "-TriggeredBy", "pre-restore"]);
    if (safetyRes.code !== 0) {
      throw new AppError("Не удалось создать safety-бэкап: " + safetyRes.output.slice(-300), 500, "SAFETY_BACKUP_FAILED");
    }

    const command = "cd " + SERVER_DIR + "; npm run db:restore -- \"" + filePath + "\"";
    return {
      ok: true,
      command,
      filePath,
      message: "Safety-бэкап создан. Выполните команду на сервере (PowerShell):",
    };
  }
}
