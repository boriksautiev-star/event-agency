/*
  Warnings:

  - The values [none,agency_both,client_both,split,custom] on the enum `TransportPolicy` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "TransportPolicy_new" AS ENUM ('agency_pays', 'client_one_way', 'client_both_ways');
ALTER TABLE "order_animators" ALTER COLUMN "transport_paid_by" DROP DEFAULT;
ALTER TABLE "orders" ALTER COLUMN "transport_policy" DROP DEFAULT;
ALTER TABLE "orders" ALTER COLUMN "transport_policy" TYPE "TransportPolicy_new" USING ("transport_policy"::text::"TransportPolicy_new");
ALTER TABLE "order_animators" ALTER COLUMN "transport_paid_by" TYPE "TransportPolicy_new" USING ("transport_paid_by"::text::"TransportPolicy_new");
ALTER TYPE "TransportPolicy" RENAME TO "TransportPolicy_old";
ALTER TYPE "TransportPolicy_new" RENAME TO "TransportPolicy";
DROP TYPE "TransportPolicy_old";
ALTER TABLE "order_animators" ALTER COLUMN "transport_paid_by" SET DEFAULT 'client_one_way';
ALTER TABLE "orders" ALTER COLUMN "transport_policy" SET DEFAULT 'client_one_way';
COMMIT;

-- AlterTable
ALTER TABLE "order_animators" ALTER COLUMN "transport_paid_by" SET DEFAULT 'client_one_way';

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "prepayment_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "prepayment_paid_at" TIMESTAMP(3),
ALTER COLUMN "transport_policy" SET DEFAULT 'client_one_way';

-- CreateTable
CREATE TABLE "order_changes" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "changed_by" TEXT NOT NULL,
    "changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "field" TEXT NOT NULL,
    "old_value" TEXT,
    "new_value" TEXT,
    "summary" TEXT,

    CONSTRAINT "order_changes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "order_changes_order_id_idx" ON "order_changes"("order_id");

-- AddForeignKey
ALTER TABLE "order_changes" ADD CONSTRAINT "order_changes_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_changes" ADD CONSTRAINT "order_changes_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
