/*
  Warnings:

  - You are about to drop the column `character_id` on the `order_animators` table. All the data in the column will be lost.
  - You are about to drop the column `rate_duration_minutes` on the `order_animators` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "order_animators" DROP CONSTRAINT "order_animators_character_id_fkey";

-- DropIndex
DROP INDEX "order_animators_character_id_idx";

-- AlterTable
ALTER TABLE "order_animators" DROP COLUMN "character_id",
DROP COLUMN "rate_duration_minutes",
ADD COLUMN     "slot_id" TEXT;

-- CreateTable
CREATE TABLE "order_slots" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "character_id" TEXT NOT NULL,
    "rate_duration_minutes" INTEGER NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_slots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "order_slots_order_id_idx" ON "order_slots"("order_id");

-- CreateIndex
CREATE INDEX "order_slots_character_id_idx" ON "order_slots"("character_id");

-- CreateIndex
CREATE INDEX "order_animators_slot_id_idx" ON "order_animators"("slot_id");

-- AddForeignKey
ALTER TABLE "order_slots" ADD CONSTRAINT "order_slots_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_slots" ADD CONSTRAINT "order_slots_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "characters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_animators" ADD CONSTRAINT "order_animators_slot_id_fkey" FOREIGN KEY ("slot_id") REFERENCES "order_slots"("id") ON DELETE SET NULL ON UPDATE CASCADE;
