import { prisma } from "../src/db/prisma";
import { runRemindersNow } from "../src/jobs/reminders.job";

runRemindersNow()
  .then(() => prisma.$disconnect())
  .catch((e) => { console.error(e); process.exit(1); });
