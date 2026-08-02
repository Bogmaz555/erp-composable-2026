-- Enterprise Q1: consumer idempotency ledger (E1.5)
CREATE TABLE IF NOT EXISTS "ProcessedEvent" (
    "eventId" TEXT NOT NULL,
    "consumer" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProcessedEvent_pkey" PRIMARY KEY ("eventId","consumer")
);

CREATE INDEX IF NOT EXISTS "ProcessedEvent_consumer_processedAt_idx" ON "ProcessedEvent"("consumer", "processedAt");
