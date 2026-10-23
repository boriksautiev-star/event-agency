import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import { prisma } from "../../db/prisma";
import { AppError } from "../../utils/AppError";
import { verifyPassword } from "../../utils/password";
import { S3Service } from "./s3.service";

const SERVER_DIR = path.resolve(__dirname, "../../..");
const BACKUP_THRESHOLD_HOURS = 25;

async function getBackupDir(): Promise<string> {
  const settings = await prisma.agencySettings.findFirst();
  const dbDir = settings?.backupDir;
  const envDir = dbDir || process.env.BACKUP_DIR || "./backups";
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
      backupDir: (await getBackupDir()),
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

    const backupDir = (await getBackupDir());
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
  static async getStorageSettings() {
    const settings = await prisma.agencySettings.findFirst();
    const backupDir = await getBackupDir();
    const s3Targets = await S3Service.listMasked();
    return { backupDir, s3Targets };
  }

  static async updateBackupDir(newDir: string) {
    if (!newDir || typeof newDir !== "string") throw new AppError("Путь не указан", 400);
    const absDir = path.isAbsolute(newDir) ? newDir : path.join(SERVER_DIR, newDir);
    if (!fs.existsSync(absDir)) {
      try { fs.mkdirSync(absDir, { recursive: true }); }
      catch (e: any) { throw new AppError("Не удалось создать папку: " + e.message, 400); }
    }
    // Проверка прав записи
    const testFile = path.join(absDir, ".write-test-" + Date.now());
    try {
      fs.writeFileSync(testFile, "test");
      fs.unlinkSync(testFile);
    } catch (e: any) {
      throw new AppError("Нет прав на запись в папку: " + e.message, 400);
    }
    const settings = await prisma.agencySettings.findFirst();
    if (!settings) throw new AppError("AgencySettings not found", 500);
    await prisma.agencySettings.update({
      where: { id: settings.id },
      data: { backupDir: newDir },
    });
    return { ok: true, backupDir: absDir };
  }

  static async browseDir(dirPath: string | null): Promise<{
    currentPath: string | null;
    parent: string | null;
    roots: { name: string; path: string }[];
    items: { name: string; path: string }[];
  }> {
    // Без пути — список корневых дисков Windows
    if (!dirPath) {
      const roots: { name: string; path: string }[] = [];
      for (const letter of "CDEFGHIJKLMNOPQRSTUVWXYZ") {
        const p = letter + ":\\";
        try {
          if (fs.existsSync(p)) {
            fs.readdirSync(p);
            roots.push({ name: letter + ":", path: p });
          }
        } catch {}
      }
      return { currentPath: null, parent: null, roots, items: [] };
    }

    const absPath = path.resolve(dirPath);
    if (!fs.existsSync(absPath)) throw new AppError("Папка не найдена", 404, "NOT_FOUND");
    if (!fs.statSync(absPath).isDirectory()) throw new AppError("Это файл, не папка", 400, "NOT_DIR");

    const entries = fs.readdirSync(absPath, { withFileTypes: true });
    const items = entries
      .filter((e) => e.isDirectory())
      .map((e) => ({ name: e.name, path: path.join(absPath, e.name) }))
      .sort((a, b) => a.name.localeCompare(b.name));

    const parentPath = path.dirname(absPath);
    const parent = parentPath === absPath ? null : parentPath;

    return { currentPath: absPath, parent, roots: [], items };
  }
}
