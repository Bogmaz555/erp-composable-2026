import { Controller, Get } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  liveness() {
    return { status: 'ok', service: 'mes-service' };
  }

  @Get('ready')
  async readiness() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ready', service: 'mes-service', db: 'up' };
    } catch {
      return { status: 'degraded', service: 'mes-service', db: 'down' };
    }
  }

  /** W47 — public ETO readiness (work order count for traceability spine) */
  @Get('eto')
  async etoReadiness() {
    try {
      const workOrderCount = await this.prisma.workOrder.count();
      return {
        ready: true,
        service: 'mes-service',
        workOrderCount,
        td004: workOrderCount > 0 ? 'yellow-minimum' : 'partial',
      };
    } catch {
      return { ready: false, service: 'mes-service', workOrderCount: 0, td004: 'down' };
    }
  }
}
