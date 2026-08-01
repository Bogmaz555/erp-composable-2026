/**
 * Single durable consumer path for INV ETO spine (PR 14).
 *
 * When NATS_JETSTREAM=true, pulls ETO_CORE / inv-eto-worker and dispatches to
 * PmIntegrationController handlers. Nest @EventPattern for key subjects no-op.
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
  DURABLE_INV_ETO,
  preferJetStreamConsumerPath,
  runDurablePullLoop,
  STREAM_ETO_CORE,
  type JetStreamHandles,
} from '@erp/shared-kernel';
import { PmIntegrationController } from './pm-integration.controller';

@Injectable()
export class InvEtoJetStreamConsumer
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(InvEtoJetStreamConsumer.name);
  private handles: JetStreamHandles | null = null;
  private abort: AbortController | null = null;
  private loopPromise: Promise<void> | null = null;

  constructor(private readonly pm: PmIntegrationController) {}

  async onModuleInit(): Promise<void> {
    if (!preferJetStreamConsumerPath()) {
      this.logger.debug(
        'NATS_JETSTREAM off — Nest @EventPattern path for INV ETO',
      );
      return;
    }

    try {
      this.handles = await connectJetStream({
        connectOpts: { name: `inv-eto-worker-${process.pid}` },
      });
      this.abort = new AbortController();
      const signal = this.abort.signal;
      const js = this.handles.js;

      this.loopPromise = runDurablePullLoop({
        js,
        stream: STREAM_ETO_CORE,
        durable: DURABLE_INV_ETO,
        signal,
        log: (m) => this.logger.log(m),
        onError: (err, msg) => {
          this.logger.error(
            `inv-eto handler error subject=${msg.subject}: ${(err as Error).message}`,
            err instanceof Error ? err.stack : undefined,
          );
        },
        handler: async (msg) => {
          await this.dispatch(msg.subject, msg.data, msg.headers);
        },
      }).catch((e) => {
        if (!signal.aborted) {
          this.logger.error(
            `inv-eto pull loop exited: ${(e as Error).message}`,
            e instanceof Error ? e.stack : undefined,
          );
        }
      });

      this.logger.log(
        `JetStream single consumer path: ${STREAM_ETO_CORE}/${DURABLE_INV_ETO}`,
      );
    } catch (e) {
      this.logger.warn(
        `inv-eto JetStream consumer failed to start (is bootstrap done?): ${(e as Error).message}`,
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
    const ctx = {
      getHeaders: () => ({
        get: (k: string) => headers[k],
        ...headers,
      }),
    } as any;

    switch (subject) {
      case 'pm.material.requested.v1':
        await this.pm.handleMaterialRequested(data as any, ctx, true);
        return;
      case 'mes.production.recorded.v1':
        await this.pm.handleProductionRecorded(data as any, ctx, true);
        return;
      case 'plm.bom.released.v2':
        await this.pm.handlePlmBomReleased(data as any, ctx, true);
        return;
      default:
        // Whole-stream durable may deliver other ETO subjects — ack and ignore
        this.logger.debug(`inv-eto ignore subject ${subject}`);
        return;
    }
  }
}
