-- CreateEnum
CREATE TYPE "HandoverRequestStatus" AS ENUM ('pending_receiver', 'pending_approval', 'approved', 'rejected_by_receiver', 'rejected_by_admin', 'cancelled');

-- CreateTable
CREATE TABLE "handover_requests" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "slot_id" TEXT NOT NULL,
    "from_animator_id" TEXT NOT NULL,
    "to_animator_id" TEXT NOT NULL,
    "comment" TEXT,
    "status" "HandoverRequestStatus" NOT NULL DEFAULT 'pending_receiver',
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "accepted_at" TIMESTAMP(3),
    "resolved_at" TIMESTAMP(3),
    "resolved_by" TEXT,
    "reject_comment" TEXT,

    CONSTRAINT "handover_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "handover_requests_status_idx" ON "handover_requests"("status");

-- CreateIndex
CREATE INDEX "handover_requests_order_id_idx" ON "handover_requests"("order_id");

-- CreateIndex
CREATE INDEX "handover_requests_from_animator_id_status_idx" ON "handover_requests"("from_animator_id", "status");

-- CreateIndex
CREATE INDEX "handover_requests_to_animator_id_status_idx" ON "handover_requests"("to_animator_id", "status");

-- AddForeignKey
ALTER TABLE "handover_requests" ADD CONSTRAINT "handover_requests_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "handover_requests" ADD CONSTRAINT "handover_requests_slot_id_fkey" FOREIGN KEY ("slot_id") REFERENCES "order_slots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "handover_requests" ADD CONSTRAINT "handover_requests_from_animator_id_fkey" FOREIGN KEY ("from_animator_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "handover_requests" ADD CONSTRAINT "handover_requests_to_animator_id_fkey" FOREIGN KEY ("to_animator_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
