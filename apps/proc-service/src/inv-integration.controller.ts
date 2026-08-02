import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload, Ctx, NatsContext } from '@nestjs/microservices';
import { CommandBus } from '@nestjs/cqrs';
import { CreatePurchaseOrderCommand } from './commands/create-purchase-order.handler';
import { propagation, context as otelContext } from '@opentelemetry/api';
import type { OutOfStockEvent } from '@erp/shared-kernel';
import { resolveEventId, withProcessedEventGuard } from '@erp/shared-kernel';
import { PrismaService } from './prisma.service';

@Controller()
export class InvIntegrationController {
  private readonly logger = new Logger(InvIntegrationController.name);

  constructor(
    private readonly commandBus: CommandBus,
    private readonly prisma: PrismaService,
  ) {}

  @EventPattern('inv.stock.out.v1')
  async handleOutOfStock(@Payload() payload: OutOfStockEvent, @Ctx() context: NatsContext) {
    this.logger.debug(`Received OutOfStockEvent for Item: ${payload.itemId}`);

    const eventId =
      resolveEventId({
        eventId: (payload as { eventId?: string }).eventId,
        correlationId: (payload as { correlationId?: string }).correlationId,
        id: `${payload.itemId}:${payload.projectId}:${payload.missingQuantity}`,
      }) ||
      `inv.stock.out:${payload.itemId}:${payload.projectId}:${payload.bomComponentId || ''}:${payload.missingQuantity}`;

    const createPo = async () => {
      const hdrs = context.getHeaders();
      const traceparent = hdrs?.get('traceparent') as string;
      const opts = {
        projectId: payload.projectId,
        bomComponentId: payload.bomComponentId,
        tenantId: payload.tenantId,
        source: 'SHORTAGE' as const,
        taskId: payload.wbsElementId,
      };
      const sku = payload.sku || payload.itemId;
      if (traceparent) {
        const activeContext = propagation.extract(otelContext.active(), { traceparent });
        return otelContext.with(activeContext, async () =>
          this.commandBus.execute(
            new CreatePurchaseOrderCommand(sku, payload.missingQuantity, opts),
          ),
        );
      }
      return this.commandBus.execute(
        new CreatePurchaseOrderCommand(sku, payload.missingQuantity, opts),
      );
    };

    try {
      const guard = await withProcessedEventGuard(
        this.prisma as never,
        { eventId, consumer: 'proc-inv-stock-out' },
        createPo,
      );
      if (guard.idempotent) {
        this.logger.debug(`[PROC] Idempotent skip stock-out ${eventId}`);
        return { ok: true, idempotent: true };
      }
      return guard.result;
    } catch (e) {
      // Schema without ProcessedEvent (pre-migrate): fall through once
      if (/processedEvent|does not exist|Unknown arg/i.test(String((e as Error).message))) {
        this.logger.warn('[PROC] ProcessedEvent unavailable — creating PO without ledger');
        return createPo();
      }
      throw e;
    }
  }
}
