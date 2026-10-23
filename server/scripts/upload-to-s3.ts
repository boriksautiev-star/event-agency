import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { S3Service } from "../src/modules/backups/s3.service";

const [backupLogId, filePath, fileName] = process.argv.slice(2);

if (!backupLogId || !filePath || !fileName) {
  console.error("Usage: npx tsx scripts/upload-to-s3.ts <backupLogId> <filePath> <fileName>");
  process.exit(1);
}

(async () => {
  const p = new PrismaClient();
  try {
    const results = await S3Service.uploadToAllTargets(filePath, fileName);
    await p.backupLog.update({
      where: { id: backupLogId },
      data: { cloudStatus: JSON.stringify(results) },
    });
    console.log("[upload-to-s3] Processed " + results.length + " target(s)");
    for (const r of results) {
      console.log("  [" + r.status + "] " + r.name + ": " + (r.url || r.error));
    }
    process.exit(0);
  } catch (e: any) {
    console.error("[upload-to-s3] Failed:", e?.message || String(e));
    process.exit(1);
  } finally {
    await p.$disconnect();
  }
})();
