import { Logger } from '@nestjs/common';
import { ClientProxy, NatsRecordBuilder } from '@nestjs/microservices';
import { propagation, context } from '@opentelemetry/api';
import { headers as natsHeaders } from 'nats';
import { lastValueFrom } from 'rxjs';

/** Canonical OutboxStatus values (must match Prisma OutboxStatus enums). */
export type OutboxRelayStatus = 'PENDING' | 'PROCESSING' | 'PROCESSED' | 'FAILED';

/**
 * GenericOutboxRelay v2 — single shared semantics for all producers.
 *
 * Algorithm:
 * 1. Optional reclaim of stuck PROCESSING → PENDING (createdAt older than N minutes)
 * 2. Claim rows: PENDING → PROCESSING (conditional updateMany per id)
 * 3. await publish (not fire-and-forget)
 * 4. Success → PROCESSED; failure → attempts++, lastError, PENDING or FAILED after max
 * 5. No empty catch blocks
 * 6. In-process reentrancy guard (overlapping @Interval ticks skip)
 *
 * ## Residual (wontfix this PR): reclaim age uses `createdAt`
 *
 * OutboxEvent has no `updatedAt` / `lockedAt` / `processingStartedAt`. Reclaim therefore
 * filters `PROCESSING` + `createdAt < now - OUTBOX_RECLAIM_MINUTES`. Under multi-instance
 * relay, an aged backlog row claimed by worker A can be reclaimed to PENDING by worker B
 * while A is still publishing → double delivery (at-least-once; consumers must be
 * idempotent). Accept for pilot. Follow-up: set lock timestamp on claim and filter reclaim
 * on that field. Mitigate now: set `OUTBOX_RECLAIM_MINUTES=0` on multi-replica deploys with
 * low crash risk, or rely on consumer idempotency.
 */
export abstract class GenericOutboxRelay {
  protected abstract readonly logger: Logger;
  /** PrismaClient-like with outboxEvent model */
  protected abstract readonly prisma: any;
  protected abstract readonly natsClient: ClientProxy;

  /** Prevents overlapping relayEvents ticks (e.g. @Interval while a batch is still running). */
  private running = false;

  /** Max publish attempts before marking FAILED (env OUTBOX_MAX_ATTEMPTS, default 5). */
  protected get maxAttempts(): number {
    const n = Number(process.env.OUTBOX_MAX_ATTEMPTS ?? 5);
    return Number.isFinite(n) && n > 0 ? n : 5;
  }

  /**
   * Reclaim PROCESSING rows whose createdAt is older than this many minutes.
   * 0 disables reclaim. Env: OUTBOX_RECLAIM_MINUTES (default 15).
   *
   * Residual: no lockedAt/updatedAt on OutboxEvent — see class doc. Multi-instance
   * double delivery on aged backlog is accepted (at-least-once) until a later PR.
   */
  protected get reclaimMinutes(): number {
    const raw = process.env.OUTBOX_RECLAIM_MINUTES;
    if (raw === undefined || raw === '') return 15;
    const n = Number(raw);
    return Number.isFinite(n) && n >= 0 ? n : 15;
  }

  protected get batchSize(): number {
    const n = Number(process.env.OUTBOX_BATCH_SIZE ?? 50);
    return Number.isFinite(n) && n > 0 ? n : 50;
  }

  async relayEvents(): Promise<void> {
    if (this.running) {
      this.logger.debug('Outbox relay already running — skipping overlapping tick');
      return;
    }
    this.running = true;
    try {
      await this.reclaimStuckProcessing();

      const pendingEvents = await this.prisma.outboxEvent.findMany({
        where: { status: 'PENDING' },
        take: this.batchSize,
        orderBy: { createdAt: 'asc' },
      });

      if (!pendingEvents || pendingEvents.length === 0) return;

      this.logger.debug(`Found ${pendingEvents.length} pending events to relay...`);

      for (const event of pendingEvents) {
        await this.processEvent(event);
      }
    } catch (e) {
      this.logger.error(`Error fetching outbox events`, e as Error);
    } finally {
      this.running = false;
    }
  }

  /**
   * Reclaim stuck PROCESSING rows so they can be retried after a crash mid-batch.
   *
   * Uses createdAt as age proxy only (no lockedAt). See class residual note for
   * multi-instance double-delivery risk on aged backlog — wontfix until schema lock field.
   */
  protected async reclaimStuckProcessing(): Promise<number> {
    const minutes = this.reclaimMinutes;
    if (!minutes || minutes <= 0) return 0;

    const cutoff = new Date(Date.now() - minutes * 60_000);
    try {
      const result = await this.prisma.outboxEvent.updateMany({
        where: {
          status: 'PROCESSING',
          createdAt: { lt: cutoff },
        },
        data: { status: 'PENDING' },
      });
      const count = result?.count ?? 0;
      if (count > 0) {
        this.logger.warn(
          `Reclaimed ${count} stuck PROCESSING outbox event(s) older than ${minutes}m ` +
            `(createdAt proxy; multi-instance double-delivery residual on aged backlog)`,
        );
      }
      return count;
    } catch (e) {
      this.logger.error(`Failed to reclaim stuck PROCESSING outbox events`, e as Error);
      return 0;
    }
  }

  /**
   * Claim one PENDING row → PROCESSING, publish, then mark PROCESSED or handle failure.
   * Publish transport errors go through markPublishFailure; PROCESSED DB failures do not
   * (row stays PROCESSING for reclaim / next tick status write — no false DLQ).
   */
  protected async processEvent(event: {
    id: string;
    attempts?: number | null;
    eventType?: string;
    topic?: string;
    payload: unknown;
  }): Promise<void> {
    let claimed = false;
    try {
      const result = await this.prisma.outboxEvent.updateMany({
        where: { id: event.id, status: 'PENDING' },
        data: { status: 'PROCESSING' },
      });
      claimed = (result?.count ?? 0) > 0;
    } catch (e) {
      this.logger.error(`Failed to claim outbox event ${event.id}`, e as Error);
      return;
    }

    if (!claimed) {
      // Lost race to another relay instance — skip quietly.
      return;
    }

    // Publish only — transport errors count as attempts / may DLQ.
    try {
      const hdrs = natsHeaders();
      const carrier: Record<string, string> = {};
      propagation.inject(context.active(), carrier);

      for (const [k, v] of Object.entries(carrier)) {
        hdrs.append(k, v);
      }

      const record = new NatsRecordBuilder(event.payload).setHeaders(hdrs).build();
      const subject = event.eventType || event.topic;
      const obs = this.natsClient.emit(subject, record);
      // Await publish; do not fire-and-forget (INV local relay bug).
      await lastValueFrom(obs, { defaultValue: undefined });
    } catch (error) {
      await this.markPublishFailure(event, error);
      return;
    }

    // Publish succeeded. Mark PROCESSED separately so a DB blip does not increment
    // attempts / dead-letter an already-published message.
    try {
      await this.prisma.outboxEvent.update({
        where: { id: event.id },
        data: {
          status: 'PROCESSED' satisfies OutboxRelayStatus,
          processedAt: new Date(),
          lastError: null,
        },
      });
      this.logger.debug(`Successfully relayed event ${event.id}`);
    } catch (persistError) {
      // Leave status PROCESSING: reclaim or a later tick can re-attempt the status write
      // (may re-publish once under at-least-once — acceptable; better than false FAILED).
      this.logger.error(
        `Published outbox event ${event.id} but failed to mark PROCESSED — leaving PROCESSING for reclaim`,
        persistError as Error,
      );
    }
  }

  /**
   * On publish failure: attempts++, lastError; FAILED after maxAttempts, else PENDING for retry.
   * Must not be used for post-publish PROCESSED persistence failures.
   */
  protected async markPublishFailure(
    event: { id: string; attempts?: number | null },
    error: unknown,
  ): Promise<void> {
    const message = this.formatError(error);
    const attempts = (event.attempts ?? 0) + 1;
    const dead = attempts >= this.maxAttempts;
    const status: OutboxRelayStatus = dead ? 'FAILED' : 'PENDING';

    this.logger.error(
      `Failed to relay event ${event.id} (attempt ${attempts}/${this.maxAttempts})${
        dead ? ' — DEAD-LETTER' : ''
      }: ${message}`,
      error instanceof Error ? error.stack : undefined,
    );

    try {
      await this.prisma.outboxEvent.update({
        where: { id: event.id },
        data: {
          attempts,
          lastError: message.slice(0, 500),
          status,
        },
      });
    } catch (updateError) {
      this.logger.error(
        `Failed to persist outbox failure state for event ${event.id}`,
        updateError as Error,
      );
    }
  }

  protected formatError(error: unknown): string {
    if (error instanceof Error) return error.message || error.name;
    if (typeof error === 'string') return error;
    try {
      return JSON.stringify(error);
    } catch {
      return 'Unknown outbox publish error';
    }
  }
}
