import { Logger } from '@nestjs/common';
import { ClientProxy, NatsRecordBuilder } from '@nestjs/microservices';
import { propagation, context } from '@opentelemetry/api';
import { headers as natsHeaders } from 'nats';
import { lastValueFrom } from 'rxjs';
import {
  closeJetStream,
  connectJetStream,
  isJetStreamEnabled,
  publishJsonWithAck,
  type JetStreamHandles,
} from './jetstream';

/** Canonical OutboxStatus values (must match Prisma OutboxStatus enums). */
export type OutboxRelayStatus = 'PENDING' | 'PROCESSING' | 'PROCESSED' | 'FAILED';

/**
 * GenericOutboxRelay v3 — multi-replica-safe claim (Enterprise Q0 / E0.2).
 *
 * Algorithm:
 * 1. Optional reclaim of stuck PROCESSING → PENDING (lockedAt older than N minutes)
 * 2. Claim rows: PENDING → PROCESSING + lockedAt=now + lockedBy=instance (conditional)
 * 3. await publish (not fire-and-forget)
 *    - NATS_JETSTREAM=true → JetStream publishWithAck, msgID = outbox id (server de-dupe)
 *    - else → Nest ClientProxy.emit (core NATS)
 * 4. Success → PROCESSED + clear lock; failure → attempts++, lastError, PENDING/FAILED + clear lock
 * 5. No empty catch blocks
 * 6. In-process reentrancy guard (overlapping @Interval ticks skip)
 *
 * ## Multi-replica reclaim (Enterprise Q0 / E0.2)
 *
 * Claim sets `lockedAt = now()` and `lockedBy = instanceId`. Reclaim filters
 * `PROCESSING` + `lockedAt < now - OUTBOX_RECLAIM_MINUTES` (not `createdAt` alone),
 * so an aged backlog row claimed recently is not stolen mid-publish.
 * Rows with null `lockedAt` (pre-migration or legacy) fall back to `createdAt` age.
 * Consumers must stay at-least-once safe (`processed_events`).
 */
export abstract class GenericOutboxRelay {
  protected abstract readonly logger: Logger;
  /** PrismaClient-like with outboxEvent model */
  protected abstract readonly prisma: any;
  protected abstract readonly natsClient: ClientProxy;

  /** Prevents overlapping relayEvents ticks (e.g. @Interval while a batch is still running). */
  private running = false;

  /** hostname:pid for lockedBy diagnostics */
  protected get instanceId(): string {
    const host =
      (typeof process !== 'undefined' && (process.env.HOSTNAME || process.env.COMPUTERNAME)) ||
      'relay';
    const pid = typeof process !== 'undefined' ? process.pid : 0;
    return `${host}:${pid}`;
  }

  /** Lazy JetStream connection when NATS_JETSTREAM is on. */
  private jsHandles: JetStreamHandles | null = null;
  private jsConnectPromise: Promise<JetStreamHandles> | null = null;
  private jsPathLogged = false;

  /** Max publish attempts before marking FAILED (env OUTBOX_MAX_ATTEMPTS, default 5). */
  protected get maxAttempts(): number {
    const n = Number(process.env.OUTBOX_MAX_ATTEMPTS ?? 5);
    return Number.isFinite(n) && n > 0 ? n : 5;
  }

  /**
   * Reclaim PROCESSING rows whose lockedAt is older than this many minutes.
   * 0 disables reclaim. Env: OUTBOX_RECLAIM_MINUTES (default 15).
   *
   * Primary filter is lockedAt (set on claim). Null lockedAt uses createdAt only as
   * rollout fallback for rows claimed before the lockedAt migration.
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

  /** Whether this tick should publish via JetStream (flag checked live). */
  protected useJetStreamPublish(): boolean {
    return isJetStreamEnabled();
  }

  /**
   * Close JetStream connection if opened. Call from OnModuleDestroy in subclasses
   * when NATS_JETSTREAM may have been used.
   */
  async closeJetStreamTransport(): Promise<void> {
    const handles = this.jsHandles;
    this.jsHandles = null;
    this.jsConnectPromise = null;
    if (handles) {
      await closeJetStream(handles);
    }
  }

  protected async ensureJetStream(): Promise<JetStreamHandles> {
    if (this.jsHandles) return this.jsHandles;
    if (!this.jsConnectPromise) {
      this.jsConnectPromise = connectJetStream({
        connectOpts: { name: `outbox-relay-${process.pid}` },
      })
        .then((h) => {
          this.jsHandles = h;
          if (!this.jsPathLogged) {
            this.jsPathLogged = true;
            this.logger.log(
              'Outbox relay JetStream publish path active (NATS_JETSTREAM) — msgID=outbox id',
            );
          }
          return h;
        })
        .catch((err) => {
          this.jsConnectPromise = null;
          throw err;
        });
    }
    return this.jsConnectPromise;
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
   * Prefer lockedAt age (set on claim). Null lockedAt + old createdAt is a rollout fallback
   * only — does not reclaim a recently claimed aged-backlog row (createdAt old, lockedAt fresh).
   */
  protected async reclaimStuckProcessing(): Promise<number> {
    const minutes = this.reclaimMinutes;
    if (!minutes || minutes <= 0) return 0;

    const cutoff = new Date(Date.now() - minutes * 60_000);
    try {
      const result = await this.prisma.outboxEvent.updateMany({
        where: {
          status: 'PROCESSING',
          OR: [
            { lockedAt: { lt: cutoff } },
            // Pre-migration / legacy claim without lockedAt
            { lockedAt: null, createdAt: { lt: cutoff } },
          ],
        },
        data: { status: 'PENDING', lockedAt: null, lockedBy: null },
      });
      const count = result?.count ?? 0;
      if (count > 0) {
        this.logger.warn(
          `Reclaimed ${count} stuck PROCESSING outbox event(s) with lockedAt older than ${minutes}m ` +
            `(or null lockedAt + aged createdAt fallback)`,
        );
      }
      return count;
    } catch (e) {
      // Schema without lockedBy — retry without it
      try {
        const result = await this.prisma.outboxEvent.updateMany({
          where: {
            status: 'PROCESSING',
            OR: [
              { lockedAt: { lt: cutoff } },
              { lockedAt: null, createdAt: { lt: cutoff } },
            ],
          },
          data: { status: 'PENDING', lockedAt: null },
        });
        return result?.count ?? 0;
      } catch (e2) {
        this.logger.error(`Failed to reclaim stuck PROCESSING outbox events`, e2 as Error);
        return 0;
      }
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
      const now = new Date();
      const result = await this.prisma.outboxEvent.updateMany({
        where: { id: event.id, status: 'PENDING' },
        data: {
          status: 'PROCESSING',
          lockedAt: now,
          lockedBy: this.instanceId,
        },
      });
      claimed = (result?.count ?? 0) > 0;
    } catch (e) {
      // Mid-migration: claim without lockedBy
      try {
        const now = new Date();
        const result = await this.prisma.outboxEvent.updateMany({
          where: { id: event.id, status: 'PENDING' },
          data: { status: 'PROCESSING', lockedAt: now },
        });
        claimed = (result?.count ?? 0) > 0;
      } catch (e2) {
        this.logger.error(`Failed to claim outbox event ${event.id}`, e2 as Error);
        return;
      }
    }

    if (!claimed) {
      // Lost race to another relay instance — skip quietly.
      return;
    }

    // Publish only — transport errors count as attempts / may DLQ.
    try {
      await this.publishEvent(event);
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
          lockedAt: null,
          lockedBy: null,
        },
      });
      this.logger.debug(`Successfully relayed event ${event.id}`);
    } catch (persistError) {
      try {
        await this.prisma.outboxEvent.update({
          where: { id: event.id },
          data: {
            status: 'PROCESSED' satisfies OutboxRelayStatus,
            processedAt: new Date(),
            lastError: null,
            lockedAt: null,
          },
        });
        this.logger.debug(`Successfully relayed event ${event.id}`);
      } catch (persistError2) {
        this.logger.error(
          `Published outbox event ${event.id} but failed to mark PROCESSED — leaving PROCESSING for reclaim`,
          persistError2 as Error,
        );
      }
    }
  }

  /**
   * Publish one outbox event. JetStream path awaits PubAck with msgID=outbox id;
   * core path awaits Nest emit.
   */
  protected async publishEvent(event: {
    id: string;
    eventType?: string;
    topic?: string;
    payload: unknown;
  }): Promise<void> {
    const subject = event.eventType || event.topic;
    if (!subject) {
      throw new Error(`Outbox event ${event.id} has no eventType/topic`);
    }

    const hdrs = natsHeaders();
    const carrier: Record<string, string> = {};
    propagation.inject(context.active(), carrier);

    for (const [k, v] of Object.entries(carrier)) {
      hdrs.append(k, v);
    }
    // Correlate durable consumers / de-dupe diagnostics with outbox row
    hdrs.set('x-outbox-id', event.id);

    if (this.useJetStreamPublish()) {
      const { js } = await this.ensureJetStream();
      await publishJsonWithAck(js, subject, event.payload, {
        msgID: event.id,
        headers: hdrs,
      });
      return;
    }

    const record = new NatsRecordBuilder(event.payload).setHeaders(hdrs).build();
    const obs = this.natsClient.emit(subject, record);
    // Await publish; do not fire-and-forget (INV local relay bug).
    await lastValueFrom(obs, { defaultValue: undefined });
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
          lockedAt: null,
          lockedBy: null,
        },
      });
    } catch {
      try {
        await this.prisma.outboxEvent.update({
          where: { id: event.id },
          data: {
            attempts,
            lastError: message.slice(0, 500),
            status,
            lockedAt: null,
          },
        });
      } catch (updateError) {
        this.logger.error(
          `Failed to persist outbox failure state for event ${event.id}`,
          updateError as Error,
        );
      }
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
