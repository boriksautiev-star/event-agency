/*
  Warnings:

  - You are about to drop the `rates` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "rates" DROP CONSTRAINT "rates_animator_id_fkey";

-- DropForeignKey
ALTER TABLE "rates" DROP CONSTRAINT "rates_rate_group_id_fkey";

-- DropTable
DROP TABLE "rates";
