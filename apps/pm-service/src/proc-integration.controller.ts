import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { PrismaService } from './prisma.service';
import type { PurchaseOrderApprovedEvent } from '@erp/shared-kernel';
import { assertEtoOperationalPayload } from '@erp/shared-kernel';

@Controller()
export class ProcIntegrationController {
  private readonly logger = new Logger(ProcIntegrationController.name);

  constructor(private readonly prisma: PrismaService) {}

  @EventPattern('proc.purchaseorder.approved.v1')
  async handlePoApproved(@Payload() payload: PurchaseOrderApprovedEvent) {
    this.logger.log(
      `[PM] PO approved ${payload.orderId} sku=${payload.sku} qty=${payload.quantity}`,
    );

    if (payload.projectId) {
      assertEtoOperationalPayload(
        {
          projectId: payload.projectId,
          tenantId: payload.tenantId,
          bomComponentId: payload.bomComponentId,
          wbsElementId: payload.taskId,
        },
        'proc.purchaseorder.approved.v1',
      );
    }

    if (payload.taskId) {
      const updated = await this.prisma.wbsElement.updateMany({
        where: { id: payload.taskId },
        data: { status: 'PROCUREMENT_APPROVED' },
      });
      if (updated.count > 0) {
        this.logger.log(`[PM] WBS ${payload.taskId} → PROCUREMENT_APPROVED`);
        return;
      }
    }

    if (payload.projectId && payload.bomComponentId) {
      await this.prisma.wbsElement.updateMany({
        where: {
          projectId: payload.projectId,
          bomComponentId: payload.bomComponentId,
        },
        data: { status: 'PROCUREMENT_APPROVED' },
      });
    }
  }

  @EventPattern('proc.eta.delayed.v1')
  async handleEtaDelayed(@Payload() payload: { orderId: string; sku: string; projectId?: string; bomComponentId?: string; previousEta?: string; newEta: string; tenantId: string }) {
    this.logger.warn(`[PM] PO ETA delayed for ${payload.orderId} sku=${payload.sku} to ${payload.newEta}`);
    
    if (payload.projectId && payload.bomComponentId) {
      // Find the task/wbs element and update its end date and flag
      const updated = await this.prisma.wbsElement.updateMany({
        where: {
          projectId: payload.projectId,
          bomComponentId: payload.bomComponentId,
        },
        data: { 
          endDate: new Date(payload.newEta),
        },
      });

      if (updated.count > 0) {
        this.logger.warn(`[PM] Updated WBS endDate to ${payload.newEta} due to LONG_LEAD delay on ${payload.sku}`);
      }
    }
  }
}
