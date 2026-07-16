import { Controller, Get } from '@nestjs/common';
import { PrismaClient } from '.prisma/client-eam';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaClient) {}

  @Get()
  liveness() {
    return { status: 'ok', service: 'eam-service' };
  }

  @Get('ready')
  async readiness() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ready', service: 'eam-service', db: 'up' };
    } catch {
      return { status: 'degraded', service: 'eam-service', db: 'down' };
    }
  }
}
