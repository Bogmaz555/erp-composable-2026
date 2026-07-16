import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload, Ctx, NatsContext } from '@nestjs/microservices';
import { CommandBus } from '@nestjs/cqrs';
import { CreatePurchaseOrderCommand } from './commands/create-purchase-order.handler';
import { propagation, context as otelContext } from '@opentelemetry/api';
import type { OutOfStockEvent } from '@erp/shared-kernel';

@Controller()
export class InvIntegrationController {
  private readonly logger = new Logger(InvIntegrationController.name);

  constructor(private readonly commandBus: CommandBus) {}

  @EventPattern('inv.stock.out.v1')
  async handleOutOfStock(@Payload() payload: OutOfStockEvent, @Ctx() context: NatsContext) {
    this.logger.debug(`Received OutOfStockEvent for Item: ${payload.itemId}`);
    
    const hdrs = context.getHeaders();
    const traceparent = hdrs?.get('traceparent') as string;
    
    if (traceparent) {
      const activeContext = propagation.extract(otelContext.active(), { traceparent });
      otelContext.with(activeContext, async () => {
        await this.commandBus.execute(new CreatePurchaseOrderCommand(
          payload.sku || payload.itemId,
          payload.missingQuantity,
          {
            projectId: payload.projectId,
            bomComponentId: payload.bomComponentId,
            tenantId: payload.tenantId,
            source: 'SHORTAGE',
            taskId: payload.wbsElementId,
          },
        ));
      });
    } else {
      await this.commandBus.execute(new CreatePurchaseOrderCommand(
        payload.sku || payload.itemId,
        payload.missingQuantity,
        {
          projectId: payload.projectId,
          bomComponentId: payload.bomComponentId,
          tenantId: payload.tenantId,
          source: 'SHORTAGE',
          taskId: payload.wbsElementId,
        },
      ));
    }
  }
}
