-- CreateEnum
CREATE TYPE "PayoutSource" AS ENUM ('rate_matrix', 'manual');

-- AlterTable
ALTER TABLE "order_animators" ADD COLUMN     "character_id" TEXT,
ADD COLUMN     "payout_source" "PayoutSource" NOT NULL DEFAULT 'manual',
ADD COLUMN     "rate_duration_minutes" INTEGER;

-- CreateTable
CREATE TABLE "rate_groups" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rate_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "characters" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rate_group_id" TEXT NOT NULL,
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "characters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rates" (
    "id" TEXT NOT NULL,
    "animator_id" TEXT NOT NULL,
    "rate_group_id" TEXT NOT NULL,
    "duration_min" INTEGER NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "rate_groups_name_key" ON "rate_groups"("name");

-- CreateIndex
CREATE INDEX "characters_rate_group_id_idx" ON "characters"("rate_group_id");

-- CreateIndex
CREATE INDEX "characters_name_idx" ON "characters"("name");

-- CreateIndex
CREATE INDEX "rates_rate_group_id_duration_min_idx" ON "rates"("rate_group_id", "duration_min");

-- CreateIndex
CREATE INDEX "rates_animator_id_idx" ON "rates"("animator_id");

-- CreateIndex
CREATE UNIQUE INDEX "rates_animator_id_rate_group_id_duration_min_key" ON "rates"("animator_id", "rate_group_id", "duration_min");

-- CreateIndex
CREATE INDEX "order_animators_character_id_idx" ON "order_animators"("character_id");

-- CreateIndex
CREATE INDEX "order_animators_payout_source_payout_paid_at_idx" ON "order_animators"("payout_source", "payout_paid_at");

-- AddForeignKey
ALTER TABLE "characters" ADD CONSTRAINT "characters_rate_group_id_fkey" FOREIGN KEY ("rate_group_id") REFERENCES "rate_groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rates" ADD CONSTRAINT "rates_animator_id_fkey" FOREIGN KEY ("animator_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rates" ADD CONSTRAINT "rates_rate_group_id_fkey" FOREIGN KEY ("rate_group_id") REFERENCES "rate_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_animators" ADD CONSTRAINT "order_animators_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "characters"("id") ON DELETE SET NULL ON UPDATE CASCADE;
