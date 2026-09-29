-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('transfer', 'cash');

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "final_payment_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "final_payment_handed_at" TIMESTAMP(3),
ADD COLUMN     "final_payment_handed_by" TEXT,
ADD COLUMN     "final_payment_method" "PaymentMethod",
ADD COLUMN     "final_payment_received_at" TIMESTAMP(3),
ADD COLUMN     "final_payment_received_by" TEXT;
