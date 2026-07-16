import { Controller, Get, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { PrismaService } from './prisma.service';

@Controller('compensation')
export class SagaCompensationController {
  private readonly logger = new Logger(SagaCompensationController.name);
  private processed = 0;

  constructor(private readonly prisma: PrismaService) {}

  @Get('status')
  async status() {
    const cancelled = await this.prisma.workOrder.count({
      where: { status: 'CANCELLED' },
    }).catch(() => 0);
    return {
      service: 'mes-service',
      compensationEventsProcessed: this.processed,
      cancelledWorkOrders: cancelled,
    };
  }

  @EventPattern('mes.workorder.cancelled')
  async handleWorkOrderCancelled(@Payload() payload: Record<string, unknown>) {
    if (!payload?.compensate) return;
    const workOrderId = String(payload.workOrderId || payload.correlationId || '');
    const tenantId = String(payload.tenantId || 'default');
    this.logger.log(`[MES] compensation: workorder.cancelled ${workOrderId}`);

    if (workOrderId) {
      await this.prisma.workOrder.updateMany({
        where: { id: workOrderId, tenantId },
        data: { status: 'CANCELLED' },
      }).catch(() => {});
    } else if (payload.projectId) {
      await this.prisma.workOrder.updateMany({
        where: { projectId: String(payload.projectId), tenantId, status: { in: ['PLANNED', 'IN_PROGRESS'] } },
        data: { status: 'CANCELLED' },
      }).catch(() => {});
    }
    this.processed++;
  }

  @EventPattern('mes.production.reversed')
  async handleProductionReversed(@Payload() payload: Record<string, unknown>) {
    if (!payload?.compensate) return;
    const workOrderId = String(payload.workOrderId || '');
    const tenantId = String(payload.tenantId || 'default');
    this.logger.log(`[MES] compensation: production.reversed WO=${workOrderId}`);

    if (workOrderId) {
      await this.prisma.workOrder.updateMany({
        where: { id: workOrderId, tenantId },
        data: { status: 'PLANNED' },
      }).catch(() => {});
    }
    this.processed++;
  }
}
