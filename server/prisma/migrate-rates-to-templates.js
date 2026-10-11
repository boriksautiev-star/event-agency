const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("=== Migration: Rate → RateTemplate ===\n");

  // Все аниматоры с непустым Rate
  const animators = await prisma.user.findMany({
    where: {
      role: "animator",
      rates: { some: {} },
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      rateTemplateId: true,
      rates: {
        select: {
          rateGroupId: true,
          durationMin: true,
          amount: true,
        },
      },
    },
  });

  console.log(`Found ${animators.length} animator(s) with rates\n`);

  let created = 0;
  let skipped = 0;

  for (const a of animators) {
    if (a.rateTemplateId) {
      console.log(`  SKIP ${a.firstName} ${a.lastName} — уже привязан к шаблону`);
      skipped++;
      continue;
    }

    // Формируем уникальное имя
    let name = `Персональные ставки ${a.firstName} ${a.lastName}`;
    const existing = await prisma.rateTemplate.findUnique({ where: { name } });
    if (existing) {
      name = `${name} (${a.id.slice(0, 4)})`;
    }

    await prisma.$transaction(async (tx) => {
      const tpl = await tx.rateTemplate.create({
        data: {
          name,
          notes: "Автомиграция из персональных ставок аниматора",
        },
      });

      await tx.user.update({
        where: { id: a.id },
        data: { rateTemplateId: tpl.id },
      });

      await tx.rateTemplateRate.createMany({
        data: a.rates.map((r) => ({
          templateId: tpl.id,
          rateGroupId: r.rateGroupId,
          durationMin: r.durationMin,
          amount: r.amount,
        })),
      });
    });

    console.log(`  OK   ${a.firstName} ${a.lastName} — создан "${name}" (${a.rates.length} ставок)`);
    created++;
  }

  console.log(`\nCreated: ${created}, Skipped: ${skipped}`);

  // Проверка целостности
  console.log("\n=== Verification ===");
  const rateCount = await prisma.rate.count();
  const templateRateCount = await prisma.rateTemplateRate.count();
  const templateCount = await prisma.rateTemplate.count();
  const animatorsWithTemplate = await prisma.user.count({
    where: { role: "animator", rateTemplateId: { not: null } },
  });
  const animatorsTotal = await prisma.user.count({ where: { role: "animator" } });

  console.log(`  Rate rows:               ${rateCount}`);
  console.log(`  RateTemplateRate rows:   ${templateRateCount}`);
  console.log(`  RateTemplate count:      ${templateCount}`);
  console.log(`  Animators with template: ${animatorsWithTemplate} / ${animatorsTotal}`);

  if (rateCount === templateRateCount) {
    console.log("\n✅ OK: количество строк совпадает");
  } else {
    console.log(`\n⚠️  ВНИМАНИЕ: несовпадение — Rate=${rateCount}, TemplateRate=${templateRateCount}`);
  }
}

main()
  .catch((e) => {
    console.error("ОШИБКА:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());