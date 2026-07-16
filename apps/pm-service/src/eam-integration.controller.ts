import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import type {
  EamBreakdownDetectedV1Event,
  EamMaintenanceScheduledV1Event,
} from '@erp/shared-kernel';
import { PrismaService } from './prisma.service';

@Controller()
export class EamIntegrationController {
  private readonly logger = new Logger(EamIntegrationController.name);

  constructor(private readonly prisma: PrismaService) {}

  @EventPattern('eam.breakdown.detected.v1')
  async handleBreakdown(@Payload() payload: EamBreakdownDetectedV1Event) {
    this.logger.error(
      `[PM] Equipment breakdown ${payload.equipmentId}: ${payload.reason}`,
    );

    if (payload.projectId) {
      await this.prisma.project.updateMany({
        where: { id: payload.projectId },
        data: {
          feverZone: 'RED',
          usedBufferDays: { increment: 1 },
        },
      });
    }
  }

  @EventPattern('eam.maintenance.scheduled.v1')
  async handleMaintenanceScheduled(@Payload() payload: EamMaintenanceScheduledV1Event) {
    this.logger.log(
      `[PM] EAM task ${payload.taskId} ${payload.type} @ ${payload.scheduledDate}`,
    );
  }
}
