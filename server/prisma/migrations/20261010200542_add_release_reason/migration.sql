-- CreateEnum
CREATE TYPE "ReleaseReason" AS ENUM ('declined', 'handed_over', 'removed_rotation', 'removed_quality', 'order_cancelled');

-- AlterTable
ALTER TABLE "order_animators" ADD COLUMN     "release_comment" TEXT,
ADD COLUMN     "release_reason" "ReleaseReason",
ADD COLUMN     "released_at" TIMESTAMP(3);
