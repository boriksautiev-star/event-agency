/*
  Warnings:

  - You are about to drop the column `role_in_event` on the `order_animators` table. All the data in the column will be lost.
  - You are about to drop the `order_services` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `service_categories` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `service_price_options` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `services` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `character_name_snapshot` to the `order_slots` table without a default value. This is not possible if the table is not empty.
  - Added the required column `client_price` to the `order_slots` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "order_services" DROP CONSTRAINT "order_services_order_id_fkey";

-- DropForeignKey
ALTER TABLE "order_services" DROP CONSTRAINT "order_services_price_option_id_fkey";

-- DropForeignKey
ALTER TABLE "order_services" DROP CONSTRAINT "order_services_service_id_fkey";

-- DropForeignKey
ALTER TABLE "service_price_options" DROP CONSTRAINT "service_price_options_service_id_fkey";

-- DropForeignKey
ALTER TABLE "services" DROP CONSTRAINT "services_category_id_fkey";

-- AlterTable
ALTER TABLE "order_animators" DROP COLUMN "role_in_event";

-- AlterTable
ALTER TABLE "order_slots" ADD COLUMN     "character_name_snapshot" TEXT NOT NULL,
ADD COLUMN     "client_price" DECIMAL(12,2) NOT NULL,
ADD COLUMN     "is_custom_price" BOOLEAN NOT NULL DEFAULT false;

-- DropTable
DROP TABLE "order_services";

-- DropTable
DROP TABLE "service_categories";

-- DropTable
DROP TABLE "service_price_options";

-- DropTable
DROP TABLE "services";

-- DropEnum
DROP TYPE "EventRole";

-- CreateTable
CREATE TABLE "character_price_options" (
    "id" TEXT NOT NULL,
    "character_id" TEXT NOT NULL,
    "duration_min" INTEGER NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "character_price_options_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "character_price_options_character_id_idx" ON "character_price_options"("character_id");

-- CreateIndex
CREATE UNIQUE INDEX "character_price_options_character_id_duration_min_key" ON "character_price_options"("character_id", "duration_min");

-- AddForeignKey
ALTER TABLE "character_price_options" ADD CONSTRAINT "character_price_options_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
