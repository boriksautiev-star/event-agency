-- CreateTable
CREATE TABLE "backup_logs" (
    "id" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_path" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL,
    "error_msg" TEXT,
    "duration_ms" INTEGER,
    "triggered_by" TEXT NOT NULL DEFAULT 'manual',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "backup_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "backup_logs_created_at_idx" ON "backup_logs"("created_at");
