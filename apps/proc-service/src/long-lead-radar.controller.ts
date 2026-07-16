import { Controller, Get, Logger, Req } from '@nestjs/common';
import type { TenantRequest } from './tenant.middleware';
import { EventPattern, Payload } from '@nestjs/microservices';
import type { PlmBomReleasedV2Event } from '@erp/shared-kernel';
import { CommandBus } from '@nestjs/cqrs';
import { CreatePurchaseOrderCommand } from './commands/create-purchase-order.handler';
import { LongLeadRadarService } from './long-lead-radar.service';
import { PrismaService } from './prisma.service';
import { OutboxStatus } from '@prisma/client-proc';

/**
 * Long-Lead Radar — priorytetowe PO dla komponentów z lead time >= threshold (domyślnie 28 dni).
 * Uzupełnia PlmMrpController (krótki lead); nie zastępuje struktury monorepo.
 */
@Controller('long-lead')
export class LongLeadRadarController {
  private readonly logger = new Logger(LongLeadRadarController.name);

  constructor(
    private readonly radar: LongLeadRadarService,
    private readonly commandBus: CommandBus,
    private readonly prisma: PrismaService,
  ) {}

  @Get('radar')
  async getStatus(@Req() req: TenantRequest) {
    return this.radar.status(req.tenantId || 'default');
  }

  @EventPattern('plm.bom.released.v2')
  async onBomReleased(@Payload() payload: PlmBomReleasedV2Event) {
    if (!payload.components?.length || !payload.projectId) return;

    const tenantId = payload.tenantId || 'default';
    let created = 0;

    for (const comp of payload.components) {
      const sku = comp.childPartNumber || comp.childItemId;
      const qty = Math.ceil(comp.quantity || 1);
      if (!sku) continue;

      const leadDays = await this.radar.resolveLeadTimeDays(sku, tenantId);
      if (!this.radar.isLongLead(leadDays)) continue;

      const existing = await this.prisma.purchaseOrder.findFirst({
        where: {
          tenantId,
          projectId: payload.projectId,
          sku,
          bomComponentId: comp.bomComponentId,
          source: 'LONG_LEAD',
          status: { notIn: ['REJECTED', 'CLOSED'] },
        },
      });
      if (existing) continue;

      const result = await this.commandBus.execute(
        new CreatePurchaseOrderCommand(sku, qty, {
          projectId: payload.projectId,
          bomComponentId: comp.bomComponentId,
          itemId: comp.childItemId,
          tenantId,
          source: 'LONG_LEAD',
        }),
      );

      const orderId = result?.id || result?.orderId;
      if (orderId) {
        await this.prisma.outboxEvent.create({
          data: {
            tenantId,
            aggregateId: orderId,
            aggregateType: 'PurchaseOrder',
            eventType: 'proc.longlead.detected.v1',
            payload: {
              orderId,
              sku,
              quantity: qty,
              projectId: payload.projectId,
              bomComponentId: comp.bomComponentId,
              leadTimeDays: leadDays,
              tenantId,
            },
            status: OutboxStatus.PENDING,
          },
        });
        created++;
      }
    }

    if (created > 0) {
      this.logger.log(
        `[LONG-LEAD] ${created} urgent PO(s) BOM=${payload.bomVersionId} project=${payload.projectId}`,
      );
    }
    return { created };
  }
}
