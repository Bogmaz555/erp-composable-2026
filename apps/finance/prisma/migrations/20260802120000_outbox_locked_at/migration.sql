-- Outbox multi-replica claim safety (Enterprise Q0 / E0.2)
ALTER TABLE "OutboxEvent" ADD COLUMN IF NOT EXISTS "lockedAt" TIMESTAMP(3);
ALTER TABLE "OutboxEvent" ADD COLUMN IF NOT EXISTS "lockedBy" TEXT;
CREATE INDEX IF NOT EXISTS "OutboxEvent_status_lockedAt_idx" ON "OutboxEvent"("status", "lockedAt");
