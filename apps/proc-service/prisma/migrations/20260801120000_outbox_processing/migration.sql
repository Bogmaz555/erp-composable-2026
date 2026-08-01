-- Outbox schema alignment: PROCESSING status + attempts/lastError
-- Thin migration; safe for empty/dev DBs and additive on existing.

-- AlterEnum: add PROCESSING (PostgreSQL)
ALTER TYPE "OutboxStatus" ADD VALUE IF NOT EXISTS 'PROCESSING';
