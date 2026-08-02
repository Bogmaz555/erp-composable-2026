/**
 * Durable consumer idempotency ledger (Enterprise Q0 / E0.3).
 *
 * Per-service Prisma model (ADR-003 — no shared DB):
 *
 * ```prisma
 * model ProcessedEvent {
 *   eventId     String
 *   consumer    String
 *   processedAt DateTime @default(now())
 *   @@id([eventId, consumer])
 *   @@index([consumer, processedAt])
 * }
 * ```
 */

export type ProcessedEventKey = {
  /** Nats-Msg-Id / outbox id / envelope eventId */
  eventId: string;
  /** Durable name or handler name */
  consumer: string;
};

export type ProcessedEventGuardResult<T> =
  | { idempotent: true; result?: T }
  | { idempotent: false; result: T };

export type PrismaLikeForProcessedEvent = {
  processedEvent: {
    findUnique?: (args: {
      where: { eventId_consumer: { eventId: string; consumer: string } };
    }) => Promise<{ eventId: string; consumer: string } | null>;
    findFirst: (args: {
      where: { eventId: string; consumer: string };
    }) => Promise<{ eventId: string; consumer: string } | null>;
    create: (args: {
      data: { eventId: string; consumer: string; processedAt?: Date };
    }) => Promise<unknown>;
  };
};

function isUniqueViolation(err: unknown): boolean {
  const e = err as { code?: string; message?: string };
  if (e?.code === 'P2002') return true;
  const msg = String(e?.message ?? err ?? '');
  return /unique constraint|duplicate key|Unique constraint/i.test(msg);
}

/**
 * Resolve event id from JetStream / Nest payload conventions.
 */
export function resolveEventId(input: {
  msgId?: string | null;
  outboxId?: string | null;
  eventId?: string | null;
  id?: string | null;
  correlationId?: string | null;
  headers?: Record<string, string | string[] | undefined> | null;
}): string | null {
  const fromHeader = (name: string): string | null => {
    if (!input.headers) return null;
    const v = input.headers[name] ?? input.headers[name.toLowerCase()];
    if (Array.isArray(v)) return v[0] || null;
    return typeof v === 'string' && v.trim() ? v.trim() : null;
  };

  const candidates = [
    input.msgId,
    input.outboxId,
    input.eventId,
    input.id,
    input.correlationId,
    fromHeader('Nats-Msg-Id'),
    fromHeader('nats-msg-id'),
    fromHeader('x-outbox-id'),
  ];
  for (const c of candidates) {
    if (typeof c === 'string' && c.trim()) return c.trim();
  }
  return null;
}

/** True if (eventId, consumer) was already processed. */
export async function wasProcessed(
  prisma: PrismaLikeForProcessedEvent,
  key: ProcessedEventKey,
): Promise<boolean> {
  const eventId = key.eventId?.trim();
  const consumer = key.consumer?.trim();
  if (!eventId || !consumer) return false;
  if (typeof prisma.processedEvent.findUnique === 'function') {
    const row = await prisma.processedEvent.findUnique({
      where: { eventId_consumer: { eventId, consumer } },
    });
    if (row) return true;
  }
  const row = await prisma.processedEvent.findFirst({
    where: { eventId, consumer },
  });
  return !!row;
}

/** Insert ledger row; returns false if already exists (unique race). */
export async function markProcessed(
  prisma: PrismaLikeForProcessedEvent,
  key: ProcessedEventKey,
): Promise<boolean> {
  const eventId = key.eventId?.trim();
  const consumer = key.consumer?.trim();
  if (!eventId || !consumer) {
    throw new Error('markProcessed requires non-empty eventId and consumer');
  }
  try {
    await prisma.processedEvent.create({
      data: { eventId, consumer, processedAt: new Date() },
    });
    return true;
  } catch (err) {
    if (isUniqueViolation(err)) return false;
    throw err;
  }
}

/**
 * Run `fn` at most once per (eventId, consumer).
 * Does **not** wrap `fn` in $transaction (avoids nested-tx with domain handlers).
 * Pattern: check → fn → mark; redelivery after successful mark is no-op;
 * redelivery after fn success but failed mark may re-run — handlers must stay business-idempotent.
 */
export async function withProcessedEventGuard<T>(
  prisma: PrismaLikeForProcessedEvent,
  key: ProcessedEventKey,
  fn: () => Promise<T>,
): Promise<ProcessedEventGuardResult<T>> {
  const eventId = key.eventId?.trim();
  const consumer = key.consumer?.trim();
  if (!eventId || !consumer) {
    throw new Error('withProcessedEventGuard requires non-empty eventId and consumer');
  }

  if (await wasProcessed(prisma, { eventId, consumer })) {
    return { idempotent: true };
  }

  const body = await fn();

  try {
    await markProcessed(prisma, { eventId, consumer });
  } catch (err) {
    // markProcessed already swallows unique; other errors surface
    throw err;
  }

  return { idempotent: false, result: body };
}
