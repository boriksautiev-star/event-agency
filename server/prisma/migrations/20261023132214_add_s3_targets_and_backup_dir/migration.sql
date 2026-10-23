-- AlterTable
ALTER TABLE "agency_settings" ADD COLUMN     "backup_dir" TEXT,
ADD COLUMN     "s3_targets" JSONB;

-- AlterTable
ALTER TABLE "backup_logs" ADD COLUMN     "cloud_status" TEXT;
