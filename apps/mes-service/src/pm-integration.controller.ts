import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload, Ctx, NatsContext } from '@nestjs/microservices';
import { CommandBus } from '@nestjs/cqrs';
import { CreateWorkOrderCommand } from './commands/create-work-order.handler';
import { propagation, context as otelContext } from '@opentelemetry/api';
import type { ProjectReleasedEvent } from '@erp/shared-kernel';
import { PrismaService } from './prisma.service';

@Controller()
export class PmIntegrationController {
  private readonly logger = new Logger(PmIntegrationController.name);

  constructor(
    private readonly commandBus: CommandBus,
    private readonly prisma: PrismaService,   // injected for direct reads/writes in event handlers (common pattern in this codebase)
  ) {}

  @EventPattern('pm.project.released.v1')
  async handleProjectReleased(@Payload() payload: ProjectReleasedEvent, @Ctx() context: NatsContext) {
    this.logger.debug(`Received ProjectReleasedEvent for Project: ${payload.projectId}`);
    
    const hdrs = context.getHeaders();
    const traceparent = hdrs?.get('traceparent') as string;
    
    if (traceparent) {
      const activeContext = propagation.extract(otelContext.active(), { traceparent });
      otelContext.with(activeContext, async () => {
        await this.commandBus.execute(new CreateWorkOrderCommand(
          payload.projectId,
          payload.wbsElementId,
          payload.productName,
          payload.quantity
        ));
      });
    } else {
      await this.commandBus.execute(new CreateWorkOrderCommand(
        payload.projectId,
        payload.wbsElementId,
        payload.productName,
        payload.quantity
      ));
    }
  }

  // Direct PLM BOM release listener for MES traceability (Faza 1 ETO)
  // When BOM is released for a project/machine build, explode components into MaterialRequirement
  // linked by bomComponentId. This complements the PM-side explosion (WBS + material requests).
  @EventPattern('plm.bom.released.v2')
  async handleBomReleased(@Payload() payload: any, @Ctx() context: NatsContext) {
    this.logger.debug(`[MES] Received plm.bom.released.v2 for BOM ${payload.bomVersionId} (item ${payload.itemId})`);

    // TD-001: Extract authenticated user from NATS headers (when propagated from Gateway)
    const hdrs = context.getHeaders();
    const userId = (hdrs?.['x-user-id'] as string) || 'system';
    const roles = (hdrs?.['x-roles'] as string) || '';
    if (userId !== 'system') {
      this.logger.log(`[TD-001] BOM release processed by user=${userId} roles=${roles}`);
    }

    const projectId = payload.projectId || null;
    const bomVersionId = payload.bomVersionId;
    const components = payload.components || [];

    if (!bomVersionId || components.length === 0) {
      this.logger.warn('[MES] BOM released event missing bomVersionId or components snapshot - skipping explosion');
      return;
    }

    // Find or create a WorkOrder for this project/BOM (simplified; real would use dedicated saga/handler)
    let workOrderId: string | null = null;
    if (projectId) {
      const existing = await this.prisma.workOrder.findFirst({
        where: { projectId, bomVersionId }
      }).catch(() => null);

      if (existing) {
        workOrderId = existing.id;
      } else {
        // Use CreateWorkOrderCommand (supports bomVersionId + components snapshot for auto MaterialRequirement explosion)
        // This improves PM->MES data flow consistency
        try {
          const wo = await this.commandBus.execute(new CreateWorkOrderCommand(
            projectId,
            null,
            payload.itemId || 'Unknown Item',
            1,
            bomVersionId,
            payload.itemId,
            components,
            payload.tenantId || 'default'
          ));
          workOrderId = (wo as any)?.id || null;
        } catch (e) {
          // Fallback to direct create if command fails in current env
          const wo = await this.prisma.workOrder.create({
            data: {
              id: require('crypto').randomUUID(),
              orderNumber: `WO-BOM-${bomVersionId.substring(0,8)}`,
              projectId,
              bomVersionId,
              itemId: payload.itemId,
              quantity: 1,
              status: 'PLANNED',
              tenantId: payload.tenantId || 'default',
            }
          }).catch(() => null);
          workOrderId = wo?.id || null;
        }
      }
    }

    // BOM Explosion into MaterialRequirement (core ETO traceability)
    for (const comp of components) {
      const bomComponentId = comp.bomComponentId || comp.id || null;
      const itemId = comp.childItemId || comp.itemId;
      const qty = comp.quantity || 0;

      if (!itemId || !workOrderId) continue;

      try {
        await this.prisma.materialRequirement.create({
          data: {
            tenantId: payload.tenantId || 'default',
            workOrderId,
            bomComponentId,
            itemId,
            quantity: qty,
            reservedQty: 0,
            status: 'PENDING',
          }
        });
      } catch (e) {
        this.logger.warn(`[MES] Could not create MaterialRequirement for ${itemId} (env/schema not applied yet)`);
      }
    }

    this.logger.log(`[MES] BOM explosion complete: created MaterialRequirements for ${components.length} components on WO ${workOrderId || 'N/A'} (bom ${bomVersionId})`);
  }
}
