/**
 * Single durable consumer path for Finance WIP (PR 14).
 *
 * When NATS_JETSTREAM=true, pulls ETO_CORE / fin-wip-worker and dispatches to
 * FinanceController handlers. Nest @EventPattern for those subjects no-op
 * (see preferJetStreamConsumerPath) — no dual delivery.
 */
import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import {
  closeJetStream,
  connectJetStream,
  DURABLE_FIN_WIP,
  preferJetStreamConsumerPath,
  runDurablePullLoop,
  STREAM_ETO_CORE,
  type JetStreamHandles,
} from '@erp/shared-kernel';
import { FinanceController } from './finance.controller';
import { UniversalJournalController } from './universal-journal.controller';

@Injectable()
export class FinWipJetStreamConsumer
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(FinWipJetStreamConsumer.name);
  private handles: JetStreamHandles | null = null;
  private abort: AbortController | null = null;
  private loopPromise: Promise<void> | null = null;

  constructor(
    private readonly finance: FinanceController,
    private readonly journal: UniversalJournalController,
  ) {}

  async onModuleInit(): Promise<void> {
    if (!preferJetStreamConsumerPath()) {
      this.logger.debug(
        'NATS_JETSTREAM off — Nest @EventPattern path for Finance WIP',
      );
      return;
    }

    try {
      this.handles = await connectJetStream({
        connectOpts: { name: `fin-wip-worker-${process.pid}` },
      });
      this.abort = new AbortController();
      const signal = this.abort.signal;
      const js = this.handles.js;

      this.loopPromise = runDurablePullLoop({
        js,
        stream: STREAM_ETO_CORE,
        durable: DURABLE_FIN_WIP,
        signal,
        log: (m) => this.logger.log(m),
        onError: (err, msg) => {
          this.logger.error(
            `fin-wip handler error subject=${msg.subject}: ${(err as Error).message}`,
            err instanceof Error ? err.stack : undefined,
          );
        },
        handler: async (msg) => {
          await this.dispatch(msg.subject, msg.data, msg.headers);
        },
      }).catch((e) => {
        if (!signal.aborted) {
          this.logger.error(
            `fin-wip pull loop exited: ${(e as Error).message}`,
            e instanceof Error ? e.stack : undefined,
          );
        }
      });

      this.logger.log(
        `JetStream single consumer path: ${STREAM_ETO_CORE}/${DURABLE_FIN_WIP}`,
      );
    } catch (e) {
      this.logger.warn(
        `fin-wip JetStream consumer failed to start (is bootstrap done?): ${(e as Error).message}`,
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    this.abort?.abort();
    if (this.loopPromise) {
      try {
        await Promise.race([
          this.loopPromise,
          new Promise((r) => setTimeout(r, 2000)),
        ]);
      } catch {
        /* ignore */
      }
    }
    await closeJetStream(this.handles);
    this.handles = null;
  }

  private async dispatch(
    subject: string,
    data: unknown,
    headers: Record<string, string>,
  ): Promise<void> {
    // Minimal NatsContext-like for handlers that read x-user-id headers
    const ctx = {
      getHeaders: () => headers,
    } as any;

    switch (subject) {
      case 'inventory.reservation.released.v1':
        await this.finance.handleReservationReleased(data as any, ctx, true);
        return;
      case 'finance.wip.cost.reversed':
        await this.finance.handleWipCostReversed(data as any, ctx, true);
        return;
      case 'mes.production.recorded.v1':
        await this.finance.handleProductionRecorded(data as any, ctx, true);
        // Journal also records labor micro-cost on production (single JS path)
        await this.journal.onProduction(data as Record<string, unknown>, true);
        return;
      case 'finance.wip.cost.recorded':
        await this.journal.onWipCost(data as Record<string, unknown>, true);
        return;
      default:
        // finance.wip.> catch-all for future subjects
        if (subject.startsWith('finance.wip.')) {
          this.logger.debug(`fin-wip unhandled subject ${subject} — acked`);
        }
        return;
    }
  }
}
