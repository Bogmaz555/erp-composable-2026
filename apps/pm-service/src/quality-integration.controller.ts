import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import type { QualityNcrRaisedV1Event } from '@erp/shared-kernel';
import { PrismaService } from './prisma.service';

@Controller()
export class QualityIntegrationController {
  private readonly logger = new Logger(QualityIntegrationController.name);

  constructor(private readonly prisma: PrismaService) {}

  @EventPattern('quality.ncr.raised.v1')
  async handleNcrRaised(@Payload() payload: QualityNcrRaisedV1Event) {
    this.logger.warn(
      `[PM] NCR ${payload.ncrId} severity=${payload.severity} project=${payload.projectId || 'N/A'}`,
    );

    if (payload.projectId) {
      await this.prisma.project.updateMany({
        where: { id: payload.projectId },
        data: { feverZone: payload.severity === 'CRITICAL' ? 'RED' : 'YELLOW' },
      });
    }

    if (payload.projectId && payload.bomComponentId) {
      await this.prisma.wbsElement.updateMany({
        where: { projectId: payload.projectId, bomComponentId: payload.bomComponentId },
        data: { status: 'QUALITY_HOLD' },
      });
    }
  }

  @EventPattern('quality.ncr.closed.v1')
  async handleNcrClosed(@Payload() payload: { projectId?: string; ncrId: string }) {
    if (payload.projectId) {
      await this.prisma.project.updateMany({
        where: { id: payload.projectId },
        data: { feverZone: 'GREEN' },
      });
    }
    this.logger.log(`[PM] NCR closed ${payload.ncrId}`);
  }
}
