import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload, Ctx, NatsContext } from '@nestjs/microservices';
import { CommandBus } from '@nestjs/cqrs';
import { CreateProjectFromOpportunityCommand } from './commands/create-project-from-opportunity.command';
import { propagation, context as otelContext } from '@opentelemetry/api';
import type { OpportunityAcceptedEvent } from '@erp/shared-kernel';

@Controller()
export class CrmIntegrationController {
  private readonly logger = new Logger(CrmIntegrationController.name);

  constructor(private readonly commandBus: CommandBus) {}

  @EventPattern('crm.opportunity.won.v1')
  async handleOpportunityWon(@Payload() payload: OpportunityAcceptedEvent, @Ctx() context: NatsContext) {
    this.logger.debug(`Received Opportunity Accepted Event: ${payload.id}`);
    
    const hdrs = context.getHeaders();
    const carrier: Record<string, string> = {};
    if (hdrs) {
      // In NATS headers, keys are mapped to arrays of strings, we take the first.
      for (const [key, value] of hdrs) {
        carrier[key] = value[0];
      }
    }

    const extractedContext = propagation.extract(otelContext.active(), carrier);

    return otelContext.with(extractedContext, () => {
      return this.commandBus.execute(
        new CreateProjectFromOpportunityCommand(
          payload.id,
          payload.name || 'New Project from Opportunity',
          payload.totalBudget || 0
        )
      );
    });
  }

  @EventPattern('procurement.order.rejected')
  async handleProcurementRejected(@Payload() payload: { orderId: string; taskId: string; reason: string }, @Ctx() context: NatsContext) {
    this.logger.warn(`[PM-SERVICE] Procurement Order Rejected! Task ID: ${payload.taskId}. Reason: ${payload.reason}`);
    // Here we would typically dispatch a command to mark the WBS task as BLOCKED or budget-exceeded
    // this.commandBus.execute(new MarkTaskBlockedCommand(payload.taskId, payload.reason));
  }
}
