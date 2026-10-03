-- CreateEnum
CREATE TYPE "AdminCompensationType" AS ENUM ('percent', 'fixed');

-- CreateEnum
CREATE TYPE "AdminAccrualStatus" AS ENUM ('active', 'cancelled');

-- CreateTable
CREATE TABLE "admin_compensations" (
    "id" TEXT NOT NULL,
    "admin_id" TEXT NOT NULL,
    "type" "AdminCompensationType" NOT NULL,
    "percent_value" INTEGER,
    "fixed_amount" DECIMAL(12,2),
    "effective_from" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_compensations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_accruals" (
    "id" TEXT NOT NULL,
    "admin_id" TEXT NOT NULL,
    "order_id" TEXT,
    "type" "AdminCompensationType" NOT NULL,
    "base_amount" DECIMAL(12,2) NOT NULL,
    "percent_value" INTEGER,
    "amount" DECIMAL(12,2) NOT NULL,
    "period_from" TIMESTAMP(3),
    "period_to" TIMESTAMP(3),
    "status" "AdminAccrualStatus" NOT NULL DEFAULT 'active',
    "comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_accruals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_payments" (
    "id" TEXT NOT NULL,
    "admin_id" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "paid_at" TIMESTAMP(3) NOT NULL,
    "comment" TEXT,
    "expense_id" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "admin_compensations_admin_id_effective_from_idx" ON "admin_compensations"("admin_id", "effective_from");

-- CreateIndex
CREATE INDEX "admin_accruals_admin_id_status_idx" ON "admin_accruals"("admin_id", "status");

-- CreateIndex
CREATE INDEX "admin_accruals_order_id_idx" ON "admin_accruals"("order_id");

-- CreateIndex
CREATE INDEX "admin_payments_admin_id_paid_at_idx" ON "admin_payments"("admin_id", "paid_at");

-- AddForeignKey
ALTER TABLE "admin_compensations" ADD CONSTRAINT "admin_compensations_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_accruals" ADD CONSTRAINT "admin_accruals_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_accruals" ADD CONSTRAINT "admin_accruals_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_payments" ADD CONSTRAINT "admin_payments_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_payments" ADD CONSTRAINT "admin_payments_expense_id_fkey" FOREIGN KEY ("expense_id") REFERENCES "expenses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
