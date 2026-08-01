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
 */
export abstract class GenericOutboxRelay {
  protected abstract readonly logger: Logger;
  /** PrismaClient-like with outboxEvent model */
  protected abstract readonly prisma: any;
  protected abstract readonly natsClient: ClientProxy;

  /** Max publish attempts before marking FAILED (env OUTBOX_MAX_ATTEMPTS, default 5). */
  protected get maxAttempts(): number {
    const n = Number(process.env.OUTBOX_MAX_ATTEMPTS ?? 5);
    return Number.isFinite(n) && n > 0 ? n : 5;
  }

  /**
   * Reclaim PROCESSING rows whose createdAt is older than this many minutes.
   * 0 disables reclaim. Env: OUTBOX_RECLAIM_MINUTES (default 15).
   * Note: OutboxEvent has no updatedAt/lockedAt; createdAt is a conservative proxy.
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
    }
  }

  /**
   * Reclaim stuck PROCESSING rows so they can be retried after a crash mid-batch.
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
          `Reclaimed ${count} stuck PROCESSING outbox event(s) older than ${minutes}m`,
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

      await this.prisma.outboxEvent.update({
        where: { id: event.id },
        data: {
          status: 'PROCESSED' satisfies OutboxRelayStatus,
          processedAt: new Date(),
          lastError: null,
        },
      });

      this.logger.debug(`Successfully relayed event ${event.id}`);
    } catch (error) {
      await this.markPublishFailure(event, error);
    }
  }

  /**
   * On publish failure: attempts++, lastError; FAILED after maxAttempts, else PENDING for retry.
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
