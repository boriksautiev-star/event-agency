const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const orders = await prisma.order.findMany({
    where: {
      OR: [
        { prepaymentPaidAt: { not: null } },
        { finalPaymentReceivedAt: { not: null } },
      ],
    },
  });

  let created = 0;

  for (const o of orders) {
    if (o.prepaymentPaidAt && Number(o.prepaymentAmount) > 0) {
      const exists = await prisma.orderPayment.findFirst({
        where: { orderId: o.id, type: "prepayment" },
      });
      if (!exists) {
        await prisma.orderPayment.create({
          data: {
            orderId: o.id,
            type: "prepayment",
            amount: o.prepaymentAmount,
            method: "transfer",
            paidAt: o.prepaymentPaidAt,
            comment: "backfill",
          },
        });
        created++;
      }
    }
    if (o.finalPaymentReceivedAt && Number(o.finalPaymentAmount) > 0) {
      const exists = await prisma.orderPayment.findFirst({
        where: { orderId: o.id, type: "final" },
      });
      if (!exists) {
        await prisma.orderPayment.create({
          data: {
            orderId: o.id,
            type: "final",
            amount: o.finalPaymentAmount,
            method: o.finalPaymentMethod || "transfer",
            paidAt: o.finalPaymentReceivedAt,
            createdBy: o.finalPaymentReceivedBy,
            comment: "backfill",
          },
        });
        created++;
      }
    }
  }

  console.log(`Backfill done. Created ${created} payments.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());