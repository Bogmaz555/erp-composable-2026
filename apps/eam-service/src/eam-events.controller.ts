import { Controller, Post, Body, Inject, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { PrismaClient } from '.prisma/client-eam';

@Controller('eam')
export class EamEventsController {
  private readonly logger = new Logger(EamEventsController.name);
  private readonly prisma = new PrismaClient();

  constructor(@Inject('NATS_CLIENT') private readonly nats: ClientProxy) {}

  @Post('breakdown')
  async reportBreakdown(
    @Body() dto: { equipmentId: string; reason: string; severity?: string },
  ) {
    await this.prisma.equipment.update({
      where: { id: dto.equipmentId },
      data: { status: 'BROKEN' },
    }).catch(() => {});

    await this.prisma.breakdownEvent.create({
      data: {
        equipmentId: dto.equipmentId,
        reason: dto.reason,
        severity: dto.severity || 'HIGH',
        source: 'IOT',
      },
    }).catch(() => {});

    const payload = {
      equipmentId: dto.equipmentId,
      reason: dto.reason,
      severity: dto.severity || 'HIGH',
      detectedAt: new Date().toISOString(),
    };

    this.nats.emit('eam.breakdown.detected.v1', payload);
    this.logger.warn(`[EAM] Breakdown ${dto.equipmentId}: ${dto.reason}`);
    return { ok: true, event: 'eam.breakdown.detected.v1', payload };
  }
}
