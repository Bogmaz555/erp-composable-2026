-- Outbox multi-replica claim safety: lockedAt set on claim; reclaim by lock age (Enterprise Q0 / KD-2)
-- Additive: nullable DateTime; existing PROCESSING rows keep lockedAt null (reclaim falls back to createdAt until next claim).

ALTER TABLE "OutboxEvent" ADD COLUMN IF NOT EXISTS "lockedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "OutboxEvent_status_lockedAt_idx" ON "OutboxEvent"("status", "lockedAt");

