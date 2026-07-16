import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import type { EamBreakdownDetectedV1Event } from '@erp/shared-kernel';
import { PrismaService } from './prisma.service';

@Controller()
export class EamIntegrationController {
  private readonly logger = new Logger(EamIntegrationController.name);

  constructor(private readonly prisma: PrismaService) {}

  @EventPattern('eam.breakdown.detected.v1')
  async handleBreakdown(@Payload() payload: EamBreakdownDetectedV1Event) {
    this.logger.warn(
      `[MES] Breakdown on equipment ${payload.equipmentId} — flag active WOs for downtime`,
    );

    const updated = await this.prisma.workOrder.updateMany({
      where: { status: { in: ['PLANNED', 'IN_PROGRESS'] } },
      data: { status: 'ON_HOLD' },
    });

    this.logger.log(`[MES] ${updated.count} work order(s) set ON_HOLD`);
  }
}
