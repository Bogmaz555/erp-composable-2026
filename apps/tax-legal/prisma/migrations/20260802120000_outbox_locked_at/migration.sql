-- Outbox multi-replica claim safety (Enterprise Q0 / KD-2)
-- lockedAt set on claim; reclaim by lock age. lockedBy = optional relay instance id.

ALTER TABLE "OutboxEvent" ADD COLUMN IF NOT EXISTS "lockedAt" TIMESTAMP(3);
ALTER TABLE "OutboxEvent" ADD COLUMN IF NOT EXISTS "lockedBy" TEXT;

CREATE INDEX IF NOT EXISTS "OutboxEvent_status_lockedAt_idx" ON "OutboxEvent"("status", "lockedAt");

