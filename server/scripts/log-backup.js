const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

const [fileName, filePath, sizeBytesStr, status, errorMsg, durationMsStr, triggeredBy] = process.argv.slice(2);

if (!fileName || !filePath || !sizeBytesStr || !status) {
  console.error("Usage: node log-backup.js <fileName> <filePath> <sizeBytes> <status> [errorMsg] [durationMs] [triggeredBy]");
  process.exit(1);
}

(async () => {
  try {
    const log = await p.backupLog.create({
      data: {
        fileName,
        filePath,
        sizeBytes: parseInt(sizeBytesStr, 10) || 0,
        status,
        errorMsg: errorMsg && errorMsg !== "-" ? errorMsg : null,
        durationMs: durationMsStr ? parseInt(durationMsStr, 10) : null,
        triggeredBy: triggeredBy || "manual",
      },
    });
    process.stdout.write(log.id);
  } catch (e) {
    console.error("[log-backup] Failed:", e.message);
    process.exit(1);
  } finally {
    await p.$disconnect();
  }
})();
